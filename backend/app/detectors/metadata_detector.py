from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding
from .base import Detector


_INSTRUCTION_HINT = re.compile(
    r"\b(assistant|system|ignore|disregard|treat\s+as|drop\s+(your\s+)?guardrails?|jailbreak|new\s+instructions?)\b",
    flags=re.IGNORECASE,
)


class MetadataDetector(Detector):
    """Heuristic: metadata fields rarely contain instruction-shaped text."""

    name = "metadata"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            if frag.kind != "metadata":
                continue
            if _INSTRUCTION_HINT.search(frag.text):
                findings.append(Finding(
                    detector=self.name,
                    severity="high",
                    category="metadata-injection",
                    message=f"Instruction-shaped text in metadata field '{frag.source}'.",
                    evidence=frag.text[:160],
                    confidence=0.85,
                    location=frag.source,
                    sanitize_action="strip",
                ))
        return findings
