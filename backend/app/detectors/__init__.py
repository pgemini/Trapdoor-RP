from .base import Detector
from .bidi_detector import BidiDetector
from .encoding_detector import EncodingDetector
from .invisible_text import InvisibleTextDetector
from .llm_detector import LLMDetector
from .markup_injection import MarkupInjectionDetector
from .metadata_detector import MetadataDetector
from .pattern_detector import PatternDetector
from .steganography import SteganographyDetector
from .unicode_detector import UnicodeDetector
from .url_detector import URLDetector


def all_detectors() -> list[Detector]:
    return [
        PatternDetector(),
        UnicodeDetector(),
        InvisibleTextDetector(),
        MetadataDetector(),
        SteganographyDetector(),
        # Resilience layer — designed to catch attacks the LLM itself can't block:
        EncodingDetector(),
        BidiDetector(),
        URLDetector(),
        MarkupInjectionDetector(),
        # AI-Foundry runs last so it can see the full picture.
        LLMDetector(),
    ]


__all__ = ["Detector", "all_detectors"]
