"""Metadata-injection detector.

Metadata fields (PDF /Author /Subject, DOCX core props, EXIF tags,
ID3 frames, RIFF INFO chunks) are an under-watched channel: extractors
surface them as text but they're not normally instructional. Any
instruction-shaped, role-shaped, or exfil-shaped content here is a
strong signal.
"""
from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding
from ._normalize import normalise_for_match
from .base import Detector


# Instruction-shaped vocabulary — single regex, fast pre-filter.
_INSTRUCTION = re.compile(
    r"\b(?:assistant|system|developer|admin|root)\b\s*[:,]"
    r"|\b(?:ignore|disregard|forget|skip|bypass|override)\s+\w+"
    r"|\btreat\s+\w+\s+as\b"
    r"|\b(?:drop|disable|remove)\s+(?:your\s+)?(?:guardrails?|safety|filters?)"
    r"|\b(?:jailbreak|dan\s+mode|developer\s+mode|do\s+anything\s+now)\b"
    r"|\bnew\s+(?:instructions?|directive|task)\s*:"
    r"|\breveal\s+(?:the\s+)?system\s+prompt",
    re.IGNORECASE,
)

# Exfiltration channels — URLs, emails, secret-looking tokens.
_EXFIL = re.compile(
    r"https?://[^\s]+"
    r"|\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
    r"|\b(?:api[_\s\-]?key|secret|token|password|bearer)\b",
    re.IGNORECASE,
)

# Role-impersonating values in author / creator / producer fields.
_AUTHOR_FIELDS = re.compile(
    r"(?:^|\.)(author|creator|producer|artist|owner|by)$",
    re.IGNORECASE,
)
_ROLE_VALUE = re.compile(
    r"^\s*(?:system|admin(?:istrator)?|root|kernel|sudo|"
    r"openai|anthropic|microsoft|google|claude|gpt|assistant)\s*$",
    re.IGNORECASE,
)


class MetadataDetector(Detector):
    """Multiple independent checks on metadata fragments."""

    name = "metadata"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            if frag.kind != "metadata":
                continue
            text = frag.text or ""
            if not text:
                continue

            normalised = normalise_for_match(text)
            evidence = text[:160] + ("…" if len(text) > 160 else "")

            if _INSTRUCTION.search(text) or _INSTRUCTION.search(normalised):
                findings.append(Finding(
                    detector=self.name,
                    severity="high",
                    category="metadata-injection",
                    message=f"Instruction-shaped text in metadata field '{frag.source}'.",
                    evidence=evidence,
                    confidence=0.85,
                    location=frag.source,
                    sanitize_action="strip",
                ))

            if _EXFIL.search(text):
                findings.append(Finding(
                    detector=self.name,
                    severity="high",
                    category="metadata-exfil-target",
                    message=(
                        f"Exfiltration channel (URL / email / secret keyword) "
                        f"in metadata field '{frag.source}'."
                    ),
                    evidence=evidence,
                    confidence=0.80,
                    location=frag.source,
                    sanitize_action="strip",
                ))

            if _AUTHOR_FIELDS.search(frag.source) and _ROLE_VALUE.match(text):
                findings.append(Finding(
                    detector=self.name,
                    severity="high",
                    category="metadata-role-impersonation",
                    message=(
                        f"Authoring-field {frag.source!r} contains a role/identity "
                        f"value: {text!r}."
                    ),
                    evidence=evidence,
                    confidence=0.82,
                    location=frag.source,
                    sanitize_action="strip",
                ))
        return findings
