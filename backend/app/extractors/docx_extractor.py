from __future__ import annotations

import io

from docx import Document

from ..schemas import ExtractedContent, ExtractedFragment
from .base import Extractor


class DocxExtractor(Extractor):
    modality = "document/docx"

    def extract(self, data: bytes, filename: str) -> ExtractedContent:
        doc = Document(io.BytesIO(data))
        fragments: list[ExtractedFragment] = []

        for i, para in enumerate(doc.paragraphs):
            if para.text.strip():
                fragments.append(ExtractedFragment(
                    source=f"paragraph-{i+1}",
                    kind="text",
                    text=para.text.strip(),
                ))

        cp = doc.core_properties
        meta = {
            "author": cp.author,
            "title": cp.title,
            "subject": cp.subject,
            "keywords": cp.keywords,
            "comments": cp.comments,
            "category": cp.category,
            "last_modified_by": cp.last_modified_by,
        }
        for key, value in meta.items():
            if value:
                fragments.append(ExtractedFragment(
                    source=f"metadata.{key}",
                    kind="metadata",
                    text=str(value),
                ))

        return ExtractedContent(
            modality=self.modality,
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fragments=fragments,
            raw_metadata={k: str(v) for k, v in meta.items() if v},
        )
