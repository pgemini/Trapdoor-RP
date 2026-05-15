from __future__ import annotations

from abc import ABC, abstractmethod

from ..schemas import ExtractedContent, Finding


class Detector(ABC):
    name: str = "detector"

    @abstractmethod
    def detect(self, content: ExtractedContent) -> list[Finding]: ...
