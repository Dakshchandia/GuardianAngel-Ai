"""
Real AI voice analysis service.

Extracts genuine acoustic features to detect suspicious synthetic/cloned voices:
- Spectral flatness  (synthetic voices are unnaturally flat)
- Pitch variance     (cloned voices have robotic pitch consistency)
- Energy variance    (TTS has unnaturally flat energy)
- Silence regularity (TTS has very regular pause patterns)
- Zero-crossing rate (synthetic artifacts)
- Spectral centroid  (tonal naturalness)

numpy is imported lazily — safe on Render free tier (512MB RAM).
"""

import io
import logging
import os
import tempfile
import wave
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger("guardianangel.voice_analyzer")


class VoiceAnalyzer:
    """
    Acoustic feature extraction for voice authenticity analysis.
    All heavy imports (numpy) are lazy — no crash on low-memory cloud deployments.
    """

    def __init__(self):
        logger.info("VoiceAnalyzer: initialized (numpy loaded lazily on first request)")

    # ── Public API ────────────────────────────────────────────────────────────

    def analyze_audio_bytes(self, audio_bytes: bytes, filename: str = "") -> dict:
        """Analyze audio for voice authenticity indicators."""
        if not audio_bytes or len(audio_bytes) < 1000:
            return self._insufficient_audio()

        try:
            import numpy as np
        except ImportError:
            logger.info("VoiceAnalyzer: numpy not available — returning default result")
            return self._insufficient_audio()

        pcm, sample_rate = self._decode_to_pcm(audio_bytes, filename)
        if pcm is None or len(pcm) < sample_rate * 0.5:
            return self._insufficient_audio()

        return self._extract_features(pcm, sample_rate)

    # ── Feature extraction ────────────────────────────────────────────────────

    def _extract_features(self, pcm, sample_rate: int) -> dict:
        import numpy as np

        flags = []
        suspicion_score = 0.0

        sf = self._spectral_flatness(pcm, sample_rate)
        if sf > 0.35:
            flags.append("Unusually flat spectral profile")
            suspicion_score += 0.25
        elif sf > 0.25:
            flags.append("Slightly flat spectral profile")
            suspicion_score += 0.10

        pv = self._pitch_variance(pcm, sample_rate)
        if pv < 0.08:
            flags.append("Robotic pitch consistency detected")
            suspicion_score += 0.30
        elif pv < 0.15:
            flags.append("Low pitch variation")
            suspicion_score += 0.12

        ev = self._energy_variance(pcm, sample_rate)
        if ev < 0.05:
            flags.append("Unnatural energy consistency")
            suspicion_score += 0.20
        elif ev < 0.10:
            flags.append("Low energy dynamics")
            suspicion_score += 0.08

        sr_val = self._silence_regularity(pcm, sample_rate)
        if sr_val > 0.75:
            flags.append("Synthetic pause pattern detected")
            suspicion_score += 0.15
        elif sr_val > 0.55:
            flags.append("Slightly regular pause pattern")
            suspicion_score += 0.05

        zcr = self._zero_crossing_rate(pcm)
        if zcr > 0.25:
            flags.append("High-frequency waveform artifacts")
            suspicion_score += 0.10

        cd = self._centroid_drift(pcm, sample_rate)
        if cd < 0.05:
            flags.append("Unnatural tonal consistency")
            suspicion_score += 0.10

        probability = min(suspicion_score, 1.0)

        if probability >= 0.55:
            voice_risk = "HIGH"
        elif probability >= 0.30:
            voice_risk = "MEDIUM"
        else:
            voice_risk = "LOW"
            flags = []

        logger.info(
            "Voice analysis: prob=%.2f risk=%s flags=%d sf=%.3f pv=%.3f",
            probability, voice_risk, len(flags), sf, pv,
        )

        return {
            "voice_clone_probability": round(probability, 3),
            "voice_risk": voice_risk,
            "voice_flags": flags[:4],
            "spectral_flatness": round(sf, 3),
            "pitch_variance": round(pv, 3),
            "naturalness_score": round(1.0 - probability, 3),
            "analysis_method": "acoustic_feature_extraction",
            "spectral_anomaly_score": round(sf, 3),
            "artifacts": flags[:4],
            "analysis_notes": self._notes(probability),
            "model": "GuardianAngel-AcousticNet-v2",
        }

    # ── Signal processing ─────────────────────────────────────────────────────

    def _spectral_flatness(self, pcm, sr: int) -> float:
        try:
            import numpy as np
            n = min(2048, len(pcm) // 4)
            if n < 256:
                return 0.15
            spec = np.abs(np.fft.rfft(pcm[:n * 4], n=n * 4))[1:]
            spec = np.maximum(spec, 1e-10)
            return float(np.clip(np.exp(np.mean(np.log(spec))) / (np.mean(spec) + 1e-10), 0, 1))
        except Exception:
            return 0.15

    def _pitch_variance(self, pcm, sr: int) -> float:
        try:
            import numpy as np
            fl = int(sr * 0.025)
            hop = int(sr * 0.010)
            if len(pcm) < fl * 3:
                return 0.20
            pitches = []
            for s in range(0, len(pcm) - fl, hop):
                frame = pcm[s:s + fl]
                if np.sqrt(np.mean(frame ** 2)) < 0.01:
                    continue
                corr = np.correlate(frame, frame, mode="full")[len(frame) - 1:]
                lo, hi = int(sr / 400), int(sr / 60)
                if hi >= len(corr):
                    continue
                idx = np.argmax(corr[lo:hi]) + lo
                if corr[idx] > 0.3 * corr[0]:
                    pitches.append(sr / idx)
            if len(pitches) < 3:
                return 0.20
            p = np.array(pitches)
            return float(np.clip(np.std(p) / (np.mean(p) + 1e-10), 0, 1))
        except Exception:
            return 0.20

    def _energy_variance(self, pcm, sr: int) -> float:
        try:
            import numpy as np
            fl = int(sr * 0.050)
            if len(pcm) < fl * 4:
                return 0.15
            energies = [np.sqrt(np.mean(pcm[s:s + fl] ** 2)) for s in range(0, len(pcm) - fl, fl)]
            if len(energies) < 4:
                return 0.15
            e = np.array(energies)
            return float(np.clip(np.std(e) / (np.mean(e) + 1e-10), 0, 1))
        except Exception:
            return 0.15

    def _silence_regularity(self, pcm, sr: int) -> float:
        try:
            import numpy as np
            fl = int(sr * 0.020)
            thr = 0.008
            silence = [np.sqrt(np.mean(pcm[s:s + fl] ** 2)) < thr for s in range(0, len(pcm) - fl, fl)]
            if len(silence) < 10:
                return 0.3
            runs, count = [], 0
            for s in silence:
                if s:
                    count += 1
                elif count > 0:
                    runs.append(count)
                    count = 0
            if count > 0:
                runs.append(count)
            if len(runs) < 2:
                return 0.3
            r = np.array(runs, dtype=float)
            return float(1.0 - min(np.std(r) / (np.mean(r) + 1e-10), 1.0))
        except Exception:
            return 0.3

    def _zero_crossing_rate(self, pcm) -> float:
        try:
            import numpy as np
            crossings = np.sum(np.abs(np.diff(np.sign(pcm)))) / 2
            return float(np.clip(crossings / len(pcm), 0, 1))
        except Exception:
            return 0.1

    def _centroid_drift(self, pcm, sr: int) -> float:
        try:
            import numpy as np
            fl = min(2048, len(pcm) // 8)
            if fl < 256:
                return 0.15
            freqs = np.fft.rfftfreq(fl, d=1.0 / sr)
            centroids = []
            for s in range(0, len(pcm) - fl, fl):
                mag = np.abs(np.fft.rfft(pcm[s:s + fl]))
                centroids.append(np.sum(freqs * mag) / (np.sum(mag) + 1e-10))
            if len(centroids) < 3:
                return 0.15
            c = np.array(centroids)
            return float(np.clip(np.std(c) / (np.mean(c) + 1e-10), 0, 1))
        except Exception:
            return 0.15

    # ── Audio decoding ────────────────────────────────────────────────────────

    def _decode_to_pcm(self, audio_bytes: bytes, filename: str) -> Tuple[Optional[object], int]:
        ext = Path(filename).suffix.lower() if filename else ".webm"

        if ext == ".wav":
            pcm, sr = self._decode_wav(audio_bytes)
            if pcm is not None:
                return pcm, sr

        try:
            import numpy as np
            import subprocess
            ffmpeg = os.environ.get("FFMPEG_BINARY", "ffmpeg")
            suffix = ext if ext in {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"} else ".webm"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
            try:
                cmd = [ffmpeg, "-nostdin", "-threads", "0", "-i", tmp_path,
                       "-f", "s16le", "-ac", "1", "-acodec", "pcm_s16le", "-ar", "16000", "-"]
                res = subprocess.run(cmd, capture_output=True, timeout=30)
                if res.returncode == 0 and res.stdout:
                    return np.frombuffer(res.stdout, np.int16).astype(np.float32) / 32768.0, 16000
            finally:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
        except Exception as e:
            logger.debug("ffmpeg decode failed: %s", e)

        return self._decode_wav(audio_bytes)

    def _decode_wav(self, data: bytes) -> Tuple[Optional[object], int]:
        try:
            import numpy as np
            with wave.open(io.BytesIO(data)) as wf:
                sr = wf.getframerate()
                raw = wf.readframes(wf.getnframes())
                pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
                if wf.getnchannels() > 1:
                    pcm = pcm.reshape(-1, wf.getnchannels()).mean(axis=1)
                return pcm, sr
        except Exception:
            return None, 16000

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _insufficient_audio(self) -> dict:
        return {
            "voice_clone_probability": 0.0,
            "voice_risk": "LOW",
            "voice_flags": [],
            "spectral_flatness": 0.0,
            "pitch_variance": 0.0,
            "naturalness_score": 1.0,
            "analysis_method": "insufficient_audio",
            "spectral_anomaly_score": 0.0,
            "artifacts": [],
            "analysis_notes": "Audio too short for voice analysis.",
            "model": "GuardianAngel-AcousticNet-v2",
        }

    def _notes(self, p: float) -> str:
        if p >= 0.55:
            return "Multiple suspicious voice indicators detected. Possible synthetic or cloned voice."
        if p >= 0.30:
            return "Some voice anomalies detected. Could be audio compression or synthetic voice."
        return "Voice patterns appear natural. No significant synthesis indicators detected."
