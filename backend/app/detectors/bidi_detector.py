"""Bidirectional / control-character detector.

Catches a class of attacks the LLM literally cannot see, because they
work at the *display* or *parser* layer:

  * Trojan Source (CVE-2021-42574) — RLO/LRO/PDF/etc. flip the on-screen
    order of characters so a human reviewer sees one instruction and the
    LLM (or downstream parser) sees another.
  * Line / paragraph separator (U+2028 / U+2029) can split a single
    logical instruction across what looks like one line of source, or
    inject what looks like a new "user turn" into a single fragment.
  * Interlinear annotation marks (U+FFF9..FFFB) can hide entire
    sub-strings between visible glyphs.

These code points have legitimate uses but are extraordinarily rare in
normal English / business content — any occurrence is suspicious.
"""
from __future__ import annotations

from ..schemas import ExtractedContent, Finding
from .base import Detector


# Display-order override / isolate controls — the Trojan Source family.
BIDI_OVERRIDES = {
    "‪": "LRE",   # left-to-right embedding
    "‫": "RLE",   # right-to-left embedding
    "‬": "PDF",   # pop directional formatting
    "‭": "LRO",   # left-to-right override
    "‮": "RLO",   # right-to-left override  ← canonical Trojan-Source
    "⁦": "LRI",   # left-to-right isolate
    "⁧": "RLI",   # right-to-left isolate
    "⁨": "FSI",   # first-strong isolate
    "⁩": "PDI",   # pop directional isolate
}

# Line / paragraph separators that look like nothing but split text.
LINE_SEPS = {
    " ": "LS",    # line separator
    " ": "PS",    # paragraph separator
    "": "NEL",   # next line
}

# Annotation marks — can wrap entirely-invisible payloads.
ANNOTATIONS = {
    "￹": "IAA",   # interlinear annotation anchor
    "￺": "IAS",   # interlinear annotation separator
    "￻": "IAT",   # interlinear annotation terminator
}


class BidiDetector(Detector):
    """Flag bidirectional overrides, line separators, annotation marks."""

    name = "bidi"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            text = frag.text
            if not text:
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

            if bidi_hits:
                # RLO / LRO are essentially never benign in mixed text.
                has_override = bool(bidi_hits.get("RLO") or bidi_hits.get("LRO"))
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
                # Line separators are common in some software output, so
                # flag at med severity unless they appear alongside other
                # injection-shaped indicators handled elsewhere.
                findings.append(Finding(
                    detector=self.name,
                    severity="med",
                    category="line-separator",
                    message=(
                        f"Unusual line / paragraph separator codepoints in {frag.source} "
                        f"— can split a single logical instruction across "
                        f"what appears to be one line."
                    ),
                    evidence=", ".join(f"{k}×{v}" for k, v in sorted(line_hits.items())),
                    confidence=0.65,
                    location=frag.source,
                    sanitize_action="strip",
                ))
        return findings
