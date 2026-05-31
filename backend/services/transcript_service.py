"""
Transcription service for GuardianAngel AI.

Priority:
  1. OpenAI Whisper API (whisper-1) — cloud, accurate, fast
  2. Local Whisper (tiny model) — offline, free, slightly slower
  NO mock/demo fallback — real audio only.
"""

import io
import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger("guardianangel.transcript")


# ── Ensure ffmpeg is on PATH (imageio-ffmpeg provides the binary) ─────────────
def _ensure_ffmpeg_in_path() -> None:
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = str(Path(ffmpeg_exe).parent)
        current_path = os.environ.get("PATH", "")
        if ffmpeg_dir not in current_path:
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + current_path
        os.environ["FFMPEG_BINARY"] = ffmpeg_exe
        logger.info("ffmpeg configured: %s", ffmpeg_exe)
    except Exception as e:
        logger.warning("Could not auto-configure ffmpeg: %s", e)


_ensure_ffmpeg_in_path()


class TranscriptService:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self._local_whisper = None
        self._local_whisper_checked = False
        self._openai_available: bool | None = None

        # Only pre-load local Whisper if openai-whisper is installed AND
        # we're not in a memory-constrained environment (Render free = 512MB).
        # On cloud deployments, OpenAI API handles STT — no local model needed.
        if os.getenv("LOAD_LOCAL_WHISPER", "false").lower() == "true":
            logger.info("TranscriptService: pre-loading local Whisper model (LOAD_LOCAL_WHISPER=true)...")
            self._get_local_whisper()
        else:
            logger.info("TranscriptService: local Whisper lazy-load mode (set LOAD_LOCAL_WHISPER=true to pre-load)")

    # ── Public ────────────────────────────────────────────────────────────────

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.webm") -> dict:
        """
        Transcribe audio bytes to text.
        Returns structured dict with text, segments, language, method.
        Raises RuntimeError if transcription completely fails.
        """
        if not audio_bytes or len(audio_bytes) < 500:
            raise RuntimeError(f"Audio too short ({len(audio_bytes)} bytes). Please record at least 2 seconds.")

        # 1. OpenAI Whisper API (fast, accurate)
        if self.openai_key and self._openai_available is not False:
            try:
                result = await self._transcribe_openai(audio_bytes, filename)
                if result:
                    return result
            except Exception as e:
                logger.warning("OpenAI Whisper failed: %s — trying local", e)

        # 2. Local Whisper (offline fallback)
        local = self._get_local_whisper()
        if local:
            try:
                result = self._transcribe_local(audio_bytes, filename, local)
                if result:
                    return result
            except Exception as e:
                logger.error("Local Whisper failed: %s", e)

        raise RuntimeError(
            "Transcription failed. Neither OpenAI Whisper API nor local Whisper could process the audio. "
            "Check your OPENAI_API_KEY or ensure openai-whisper is installed."
        )

    # ── OpenAI Whisper API ────────────────────────────────────────────────────

    async def _transcribe_openai(self, audio_bytes: bytes, filename: str) -> dict | None:
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=self.openai_key)

            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = self._normalize_filename(filename)

            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

            text = response.text or ""
            raw_segments = getattr(response, "segments", None) or []
            segments = []
            for seg in raw_segments:
                start = getattr(seg, "start", 0)
                m, s = int(start // 60), int(start % 60)
                segments.append({
                    "time": f"{m}:{s:02d}",
                    "text": seg.text.strip(),
                    "start": start,
                    "end": getattr(seg, "end", start + 2),
                })

            if not segments and text:
                segments = [{"time": "0:00", "text": text.strip(), "start": 0.0, "end": 5.0}]

            self._openai_available = True
            logger.info("OpenAI Whisper: %d chars, %d segments, lang=%s",
                        len(text), len(segments), getattr(response, "language", "?"))

            return {
                "text": text,
                "language": getattr(response, "language", "en"),
                "duration": getattr(response, "duration", 0) or (segments[-1]["end"] if segments else 0),
                "segments": segments,
                "method": "openai_whisper_api",
            }

        except ImportError:
            logger.warning("openai package not installed")
            return None
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "insufficient" in err_str:
                logger.warning("OpenAI quota exceeded — switching to local Whisper")
                self._openai_available = False
            elif "401" in err_str or "invalid" in err_str:
                logger.warning("OpenAI key invalid — switching to local Whisper")
                self._openai_available = False
            else:
                logger.warning("OpenAI Whisper error: %s", e)
            return None

    # ── Local Whisper ─────────────────────────────────────────────────────────

    def _get_local_whisper(self):
        if self._local_whisper_checked:
            return self._local_whisper
        self._local_whisper_checked = True
        try:
            import whisper
            import whisper.audio as _wa
            from subprocess import CalledProcessError, run
            import numpy as np

            ffmpeg_exe = os.environ.get("FFMPEG_BINARY", "ffmpeg")

            def _patched_load_audio(file: str, sr: int = _wa.SAMPLE_RATE):
                cmd = [
                    ffmpeg_exe, "-nostdin", "-threads", "0",
                    "-i", file, "-f", "s16le", "-ac", "1",
                    "-acodec", "pcm_s16le", "-ar", str(sr), "-"
                ]
                try:
                    out = run(cmd, capture_output=True, check=True).stdout
                except CalledProcessError as e:
                    raise RuntimeError(f"ffmpeg failed: {e.stderr.decode()}") from e
                return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

            _wa.load_audio = _patched_load_audio
            logger.info("Loading local Whisper 'tiny' model...")
            self._local_whisper = whisper.load_model("tiny")
            logger.info("Local Whisper 'tiny' loaded successfully")
        except ImportError:
            logger.info("openai-whisper not installed")
            self._local_whisper = None
        except Exception as e:
            logger.warning("Could not load local Whisper: %s", e)
            self._local_whisper = None
        return self._local_whisper

    def _transcribe_local(self, audio_bytes: bytes, filename: str, model) -> dict | None:
        suffix = Path(self._normalize_filename(filename)).suffix or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            result = model.transcribe(tmp_path, fp16=False, verbose=False)
            text = result.get("text", "").strip()
            segments = []
            for seg in result.get("segments", []):
                start = seg.get("start", 0)
                m, s = int(start // 60), int(start % 60)
                segments.append({
                    "time": f"{m}:{s:02d}",
                    "text": seg.get("text", "").strip(),
                    "start": start,
                    "end": seg.get("end", start + 2),
                })
            if not segments and text:
                segments = [{"time": "0:00", "text": text, "start": 0.0, "end": 5.0}]

            logger.info("Local Whisper: %d chars, %d segments", len(text), len(segments))
            return {
                "text": text,
                "language": result.get("language", "en"),
                "duration": segments[-1]["end"] if segments else 0,
                "segments": segments,
                "method": "local_whisper",
            }
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _normalize_filename(filename: str) -> str:
        name = filename or "audio.webm"
        ext = Path(name).suffix.lower()
        if ext not in {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".mp4"}:
            name = "audio.webm"
        return name
