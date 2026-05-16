"""Markup-injection detector for non-text-channel content.

Plain-text fragments naturally contain HTML or markdown sometimes —
that's a different problem.  But when the same markup appears in a
channel where it shouldn't (an OCR'd photo, an audio transcript,
LSB-decoded image bytes, an extractor-decoded blob), it is almost
always an injection attempt: the attacker rendered or hid HTML in a
non-HTML medium specifically to slip past a model that's told to
"summarize this image" or "transcribe this audio".

The LLM cannot block this at its level because, from its perspective,
it is processing what looks like legitimate OCR / transcript output.
"""
from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding
from .base import Detector


_SCRIPT_TAG = re.compile(r"<\s*script\b", re.IGNORECASE)
_IFRAME_TAG = re.compile(r"<\s*iframe\b", re.IGNORECASE)
_EVENT_HANDLER = re.compile(r"\bon[a-z]{3,15}\s*=\s*['\"]", re.IGNORECASE)
_JS_URI = re.compile(r"\bjavascript\s*:", re.IGNORECASE)
_VBS_URI = re.compile(r"\bvbscript\s*:", re.IGNORECASE)
_TAG_DENSITY = re.compile(r"<\s*/?\s*[a-z][\w-]{1,20}\b[^>]{0,200}>", re.IGNORECASE)

# Kinds where markup is "out of place" and therefore suspicious.
SUSPECT_KINDS = {"ocr", "decoded", "transcript", "audio-transcript"}


class MarkupInjectionDetector(Detector):
    """Flag HTML / JS payloads appearing in OCR / decoded / transcribed text."""

    name = "markup"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            kind = frag.kind
            source = (frag.source or "").lower()
            # Treat 'text' fragments as suspect only when their source is
            # clearly a transcript / OCR pipeline.
            is_transcript = (
                kind == "text" and
                ("transcript" in source or "ocr" in source or source.startswith("vision"))
            )
            if kind not in SUSPECT_KINDS and not is_transcript:
                continue
            text = frag.text
            if not text or len(text) < 8:
                continue

            hits: list[str] = []
            confidence = 0.0
            severity = "med"

            if _SCRIPT_TAG.search(text):
                hits.append("<script>")
                confidence = max(confidence, 0.95)
                severity = "critical"
            if _IFRAME_TAG.search(text):
                hits.append("<iframe>")
                confidence = max(confidence, 0.90)
                severity = "high" if severity != "critical" else severity
            if _JS_URI.search(text):
                hits.append("javascript:")
                confidence = max(confidence, 0.92)
                severity = "high" if severity != "critical" else severity
            if _VBS_URI.search(text):
                hits.append("vbscript:")
                confidence = max(confidence, 0.90)
                severity = "high" if severity != "critical" else severity
            if _EVENT_HANDLER.search(text):
                hits.append("on*=…")
                confidence = max(confidence, 0.78)

            # Generic markup-density check — a string of <p>…</p><b>…</b>
            # tags in an OCR result is itself suspicious even without an
            # obvious script payload.
            if not hits:
                tag_count = len(_TAG_DENSITY.findall(text))
                if tag_count >= 3:
                    hits.append(f"{tag_count} html tags")
                    confidence = 0.65
                    severity = "med"

            if not hits:
                continue

            preview = text.strip().replace("\n", " ")
            if len(preview) > 160:
                preview = preview[:157] + "…"
            findings.append(Finding(
                detector=self.name,
                severity=severity,
                category="markup-injection",
                message=(
                    f"HTML / script payload in {frag.kind} fragment {frag.source} "
                    f"({', '.join(hits)})."
                ),
                evidence=preview,
                confidence=confidence,
                location=frag.source,
                sanitize_action="discard" if severity == "critical" else "strip",
            ))
        return findings
