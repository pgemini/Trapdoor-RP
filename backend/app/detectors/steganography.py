from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding
from .base import Detector


_INTENT = re.compile(
    r"\b(exfiltrate|leak|forward|send|email|http[s]?://|api\s*[_-]?key|password|secret|token|user\s*\.\s*\w+)\b",
    flags=re.IGNORECASE,
)


class SteganographyDetector(Detector):
    name = "steganography"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            if frag.kind != "decoded":
                continue
            entropy = frag.attrs.get("entropy")
            severity = "high" if _INTENT.search(frag.text) else "low"
            confidence = 0.86 if severity == "high" else 0.55
            findings.append(Finding(
                detector=self.name,
                severity=severity,
                category="lsb-steganography",
                message=f"Decoded ASCII text from {frag.source} (LSB entropy={entropy}).",
                evidence=frag.text[:160],
                confidence=confidence,
                location=frag.source,
                sanitize_action="discard" if severity == "high" else "quote",
            ))
        return findings
