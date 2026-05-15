from .base import Detector
from .invisible_text import InvisibleTextDetector
from .llm_detector import LLMDetector
from .metadata_detector import MetadataDetector
from .pattern_detector import PatternDetector
from .steganography import SteganographyDetector
from .unicode_detector import UnicodeDetector


def all_detectors() -> list[Detector]:
    return [
        PatternDetector(),
        UnicodeDetector(),
        InvisibleTextDetector(),
        MetadataDetector(),
        SteganographyDetector(),
        LLMDetector(),
    ]


__all__ = ["Detector", "all_detectors"]
