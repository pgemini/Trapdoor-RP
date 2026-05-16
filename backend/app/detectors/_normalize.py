"""Text normalization helpers shared across detectors.

Attackers obfuscate attack strings to slip past regex sets, then trust the
LLM to "see through" the obfuscation. Trapdoor's defence is to scan both
the *original* text (so legitimate matches are surfaced verbatim for
evidence) and a *normalised* form (so obfuscated matches are also caught).

This module centralises the normalisation passes so detectors can opt
into the ones they need without reimplementing the same logic.
"""
from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

# Characters that should disappear from any normalised form: zero-width
# joiners, soft hyphen, BOM, narrow no-break space, mongolian vowel
# separator, etc.  These are commonly inserted *inside* attack words.
_INVISIBLE = (
    "­"  # SOFT HYPHEN
    "᠎"  # MONGOLIAN VOWEL SEPARATOR
    "​"  # ZWSP
    "‌"  # ZWNJ
    "‍"  # ZWJ
    "‎"  # LRM
    "‏"  # RLM
    " "  # LINE SEPARATOR
    " "  # PARAGRAPH SEPARATOR
    "‪"  # LRE
    "‫"  # RLE
    "‬"  # PDF
    "‭"  # LRO
    "‮"  # RLO
    "⁠"  # WORD JOINER
    "⁡" "⁢" "⁣" "⁤"  # invisible operators
    "⁦" "⁧" "⁨" "⁩"  # bidi isolates
    "﻿"  # BOM / ZWNBSP
    "￹" "￺" "￻"  # interlinear annotation
)
_INVISIBLE_TR = {ord(c): None for c in _INVISIBLE}


# Mathematical alphanumeric symbols (U+1D400..U+1D7FF) — bold/italic/
# fraktur/script/double-struck/etc. forms of latin/digits used by
# attackers because they look like normal latin to humans but tokenize
# differently.  We map these back to their plain-latin equivalents.
@lru_cache(maxsize=1)
def _math_unfold_table() -> dict[int, str]:
    table: dict[int, str] = {}
    # Use the Unicode "decomposition" of compatibility-equivalent forms.
    for cp in range(0x1D400, 0x1D800):
        ch = chr(cp)
        d = unicodedata.normalize("NFKC", ch)
        if d != ch and d.isascii():
            table[cp] = d
    # Tag characters (U+E0000..U+E007F) — invisible "annotation" glyphs
    # used in some real-world prompt-injection PoCs.  Map ASCII tag
    # equivalents (U+E0020..U+E007E) back to their plain forms, and drop
    # the rest entirely.
    for cp in range(0xE0000, 0xE0080):
        if 0xE0020 <= cp <= 0xE007E:
            table[cp] = chr(cp - 0xE0000)
        else:
            table[cp] = ""
    # Fullwidth ASCII (U+FF01..U+FF5E) — pure visual disguise.
    for cp in range(0xFF01, 0xFF5F):
        table[cp] = chr(cp - 0xFEE0)
    return table


# Spaced-out attack phrases like  "i g n o r e   p r e v i o u s"
# (or with dots between letters) survive regex only after collapsing.
_LETTER_SPACE_RE = re.compile(
    r"(?:(?:^|[^\w])(?:[A-Za-z][\s.\-_]){4,}[A-Za-z](?:[^\w]|$))"
)


def strip_invisible(text: str) -> str:
    """Remove zero-width and BIDI codepoints without changing visible content."""
    return text.translate(_INVISIBLE_TR)


def unfold_math(text: str) -> str:
    """Map mathematical / tag / fullwidth alphanumerics back to plain Latin."""
    return text.translate(_math_unfold_table())


def collapse_letter_spacing(text: str) -> str:
    """Collapse 'i g n o r e' / 'i.g.n.o.r.e' → 'ignore' for matching only."""
    def _join(m: re.Match[str]) -> str:
        s = m.group(0)
        # Preserve the boundary characters, collapse the spaced run between.
        # Strip every other char that is not alphanumeric.
        chars = [c for c in s if c.isalpha() or c.isdigit()]
        prefix = s[0] if not (s[0].isalpha() or s[0].isdigit()) else ""
        suffix = s[-1] if not (s[-1].isalpha() or s[-1].isdigit()) else ""
        return f"{prefix}{''.join(chars)}{suffix}"
    return _LETTER_SPACE_RE.sub(_join, text)


def nfkc(text: str) -> str:
    """Plain Unicode NFKC normalisation (composes confusable forms)."""
    return unicodedata.normalize("NFKC", text)


def normalise_for_match(text: str) -> str:
    """The full chain detectors should run against for *matching* (never display).

    Order matters: strip invisibles first so they don't break the math
    table lookups, then unfold math/tag/fullwidth, then collapse the
    common letter-spacing obfuscation, then NFKC.
    """
    if not text:
        return ""
    t = strip_invisible(text)
    t = unfold_math(t)
    t = collapse_letter_spacing(t)
    t = nfkc(t)
    return t.casefold()


# --- entropy & charset helpers ----------------------------------------

def shannon_entropy(s: str) -> float:
    """Bits/char entropy.  Random data ≈ 4..6; English text ≈ 3..4."""
    if not s:
        return 0.0
    from math import log2
    counts: dict[str, int] = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * log2(c / n) for c in counts.values())


def is_high_entropy(s: str, threshold: float = 3.5) -> bool:
    return shannon_entropy(s) >= threshold
