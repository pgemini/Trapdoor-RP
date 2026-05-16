"""Markup / template / SQL injection detector for non-text-channel content.

Plain-text fragments naturally contain HTML or markdown sometimes —
that's a different problem. But when the same markup appears in a
channel where it shouldn't (an OCR'd photo, an audio transcript, an
LSB-decoded blob, a metadata field), it is almost always an injection
attempt: the attacker rendered or hid the payload in a medium
specifically to slip past a model that's told to "summarize this image"
or "transcribe this audio".

The LLM cannot block this at its level because, from its perspective,
it is processing what looks like legitimate OCR / transcript output.

Categories emitted:
  * markup-injection         — <script>, <iframe>, event handlers, js URIs
  * template-injection       — `{{…}}`, `${…}`, `<%…%>`, `#{…}`
  * sql-injection            — common SQLi sentinels (' OR 1=1, UNION SELECT)
"""
from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding
from .base import Detector


# --- HTML / JS payloads -------------------------------------------------
_SCRIPT_TAG = re.compile(r"<\s*script\b", re.IGNORECASE)
_IFRAME_TAG = re.compile(r"<\s*iframe\b", re.IGNORECASE)
_OBJECT_TAG = re.compile(r"<\s*(?:object|embed|applet)\b", re.IGNORECASE)
_EVENT_HANDLER = re.compile(r"\son[a-z]{3,15}\s*=\s*['\"]", re.IGNORECASE)
_JS_URI = re.compile(r"\bjavascript\s*:", re.IGNORECASE)
_VBS_URI = re.compile(r"\bvbscript\s*:", re.IGNORECASE)
_TAG_DENSITY = re.compile(r"<\s*/?\s*[a-z][\w-]{1,20}\b[^>]{0,200}>", re.IGNORECASE)
# Markdown link with javascript: / data: payload.
_MARKDOWN_BAD_LINK = re.compile(
    r"\[[^\]]*\]\(\s*(?:javascript|data|vbscript)\s*:",
    re.IGNORECASE,
)

# --- Template injection -------------------------------------------------
# Jinja2 / Django / Twig / Liquid / Velocity / FreeMarker / Smarty …
_TEMPLATE_BRACES = re.compile(r"\{\{\s*[^}\s][^}]{0,100}\}\}")
_TEMPLATE_TAGS   = re.compile(r"\{%\s*\w+[^%]{0,200}%\}")
_TEMPLATE_DOLLAR = re.compile(r"\$\{\s*[^\s}][^}]{0,80}\}")
_TEMPLATE_HASH   = re.compile(r"#\{\s*[^\s}][^}]{0,80}\}")
_ASP_TEMPLATE    = re.compile(r"<%\s*[^%]{0,300}%>")
# Server-side-render-style format-string attacks against safe text.
_TEMPLATE_PAYLOADS = re.compile(
    r"\{\{\s*(?:config|self|request|application|__\w+__|process|"
    r"environ|globals?|locals?|os|sys|eval|exec)\b",
    re.IGNORECASE,
)

# --- SQL injection ------------------------------------------------------
_SQLI = re.compile(
    r"(?:'|\")\s*(?:--|#|/\*|;)"                                  # quote then comment / terminator
    r"|\bunion\s+(?:all\s+)?select\b"
    r"|\bor\s+1\s*=\s*1\b|\band\s+1\s*=\s*1\b"
    r"|\bselect\s+\*\s+from\b\s+(?:information_schema|sysobjects|pg_catalog)"
    r"|';\s*(?:drop|delete|update|insert)\s+",
    re.IGNORECASE,
)

# --- Channels where these payloads are "out of place" -------------------
SUSPECT_KINDS = {"ocr", "decoded", "transcript", "audio-transcript", "metadata"}


