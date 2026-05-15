from __future__ import annotations

import unicodedata

from ..schemas import ExtractedContent, Finding
from .base import Detector


# Zero-width / invisible code points commonly abused for hidden payloads.
ZERO_WIDTH = {
    "​": "ZWSP",
    "‌": "ZWNJ",
    "‍": "ZWJ",
    "⁠": "WJ",
    "﻿": "BOM",
    "᠎": "MVS",
}

# Latin-script blocks that are most often mixed in confusable attacks.
SUSPECT_NON_LATIN_BLOCKS = {"CYRILLIC", "GREEK", "ARMENIAN"}


def _block_name(ch: str) -> str:
    try:
        return unicodedata.name(ch).split(" ")[0]
    except ValueError:
        return ""


class UnicodeDetector(Detector):
    name = "unicode"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            text = frag.text
            if not text:
                continue

            zw_counts: dict[str, int] = {}
            for ch in text:
                if ch in ZERO_WIDTH:
                    zw_counts[ZERO_WIDTH[ch]] = zw_counts.get(ZERO_WIDTH[ch], 0) + 1
            total_zw = sum(zw_counts.values())
            if total_zw > 0:
                density = total_zw / max(1, len(text)) * 100
                severity = "high" if density > 1.0 else "med"
                findings.append(Finding(
                    detector=self.name,
                    severity=severity,
                    category="zero-width-payload",
                    message=f"Zero-width characters detected ({total_zw} in {frag.source}).",
                    evidence=", ".join(f"{k}×{v}" for k, v in zw_counts.items()),
                    confidence=min(0.95, 0.6 + density / 5),
                    location=frag.source,
                    sanitize_action="strip",
                ))

            # Mixed-script / confusable detection on Latin-dominant strings.
            latin = sum(1 for ch in text if _block_name(ch) == "LATIN")
            suspects: dict[str, int] = {}
            for ch in text:
                blk = _block_name(ch)
                if blk in SUSPECT_NON_LATIN_BLOCKS:
                    suspects[blk] = suspects.get(blk, 0) + 1
            if latin > 20 and suspects:
                findings.append(Finding(
                    detector=self.name,
                    severity="med",
                    category="confusable-script",
                    message="Mixed-script characters in a Latin-dominant string.",
                    evidence=", ".join(f"{k}×{v}" for k, v in suspects.items()),
                    confidence=0.75,
                    location=frag.source,
                    sanitize_action="quote",
                ))
        return findings
