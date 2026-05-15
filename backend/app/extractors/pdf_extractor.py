from __future__ import annotations

import io

import pdfplumber

from ..schemas import ExtractedContent, ExtractedFragment
from .base import Extractor


def _color_tuple(c) -> tuple[float, float, float] | None:
    """pdfplumber returns char colors in varied shapes; normalize to RGB 0..1."""
    if c is None:
        return None
    if isinstance(c, (int, float)):
        v = float(c)
        return (v, v, v)
    if isinstance(c, (list, tuple)):
        vals = [float(x) for x in c]
        if len(vals) == 1:
            return (vals[0], vals[0], vals[0])
        if len(vals) == 3:
            return (vals[0], vals[1], vals[2])
        if len(vals) == 4:  # CMYK -> approximate RGB
            ci, m, y, k = vals
            r = (1 - ci) * (1 - k)
            g = (1 - m) * (1 - k)
            b = (1 - y) * (1 - k)
            return (r, g, b)
    return None


def _is_near_white(rgb: tuple[float, float, float] | None) -> bool:
    if rgb is None:
        return False
    return all(v >= 0.95 for v in rgb)


class PDFExtractor(Extractor):
    modality = "document/pdf"

    def extract(self, data: bytes, filename: str) -> ExtractedContent:
        fragments: list[ExtractedFragment] = []
        metadata: dict = {}
        notes: list[str] = []

        with pdfplumber.open(io.BytesIO(data)) as pdf:
            metadata = {k: str(v) for k, v in (pdf.metadata or {}).items()}

            for page_idx, page in enumerate(pdf.pages):
                page_no = page_idx + 1
                visible_chars: list[str] = []
                hidden_chars: list[str] = []

                for ch in page.chars:
                    rgb = _color_tuple(ch.get("non_stroking_color"))
                    text = ch.get("text", "")
                    if _is_near_white(rgb):
                        hidden_chars.append(text)
                    else:
                        visible_chars.append(text)

                visible_text = "".join(visible_chars).strip()
                hidden_text = "".join(hidden_chars).strip()

                if visible_text:
                    fragments.append(ExtractedFragment(
                        source=f"page-{page_no}",
                        kind="text",
                        text=visible_text,
                        attrs={"visibility": "visible"},
                    ))
                if hidden_text:
                    fragments.append(ExtractedFragment(
                        source=f"page-{page_no}",
                        kind="text",
                        text=hidden_text,
                        attrs={"visibility": "invisible", "reason": "near_white_text"},
                    ))
                    notes.append(f"Invisible (near-white) text found on page {page_no}.")

        for key, value in metadata.items():
            if value:
                fragments.append(ExtractedFragment(
                    source=f"metadata.{key}",
                    kind="metadata",
                    text=value,
                ))

        return ExtractedContent(
            modality=self.modality,
            mime="application/pdf",
            fragments=fragments,
            raw_metadata=metadata,
            notes=notes,
        )
