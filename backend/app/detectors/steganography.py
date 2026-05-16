from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding
from .base import Detector
from .pattern_detector import _COMPILED as _PATTERN_RULES


# Broad exfiltration / sensitive-keyword intent regex.
_INTENT = re.compile(
    r"\b(?:exfiltrate|leak|forward|send|email|transmit|upload|post)\b"
    r"|https?://"
    r"|\b(?:api[_\s\-]?key|password|secret|token|bearer|credentials?|"
    r"session|cookies?)\b"
    r"|\buser\s*\.\s*\w+"
    r"|@[\w.\-]+\.[a-z]{2,}",
    re.IGNORECASE,
)


def _score_decoded(text: str) -> tuple[str, float, str | None]:
    """Return (severity, confidence, pattern_label) for decoded ASCII.

    pattern_label is the highest-severity Trapdoor pattern that matched
    inside the decoded text (or None if only intent words matched).
    """
    # Look for a real injection-shaped pattern inside the decoded text.
    best_label = None
    best_severity = ""
    best_conf = 0.0
    rank = {"info": 0, "low": 1, "med": 2, "high": 3, "critical": 4}
    for label, pat, _cat, sev, conf in _PATTERN_RULES:
        if pat.search(text):
            if rank[sev] > rank.get(best_severity, -1):
                best_label = label
                best_severity = sev
                best_conf = conf
    if best_label:
        # The fact that the payload was *hidden* in pixel LSBs adds
        # signal — bump severity to at least high.
        if rank[best_severity] < rank["high"]:
            best_severity = "high"
        return best_severity, min(0.95, max(best_conf, 0.85)), best_label

    if _INTENT.search(text):
        return "high", 0.84, None

    return "low", 0.55, None


class SteganographyDetector(Detector):
    name = "steganography"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            if frag.kind != "decoded":
                continue
            text = frag.text or ""
            if len(text.strip()) < 6:
                continue

            entropy = frag.attrs.get("entropy")
            severity, confidence, label = _score_decoded(text)
            evidence = text[:160] + ("…" if len(text) > 160 else "")
            if label:
                msg = (
                    f"Decoded ASCII from {frag.source} (LSB entropy={entropy}) "
                    f"contains injection pattern '{label}'."
                )
                action = "discard"
            elif severity == "high":
                msg = (
                    f"Decoded ASCII from {frag.source} (LSB entropy={entropy}) "
                    f"contains exfiltration channels / sensitive keywords."
                )
                action = "discard"
            else:
                msg = (
                    f"Decoded ASCII from {frag.source} (LSB entropy={entropy}) — "
                    f"no obvious injection markers but content is unusual."
                )
                action = "quote"

            findings.append(Finding(
                detector=self.name,
                severity=severity,
                category="lsb-steganography",
                message=msg,
                evidence=evidence,
                confidence=confidence,
                location=frag.source,
                sanitize_action=action,
            ))
        return findings
