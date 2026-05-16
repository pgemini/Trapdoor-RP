"""Bidirectional / control-character detector.

Catches a class of attacks the LLM literally cannot see, because they
work at the *display* or *parser* layer:

  * Trojan Source (CVE-2021-42574) — RLO/LRO/PDF/etc. flip the on-screen
    order of characters so a human reviewer sees one instruction and the
    LLM (or downstream parser) sees another.
  * Line / paragraph separator (U+2028 / U+2029) can split a single
    logical instruction across what looks like one line of source.
  * Interlinear annotation marks (U+FFF9..FFFB) can hide entire
    sub-strings between visible glyphs.

We also dampen the signal when the fragment is *legitimately* mostly
RTL-script (Arabic, Hebrew, Persian, etc.) — there, BIDI controls are
sometimes used by the layout engine. Mixed Latin+RTL is the dangerous
case.
"""
from __future__ import annotations

import unicodedata

from ..schemas import ExtractedContent, Finding
from .base import Detector


BIDI_OVERRIDES = {
    "‪": "LRE",   # LEFT-TO-RIGHT EMBEDDING
    "‫": "RLE",   # RIGHT-TO-LEFT EMBEDDING
    "‬": "PDF",   # POP DIRECTIONAL FORMATTING
    "‭": "LRO",   # LEFT-TO-RIGHT OVERRIDE
    "‮": "RLO",   # RIGHT-TO-LEFT OVERRIDE — canonical Trojan-Source
    "⁦": "LRI",   # LEFT-TO-RIGHT ISOLATE
    "⁧": "RLI",   # RIGHT-TO-LEFT ISOLATE
    "⁨": "FSI",   # FIRST STRONG ISOLATE
    "⁩": "PDI",   # POP DIRECTIONAL ISOLATE
}
LINE_SEPS = {
    " ": "LS",    # LINE SEPARATOR
    " ": "PS",    # PARAGRAPH SEPARATOR
    "": "NEL",   # NEXT LINE
}
ANNOTATIONS = {
    "￹": "IAA",   # INTERLINEAR ANNOTATION ANCHOR
    "￺": "IAS",   # INTERLINEAR ANNOTATION SEPARATOR
    "￻": "IAT",   # INTERLINEAR ANNOTATION TERMINATOR
}

RTL_SCRIPTS = {"ARABIC", "HEBREW", "SYRIAC", "THAANA", "NKO", "MANDAIC"}


def _is_rtl_context(text: str) -> bool:
    """True when the fragment is dominated by RTL-script characters."""
    rtl = 0
    latin = 0
    for ch in text:
        if not ch.isalpha():
            continue
        try:
            blk = unicodedata.name(ch).split(" ")[0]
        except ValueError:
            continue
        if blk in RTL_SCRIPTS:
            rtl += 1
        elif blk == "LATIN":
            latin += 1
    return rtl > 0 and rtl > latin * 2


class BidiDetector(Detector):
    name = "bidi"

    MIN_LEN = 4  # don't fire on 1-char strings

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            text = frag.text or ""
            if len(text) < self.MIN_LEN:
                continue

            bidi_hits: dict[str, int] = {}
            line_hits: dict[str, int] = {}
            anno_hits: dict[str, int] = {}
            for ch in text:
                if ch in BIDI_OVERRIDES:
                    n = BIDI_OVERRIDES[ch]
                    bidi_hits[n] = bidi_hits.get(n, 0) + 1
                elif ch in LINE_SEPS:
                    n = LINE_SEPS[ch]
                    line_hits[n] = line_hits.get(n, 0) + 1
                elif ch in ANNOTATIONS:
                    n = ANNOTATIONS[ch]
                    anno_hits[n] = anno_hits.get(n, 0) + 1

            rtl_context = _is_rtl_context(text)

            if bidi_hits:
                has_override = bool(bidi_hits.get("RLO") or bidi_hits.get("LRO"))
                # In a clearly-RTL document, plain embedding/isolate
                # controls (LRE/RLE/LRI/RLI/PDF/PDI) are sometimes
                # benign. RLO/LRO override flips text and is almost
                # never legitimate in business content.
                if rtl_context and not has_override:
                    severity = "low"
                    confidence = 0.45
                else:
                    severity = "critical" if has_override else "high"
                    confidence = 0.92 if has_override else 0.80
                findings.append(Finding(
                    detector=self.name,
                    severity=severity,
                    category="bidi-override",
                    message=(
                        f"Bidirectional control characters in {frag.source} — "
                        f"can re-order what's displayed vs. what the model sees."
                    ),
                    evidence=", ".join(f"{k}×{v}" for k, v in sorted(bidi_hits.items())),
                    confidence=confidence,
                    location=frag.source,
                    sanitize_action="strip",
                ))

            if anno_hits:
                findings.append(Finding(
                    detector=self.name,
                    severity="high",
                    category="annotation-payload",
                    message=(
                        f"Unicode interlinear annotation marks in {frag.source} — "
                        f"can hide content between visible characters."
                    ),
                    evidence=", ".join(f"{k}×{v}" for k, v in sorted(anno_hits.items())),
                    confidence=0.85,
                    location=frag.source,
                    sanitize_action="strip",
                ))

            if line_hits:
                # Single LS/PS in JSON-like content is sometimes a JSON
                # escape artifact.  Require either ≥2 occurrences, OR
                # any U+2028 inside an obviously short field.
                total_sep = sum(line_hits.values())
                if total_sep >= 2 or len(text) < 200:
                    findings.append(Finding(
                        detector=self.name,
                        severity="med",
                        category="line-separator",
                        message=(
                            f"Unusual line / paragraph separator codepoints in "
                            f"{frag.source} — can split a single logical instruction "
                            f"across what looks like one line."
                        ),
                        evidence=", ".join(f"{k}×{v}" for k, v in sorted(line_hits.items())),
                        confidence=0.65,
                        location=frag.source,
                        sanitize_action="strip",
                    ))
        return findings
