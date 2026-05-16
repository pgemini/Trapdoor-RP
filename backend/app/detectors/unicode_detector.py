from __future__ import annotations

import unicodedata
from functools import lru_cache

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
    "­": "SHY",   # soft hyphen — increasingly used to chunk attack words
}

# Tag characters (U+E0000..U+E007F).  Some are completely invisible
# *and* tokenize as separate units in many models.  Used in published
# PoCs to embed an entire prompt invisibly between visible glyphs.
TAG_RANGE = range(0xE0000, 0xE0080)

# Mathematical alphanumeric symbols (U+1D400..U+1D7FF).  Look like
# bold/italic Latin to humans, tokenize differently for models — a
# common way to hide attack vocabulary in plain sight.
MATH_RANGE = range(0x1D400, 0x1D800)

# Latin-script blocks most often mixed in confusable attacks.
SUSPECT_NON_LATIN_BLOCKS = {
    "CYRILLIC", "GREEK", "ARMENIAN", "COPTIC", "HEBREW",
    "GEORGIAN",
}


@lru_cache(maxsize=4096)
def _block_name(ch: str) -> str:
    try:
        return unicodedata.name(ch).split(" ")[0]
    except ValueError:
        return ""


class UnicodeDetector(Detector):
    name = "unicode"

    # Minimum fragment length below which density-based detections are
    # suppressed — a single ZWSP in a 3-char filename isn't an attack.
    MIN_LEN = 5

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            text = frag.text
            if not text or len(text) < self.MIN_LEN:
                continue

            zw_counts: dict[str, int] = {}
            tag_count = 0
            math_count = 0
            latin = 0
            suspects: dict[str, int] = {}

            for ch in text:
                cp = ord(ch)
                if ch in ZERO_WIDTH:
                    zw_counts[ZERO_WIDTH[ch]] = zw_counts.get(ZERO_WIDTH[ch], 0) + 1
                    continue
                if cp in TAG_RANGE:
                    tag_count += 1
                    continue
                if cp in MATH_RANGE:
                    math_count += 1
                    continue
                if not ch.isalpha():
                    continue
                blk = _block_name(ch)
                if blk == "LATIN":
                    latin += 1
                elif blk in SUSPECT_NON_LATIN_BLOCKS:
                    suspects[blk] = suspects.get(blk, 0) + 1

            # --- Zero-width payload ---
            total_zw = sum(zw_counts.values())
            if total_zw > 0:
                density = total_zw / max(1, len(text)) * 100
                # require either multiple zero-widths OR a non-trivial density
                if total_zw >= 2 or density >= 0.2:
                    severity = "high" if density > 1.0 else "med"
                    findings.append(Finding(
                        detector=self.name,
                        severity=severity,
                        category="zero-width-payload",
                        message=(
                            f"Zero-width characters in {frag.source} "
                            f"({total_zw} chars, density {density:.2f}%)."
                        ),
                        evidence=", ".join(f"{k}×{v}" for k, v in sorted(zw_counts.items())),
                        confidence=min(0.95, 0.6 + density / 5),
                        location=frag.source,
                        sanitize_action="strip",
                    ))

            # --- Tag-character payload (invisible language tags) ---
            if tag_count > 0:
                findings.append(Finding(
                    detector=self.name,
                    severity="critical" if tag_count >= 3 else "high",
                    category="tag-character-payload",
                    message=(
                        f"Unicode tag characters (U+E0000..U+E007F) in {frag.source}: "
                        f"{tag_count} codepoints — invisible carrier glyphs."
                    ),
                    evidence=f"tag-chars×{tag_count}",
                    confidence=0.95,
                    location=frag.source,
                    sanitize_action="strip",
                ))

            # --- Math/styled alphanumeric disguise ---
            if math_count >= 4:
                findings.append(Finding(
                    detector=self.name,
                    severity="high",
                    category="styled-alphanumeric",
                    message=(
                        f"Mathematical / styled alphanumeric symbols in {frag.source}: "
                        f"{math_count} chars. These look like normal Latin but tokenize differently."
                    ),
                    evidence=f"math-chars×{math_count}",
                    confidence=0.82,
                    location=frag.source,
                    sanitize_action="strip",
                ))

            # --- Mixed-script / confusable in Latin-dominant strings ---
            if latin > 15 and suspects:
                total_suspect = sum(suspects.values())
                # Higher confidence when the proportion is small (single
                # rogue codepoint hiding in Latin) — this is the classic
                # homoglyph signature.
                ratio = total_suspect / max(1, latin + total_suspect)
                severity = "high" if 0 < ratio < 0.20 else "med"
                confidence = 0.85 if 0 < ratio < 0.10 else 0.72
                findings.append(Finding(
                    detector=self.name,
                    severity=severity,
                    category="confusable-script",
                    message=(
                        f"Mixed-script characters in a Latin-dominant string: "
                        f"{total_suspect} non-Latin in {latin + total_suspect} alpha chars."
                    ),
                    evidence=", ".join(f"{k}×{v}" for k, v in sorted(suspects.items())),
                    confidence=confidence,
                    location=frag.source,
                    sanitize_action="quote",
                ))
        return findings
