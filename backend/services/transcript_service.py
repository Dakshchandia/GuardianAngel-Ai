"""
Transcription service for GuardianAngel AI.

Priority order:
1. Groq Whisper API (FREE — no credit card, fast) — set GROQ_API_KEY
2. Local Whisper (openai-whisper package) — FREE, offline, heavy
3. OpenAI Whisper API (if OPENAI_API_KEY set)
4. Empty result (honest fallback)
"""

import os
import io
import logging
import tempfile
from pathlib import Path

logger = logging.getLogger("guardianangel.transcript")

# ── Add ffmpeg to PATH automatically (imageio-ffmpeg provides the binary) ──────
def _ensure_ffmpeg_in_path() -> None:
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = str(Path(ffmpeg_exe).parent)
        current_path = os.environ.get("PATH", "")
        if ffmpeg_dir not in current_path:
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + current_path
        os.environ["FFMPEG_BINARY"] = ffmpeg_exe
    except Exception as e:
        logger.warning("Could not auto-configure ffmpeg: %s", e)

_ensure_ffmpeg_in_path()


class TranscriptService:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self._local_whisper = None
        self._local_whisper_checked = False

        logger.info(
            "TranscriptService: groq=%s openai=%s",
            bool(self.groq_api_key),
            bool(self.openai_api_key),
        )
        # Try to load local Whisper at startup (only if installed)
        self._get_local_whisper()

    # ── Public interface ───────────────────────────────────────────────────────

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.webm") -> dict:
        if not audio_bytes or len(audio_bytes) < 500:
            logger.warning("Audio too short (%d bytes)", len(audio_bytes))
            return self._empty_result("audio_too_short")

        # 1. Groq (free, fast, no credit card)
        if self.groq_api_key:
            try:
                result = await self._transcribe_groq(audio_bytes, filename)
                if result:
                    return result
            except Exception as e:
                logger.error("Groq Whisper failed: %s", e)

        # 2. Local Whisper (free, offline, heavy — works locally)
        local = self._get_local_whisper()
        if local:
            try:
                result = self._transcribe_local(audio_bytes, filename, local)
                if result:
                    return result
            except Exception as e:
                logger.error("Local Whisper failed: %s", e)

        # 3. OpenAI API (paid)
        if self.openai_api_key:
            try:
                result = await self._transcribe_openai(audio_bytes, filename)
                if result:
                    return result
            except Exception as e:
                logger.error("OpenAI Whisper failed: %s", e)

        logger.warning("No transcription engine available")
        return self._empty_result("no_engine")

    # ── Groq Whisper API (FREE) ────────────────────────────────────────────────

    async def _transcribe_groq(self, audio_bytes: bytes, filename: str) -> dict | None:
        """
        Groq offers free Whisper transcription.
        Get free API key at: https://console.groq.com (no credit card needed)
        """
        try:
            from groq import AsyncGroq

            client = AsyncGroq(api_key=self.groq_api_key)
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = self._normalize_filename(filename)

            response = await client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=audio_file,
                response_format="verbose_json",
            )

            text = response.text or ""
            segments = []
            for seg in (getattr(response, "segments", None) or []):
                start = getattr(seg, "start", 0)
                segments.append({
                    "time": f"{int(start // 60)}:{int(start % 60):02d}",
                    "text": seg.text.strip(),
                    "start": start,
                    "end": getattr(seg, "end", start + 2),
                })

            if not segments and text:
                segments = [{"time": "0:00", "text": text.strip(), "start": 0, "end": 5}]

            logger.info("Groq Whisper: %d chars, %d segments", len(text), len(segments))
            print(f"[GuardianAngel] Groq transcript: {text[:100]!r}")

            return {
                "text": text,
                "language": getattr(response, "language", "en"),
                "duration": getattr(response, "duration", 0),
                "segments": segments,
                "method": "groq_whisper",
            }

        except ImportError:
            logger.warning("groq package not installed — run: pip install groq")
            return None
        except Exception as e:
            logger.error("Groq transcription error: %s", e)
            return None

    # ── OpenAI Whisper API ─────────────────────────────────────────────────────

    async def _transcribe_openai(self, audio_bytes: bytes, filename: str) -> dict | None:
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=self.openai_api_key)

            # Wrap bytes in a file-like object with a name
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = self._normalize_filename(filename)

            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

            segments = []
            raw_segments = getattr(response, "segments", None) or []
            for seg in raw_segments:
                start = getattr(seg, "start", 0)
                minutes = int(start // 60)
                seconds = int(start % 60)
                segments.append({
                    "time": f"{minutes}:{seconds:02d}",
                    "text": seg.text.strip(),
                    "start": start,
                    "end": getattr(seg, "end", start + 2),
                })

            # If no segments, create one from full text
            if not segments and response.text:
                segments = [{"time": "0:00", "text": response.text.strip(), "start": 0, "end": 5}]

            logger.info("OpenAI Whisper: transcribed %d chars, %d segments", len(response.text), len(segments))

            return {
                "text": response.text,
                "language": getattr(response, "language", "en"),
                "duration": getattr(response, "duration", 0),
                "segments": segments,
                "method": "openai_api",
            }

        except ImportError:
            logger.warning("openai package not installed")
            return None

    # ── Local Whisper ──────────────────────────────────────────────────────────

    def _get_local_whisper(self):
        """Lazy-load local whisper model (tiny for speed)."""
        if self._local_whisper_checked:
            return self._local_whisper

        self._local_whisper_checked = True
        try:
            import whisper
            import whisper.audio as _wa
            from subprocess import CalledProcessError, run
            import numpy as np

            # Get the real ffmpeg path
            ffmpeg_exe = os.environ.get("FFMPEG_BINARY", "ffmpeg")

            # Monkey-patch load_audio to use full ffmpeg path
            def _patched_load_audio(file: str, sr: int = _wa.SAMPLE_RATE):
                cmd = [
                    ffmpeg_exe, "-nostdin", "-threads", "0",
                    "-i", file, "-f", "s16le", "-ac", "1",
                    "-acodec", "pcm_s16le", "-ar", str(sr), "-"
                ]
                try:
                    out = run(cmd, capture_output=True, check=True).stdout
                except CalledProcessError as e:
                    raise RuntimeError(f"Failed to load audio: {e.stderr.decode()}") from e
                return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

            _wa.load_audio = _patched_load_audio
            logger.info("Patched whisper.audio.load_audio with ffmpeg: %s", ffmpeg_exe)

            logger.info("Loading local Whisper 'tiny' model...")
            self._local_whisper = whisper.load_model("tiny")
            logger.info("Local Whisper 'tiny' model loaded successfully")
        except ImportError:
            logger.info("openai-whisper not installed")
            self._local_whisper = None
        except Exception as e:
            logger.warning("Could not load local Whisper: %s", e)
            self._local_whisper = None

        return self._local_whisper

    # Known Whisper hallucination phrases produced on silence/noise
    _HALLUCINATION_PHRASES = [
        "thank you for watching",
        "thanks for watching",
        "please subscribe",
        "like and subscribe",
        "you",
        ".",
        "...",
        "[ silence ]",
        "[silence]",
        "[ music ]",
        "[music]",
        "[ blank_audio ]",
        "[blank_audio]",
    ]

    def _is_hallucination(self, text: str, audio_duration: float) -> bool:
        """
        Return True if Whisper's output looks like a hallucination.
        Heuristics:
        - Very short audio (< 1.5 s) with any text → likely hallucination
        - Text matches known hallucination phrases exactly
        - Text is suspiciously long relative to audio duration
          (> 25 words per second of audio is physically impossible)
        """
        stripped = text.strip().lower()
        if not stripped:
            return False  # empty is fine, not a hallucination

        if stripped in self._HALLUCINATION_PHRASES:
            logger.warning("Whisper hallucination detected (known phrase): %r", text)
            return True

        word_count = len(stripped.split())
        if audio_duration > 0 and word_count / audio_duration > 25:
            logger.warning(
                "Whisper hallucination detected (%.0f words in %.1fs audio): %r",
                word_count, audio_duration, text[:80],
            )
            return True

        return False

    def _transcribe_local(self, audio_bytes: bytes, filename: str, model) -> dict | None:
        """Transcribe using local whisper model via temp file."""
        suffix = Path(self._normalize_filename(filename)).suffix or ".webm"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            result = model.transcribe(
                tmp_path,
                fp16=False,
                verbose=False,
                # condition_on_previous_text=False reduces hallucinations on short clips
                condition_on_previous_text=False,
            )
            text = result.get("text", "").strip()

            # Estimate audio duration from segments or file size
            raw_segments = result.get("segments", [])
            audio_duration = raw_segments[-1].get("end", 0) if raw_segments else 0
            if audio_duration == 0:
                # Rough estimate: webm/opus ~16 kbps
                audio_duration = len(audio_bytes) / 2000

            if self._is_hallucination(text, audio_duration):
                logger.info("Discarding hallucinated transcript, returning empty result")
                return {
                    "text": "",
                    "language": result.get("language", "en"),
                    "duration": audio_duration,
                    "segments": [],
                    "method": "local_whisper_hallucination_discarded",
                }

            segments = []
            for seg in raw_segments:
                seg_text = seg.get("text", "").strip()
                if not seg_text:
                    continue
                start = seg.get("start", 0)
                minutes = int(start // 60)
                seconds = int(start % 60)
                segments.append({
                    "time": f"{minutes}:{seconds:02d}",
                    "text": seg_text,
                    "start": start,
                    "end": seg.get("end", start + 2),
                })

            if not segments and text:
                segments = [{"time": "0:00", "text": text, "start": 0, "end": 5}]

            logger.info(
                "Local Whisper: transcribed %d chars, %d segments",
                len(text), len(segments),
            )
            print(f"[GuardianAngel] Audio received, starting transcription...")
            print(f"[GuardianAngel] Transcript: {text!r}")

            return {
                "text": text,
                "language": result.get("language", "en"),
                "duration": segments[-1]["end"] if segments else audio_duration,
                "segments": segments,
                "method": "local_whisper",
            }
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    # ── Empty fallback (no Whisper available) ─────────────────────────────────

    def _empty_result(self, reason: str = "") -> dict:
        """Returns empty transcription when no engine is available."""
        logger.warning("Transcription unavailable (%s). Set OPENAI_API_KEY or install openai-whisper.", reason)
        return {
            "text": "",
            "language": "en",
            "duration": 0,
            "segments": [],
            "method": f"unavailable — {reason}",
        }

    def _mock_transcription(self, filename: str = "", method_note: str = "") -> dict:
        return self._empty_result(method_note or "no_engine")

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _normalize_filename(filename: str) -> str:
        """Ensure filename has a valid audio extension."""
        name = filename or "audio.webm"
        ext = Path(name).suffix.lower()
        if ext not in {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".mp4"}:
            name = "audio.webm"
        return name
