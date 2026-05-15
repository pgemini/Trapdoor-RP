from __future__ import annotations

from abc import ABC, abstractmethod

from ..schemas import ExtractedContent


class Extractor(ABC):
    modality: str = "unknown"

    @abstractmethod
    def extract(self, data: bytes, filename: str) -> ExtractedContent: ...
