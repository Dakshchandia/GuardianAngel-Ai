"""Audio preprocessing utilities."""

import io
import logging
from typing import Optional

logger = logging.getLogger("guardianangel.audio_utils")

SUPPORTED_FORMATS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"}
MAX_FILE_SIZE_MB = 50


def validate_audio_file(filename: str, file_size: int) -> tuple[bool, str]:
    """Validate audio file format and size."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    if ext not in SUPPORTED_FORMATS:
        return False, f"Unsupported format '{ext}'. Supported: {', '.join(SUPPORTED_FORMATS)}"
    
    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        return False, f"File too large. Maximum size: {MAX_FILE_SIZE_MB}MB"
    
    return True, "OK"


def validate_image_file(filename: str, file_size: int) -> tuple[bool, str]:
    """Validate image file for video frame analysis."""
    supported = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    if ext not in supported:
        return False, f"Unsupported format '{ext}'. Supported: {', '.join(supported)}"
    
    if file_size > 20 * 1024 * 1024:  # 20MB for images
        return False, "Image too large. Maximum size: 20MB"
    
    return True, "OK"


def get_audio_duration_estimate(file_size: int, format_ext: str) -> float:
    """Estimate audio duration from file size (rough approximation)."""
    # Approximate bitrates in bytes/second
    bitrate_map = {
        ".mp3": 16000,   # 128kbps
        ".wav": 176400,  # 44.1kHz 16-bit stereo
        ".m4a": 16000,
        ".ogg": 12000,
        ".flac": 88200,
        ".webm": 12000,
    }
    bitrate = bitrate_map.get(format_ext, 16000)
    return round(file_size / bitrate, 1)


def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to E.164 format."""
    # Remove spaces, dashes, parentheses
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    
    # Add India country code if missing
    if cleaned.startswith("0"):
        cleaned = "+91" + cleaned[1:]
    elif not cleaned.startswith("+"):
        if len(cleaned) == 10:
            cleaned = "+91" + cleaned
    
    return cleaned