class MarkupInjectionDetector(Detector):
    name = "markup"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            kind = frag.kind
            source = (frag.source or "").lower()
            is_transcript = (
                kind == "text" and
                ("transcript" in source or "ocr" in source or source.startswith("vision"))
            )
            if kind not in SUSPECT_KINDS and not is_transcript:
                continue
            text = frag.text or ""
            if len(text) < 8:
                continue

            # ---- markup / JS ------------------------------------------
            hits: list[str] = []
            severity = "med"
            confidence = 0.0

            if _SCRIPT_TAG.search(text):
                hits.append("<script>"); confidence = max(confidence, 0.95); severity = "critical"
            if _IFRAME_TAG.search(text):
                hits.append("<iframe>"); confidence = max(confidence, 0.90)
                if severity != "critical": severity = "high"
            if _OBJECT_TAG.search(text):
                hits.append("<object/embed>"); confidence = max(confidence, 0.88)
                if severity != "critical": severity = "high"
            if _JS_URI.search(text):
                hits.append("javascript:"); confidence = max(confidence, 0.92)
                if severity != "critical": severity = "high"
            if _VBS_URI.search(text):
                hits.append("vbscript:"); confidence = max(confidence, 0.90)
                if severity != "critical": severity = "high"
            if _EVENT_HANDLER.search(text):
                hits.append("on*=…"); confidence = max(confidence, 0.78)
            if _MARKDOWN_BAD_LINK.search(text):
                hits.append("[…](javascript:)"); confidence = max(confidence, 0.92)
                if severity != "critical": severity = "high"

            if not hits:
                tag_count = len(_TAG_DENSITY.findall(text))
                if tag_count >= 3:
                    hits.append(f"{tag_count} html tags"); confidence = 0.65

            if hits:
                preview = self._preview(text)
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

            # ---- template injection -----------------------------------
            tpl_hits: list[str] = []
            if _TEMPLATE_PAYLOADS.search(text):
                # Definitely an attack payload (config / globals / __mro__ …)
                tpl_hits.append("{{ config/globals/__… }}")
                tpl_severity, tpl_conf = "critical", 0.95
            else:
                tpl_severity, tpl_conf = "med", 0.0
                if _TEMPLATE_BRACES.search(text):
                    tpl_hits.append("{{ … }}"); tpl_conf = max(tpl_conf, 0.65)
                if _TEMPLATE_TAGS.search(text):
                    tpl_hits.append("{% … %}"); tpl_conf = max(tpl_conf, 0.70)
                if _TEMPLATE_DOLLAR.search(text):
                    tpl_hits.append("${ … }"); tpl_conf = max(tpl_conf, 0.65)
                if _TEMPLATE_HASH.search(text):
                    tpl_hits.append("#{ … }"); tpl_conf = max(tpl_conf, 0.65)
                if _ASP_TEMPLATE.search(text):
                    tpl_hits.append("<% … %>"); tpl_conf = max(tpl_conf, 0.65)

            if tpl_hits:
                findings.append(Finding(
                    detector=self.name,
                    severity=tpl_severity,
                    category="template-injection",
                    message=(
                        f"Template-injection-shaped tokens in {frag.kind} fragment "
                        f"{frag.source}: {', '.join(tpl_hits)}."
                    ),
                    evidence=self._preview(text),
                    confidence=tpl_conf,
                    location=frag.source,
                    sanitize_action=("discard" if tpl_severity == "critical" else "strip"),
                ))

            # ---- SQL injection ----------------------------------------
            if _SQLI.search(text):
                findings.append(Finding(
                    detector=self.name,
                    severity="high",
                    category="sql-injection",
                    message=(
                        f"SQL-injection sentinel pattern in {frag.kind} fragment "
                        f"{frag.source}."
                    ),
                    evidence=self._preview(text),
                    confidence=0.80,
                    location=frag.source,
                    sanitize_action="strip",
                ))

        return findings

    @staticmethod
    def _preview(text: str, n: int = 160) -> str:
        preview = text.strip().replace("\n", " ")
        return preview[: n - 1] + "…" if len(preview) > n else preview
