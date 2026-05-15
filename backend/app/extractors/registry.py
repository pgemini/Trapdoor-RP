from __future__ import annotations

import os

from .audio_extractor import AudioExtractor
from .base import Extractor
from .docx_extractor import DocxExtractor
from .excel_extractor import ExcelExtractor
from .image_extractor import ImageExtractor
from .pdf_extractor import PDFExtractor
from .text_extractor import TextExtractor
from .video_extractor import VideoExtractor


_BY_EXT: dict[str, Extractor] = {
    # Documents
    ".pdf":  PDFExtractor(),
    ".docx": DocxExtractor(),
    # Spreadsheets
    ".xlsx": ExcelExtractor(),
    ".xlsm": ExcelExtractor(),
    # Images
    ".png":  ImageExtractor(),
    ".jpg":  ImageExtractor(),
    ".jpeg": ImageExtractor(),
    ".webp": ImageExtractor(),
    ".gif":  ImageExtractor(),
    ".bmp":  ImageExtractor(),
    ".tiff": ImageExtractor(),
    # Audio
    ".mp3":  AudioExtractor(),
    ".wav":  AudioExtractor(),
    ".flac": AudioExtractor(),
    ".ogg":  AudioExtractor(),
    ".oga":  AudioExtractor(),
    ".opus": AudioExtractor(),
    ".m4a":  AudioExtractor(),
    ".aac":  AudioExtractor(),
    # Video
    ".mp4":  VideoExtractor(),
    ".m4v":  VideoExtractor(),
    ".mov":  VideoExtractor(),
    ".webm": VideoExtractor(),
    ".mkv":  VideoExtractor(),
    ".avi":  VideoExtractor(),
    # Text-ish
    ".md":       TextExtractor("text/markdown"),
    ".markdown": TextExtractor("text/markdown"),
    ".txt":      TextExtractor("text/plain"),
    ".html":     TextExtractor("text/html"),
    ".htm":      TextExtractor("text/html"),
    ".json":     TextExtractor("application/json"),
    ".csv":      TextExtractor("text/csv"),
}


def pick_extractor(filename: str) -> Extractor:
    ext = os.path.splitext(filename.lower())[1]
    return _BY_EXT.get(ext, TextExtractor("application/octet-stream"))
