from __future__ import annotations

import re
import unicodedata

from .detectors.pattern_detector import PATTERNS
from .detectors.unicode_detector import ZERO_WIDTH
from .schemas import ExtractedContent, Finding, SanitizeAction

# Pre-compile every injection regex once for fast sentence-level redaction.
_REDACT_RX: list[tuple[re.Pattern, str]] = [
    (re.compile(pattern, re.IGNORECASE), category)
    for _label, pattern, category, _sev, _conf in PATTERNS
]

_SENT_SPLIT_RX = re.compile(r"(?<=[.!?])\s+")


def _strip_zero_width(text: str) -> str:
    return "".join(ch for ch in text if ch not in ZERO_WIDTH)


def _normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFKC", _strip_zero_width(text))


def _quote(text: str) -> str:
    # An LLM downstream should see this as data, not directive.
    flat = text.replace("```", "``​`")
    return f"```untrusted\n{flat}\n```"


def _redact_injection_sentences(text: str) -> tuple[str, list[str]]:
    """Replace any sentence matching an injection pattern with [REDACTED: …].

    Returns (sanitized_text, list_of_redacted_sentences).
    """
    if not text.strip():
        return text, []
    parts = _SENT_SPLIT_RX.split(text)
    out_parts: list[str] = []
    redacted: list[str] = []
    for sentence in parts:
        cats: set[str] = set()
        for rx, cat in _REDACT_RX:
            if rx.search(sentence):
                cats.add(cat)
        if cats:
            label = " / ".join(sorted(cats))
            out_parts.append(f"[REDACTED: {label}]")
            redacted.append(sentence.strip())
        else:
            out_parts.append(sentence)
    return " ".join(out_parts).strip(), redacted


def sanitize(content: ExtractedContent, findings: list[Finding]) -> tuple[str, list[str]]:
    """Apply each finding's sanitize_action against the extracted text.

    Returns (sanitized_context_passed_to_llm, list_of_blocked_spans).
    """
    actions_by_source: dict[str, set[SanitizeAction]] = {}
    for f in findings:
        if not f.location:
            continue
        actions_by_source.setdefault(f.location, set()).add(f.sanitize_action)

    blocked: list[str] = []
    clean_chunks: list[str] = []

    for frag in content.fragments:
        snippet = f"[{frag.source}] {frag.text[:200]}"
        actions = actions_by_source.get(frag.source, set())
        flagged = bool(actions - {"none"})

        # Always block invisible content.
        if frag.attrs.get("visibility") == "invisible":
            blocked.append(snippet)
            continue
        # HTML comments + LSB-decoded payloads never go to the LLM raw.
        if frag.kind in {"comment", "decoded"}:
            blocked.append(snippet)
            continue
        # Discard wins.
        if "discard" in actions:
            blocked.append(snippet)
            continue
        # Flagged metadata is dropped entirely (its content was never
        # supposed to be instructional, so we don't even quote-wrap it).
        if frag.kind == "metadata":
            if flagged:
                blocked.append(snippet)
            else:
                clean_chunks.append(
                    f"[metadata.{frag.source.split('.', 1)[-1]}] {_normalize_unicode(frag.text)}"
                )
            continue

        # Plain text / OCR / transcript: normalize unicode, then redact
        # every sentence that matches an injection pattern. This is what
        # makes the BEFORE / AFTER diff visible — the sanitizer doesn't
        # just label malicious instructions, it removes them.
        text = _normalize_unicode(frag.text)
        redacted_text, redacted_sentences = _redact_injection_sentences(text)
        if redacted_sentences:
            blocked.extend(f"[{frag.source}] {s[:200]}" for s in redacted_sentences)
            text = redacted_text

        # If a detector still asked for `quote`, or this is an OCR/transcript
        # fragment, wrap the (already-redacted) text as inert data.
        if "quote" in actions or frag.kind == "ocr" or (flagged and not redacted_sentences):
            text = _quote(text)
        clean_chunks.append(text)

    return "\n\n".join(clean_chunks).strip(), blocked
