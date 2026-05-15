from __future__ import annotations

import unicodedata

from .detectors.unicode_detector import ZERO_WIDTH
from .schemas import ExtractedContent, Finding, SanitizeAction


def _strip_zero_width(text: str) -> str:
    return "".join(ch for ch in text if ch not in ZERO_WIDTH)


def _quote(text: str) -> str:
    # Render text as inert by escaping newlines and wrapping in a fenced block —
    # an LLM downstream will see it as data, not directive.
    flat = text.replace("```", "``​`")
    return f"```untrusted\n{flat}\n```"


def _normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFKC", _strip_zero_width(text))


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

        # Always block invisible content — that was the whole point of hiding it.
        if frag.attrs.get("visibility") == "invisible":
            blocked.append(snippet)
            continue
        # HTML comments and decoded byte-plane payloads never go to the LLM raw.
        if frag.kind in {"comment", "decoded"}:
            blocked.append(snippet)
            continue
        # If any detector demanded `discard`, drop the fragment.
        if "discard" in actions:
            blocked.append(snippet)
            continue
        # Metadata fragments with ANY finding are blocked — they were never
        # supposed to be instructions, so a labeled wrap would still hand
        # an attacker their payload (just with a polite envelope).
        if frag.kind == "metadata":
            if flagged:
                blocked.append(snippet)
            else:
                clean_chunks.append(
                    f"[metadata.{frag.source.split('.', 1)[-1]}] {_normalize_unicode(frag.text)}"
                )
            continue

        text = _normalize_unicode(frag.text)
        # OCR text and any finding that asked for `quote` get fenced as inert data.
        if "quote" in actions or frag.kind == "ocr" or flagged:
            text = _quote(text)
        clean_chunks.append(text)

    return "\n\n".join(clean_chunks).strip(), blocked
