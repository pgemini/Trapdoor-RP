from __future__ import annotations

from ..schemas import ExtractedContent, Finding
from .base import Detector


class InvisibleTextDetector(Detector):
    """Flag fragments tagged invisible by extractors (e.g. white-on-white PDF text)."""

    name = "invisible-text"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            if frag.attrs.get("visibility") != "invisible":
                continue
            preview = frag.text.strip().replace("\n", " ")
            if not preview:
                continue
            preview = preview[:160] + ("…" if len(preview) > 160 else "")
            findings.append(Finding(
                detector=self.name,
                severity="high",
                category="invisible-text",
                message=f"Hidden text detected in {frag.source} ({frag.attrs.get('reason','invisible')}).",
                evidence=preview,
                confidence=0.9,
                location=frag.source,
                sanitize_action="strip",
            ))
        return findings
