from __future__ import annotations

import re

from ..schemas import ExtractedContent, ExtractedFragment
from .base import Extractor

HTML_COMMENT_RE = re.compile(r"<!--(.*?)-->", re.DOTALL)


class TextExtractor(Extractor):
    modality = "text"

    def __init__(self, mime: str = "text/plain"):
        self._mime = mime

    def extract(self, data: bytes, filename: str) -> ExtractedContent:
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = data.decode("latin-1", errors="replace")

        fragments: list[ExtractedFragment] = [
            ExtractedFragment(source="body", kind="text", text=text)
        ]

        for m in HTML_COMMENT_RE.finditer(text):
            inner = m.group(1).strip()
            if inner:
                fragments.append(ExtractedFragment(
                    source="html-comment",
                    kind="comment",
                    text=inner,
                ))

        return ExtractedContent(
            modality=self.modality,
            mime=self._mime,
            fragments=fragments,
        )
