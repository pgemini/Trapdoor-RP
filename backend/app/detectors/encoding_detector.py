"""Encoding-bypass detector.

Attackers routinely hide instructions inside encoded blobs because:

  * Many LLMs will obediently decode Base64 / hex they're handed and then
    treat the cleartext as a fresh instruction.
  * Heuristic / regex detectors miss the encoded form — the raw bytes
    look like noise.

This detector finds suspicious encoded chunks in every fragment, decodes
them safely, and emits a Finding when the cleartext matches injection
patterns, contains URLs / secrets / role markers, or carries known
attack templates.
"""
from __future__ import annotations

import base64
import binascii
import re
import urllib.parse

from ..schemas import ExtractedContent, Finding
from .base import Detector


# ── Encoded-blob patterns ─────────────────────────────────────────────
# Standard base64 (and url-safe variant).  Require ≥24 chars to avoid
# matching short tokens / hashes / coincidences.
_B64_RE = re.compile(r"(?<![A-Za-z0-9+/=_\-])([A-Za-z0-9+/_\-]{24,}={0,2})(?![A-Za-z0-9+/=_\-])")
# Hex blob (even number of digits, ≥40 chars = 20 bytes).
_HEX_RE = re.compile(r"(?<![0-9A-Fa-fx])([0-9A-Fa-f]{40,})(?![0-9A-Fa-f])")
# URL-encoded sequences with ≥4 escapes — heuristic for hidden text.
_URLENC_RE = re.compile(r"((?:%[0-9A-Fa-f]{2}){4,})")

# Indicators inside the *decoded* text that bump severity / confidence.
_HARD_INJECT = re.compile(
    r"\b(ignore|disregard|forget)\s+(previous|prior|all|earlier|above)\s*"
    r"(instructions?|directives?|rules?|prompts?|system\s+prompt)\b"
    r"|\bsystem\s*[:,]\s*\w"
    r"|\b(jailbreak|dan\s+mode|developer\s+mode|do\s+anything\s+now)\b"
    r"|\bdrop\s+(your\s+)?(guardrails?|safety)\b",
    re.IGNORECASE,
)
_EXFIL = re.compile(
    r"\b(api[_\s\-]?key|secret|token|password|credentials?|exfiltrate)\b"
    r"|@[\w.\-]+\.[a-z]{2,}|https?://",
    re.IGNORECASE,
)


def _printable_ratio(s: str) -> float:
    if not s:
        return 0.0
    n = sum(1 for ch in s if (32 <= ord(ch) < 127) or ch in "\n\r\t")
    return n / len(s)


def _safe_b64_decode(blob: str) -> bytes | None:
    # Normalise url-safe alphabet and pad.
    s = blob.replace("-", "+").replace("_", "/")
    pad = (-len(s)) % 4
    s = s + ("=" * pad)
    try:
        return base64.b64decode(s, validate=False)
    except (binascii.Error, ValueError):
        return None


def _safe_hex_decode(blob: str) -> bytes | None:
    if len(blob) % 2:
        return None
    try:
        return bytes.fromhex(blob)
    except ValueError:
        return None


class EncodingDetector(Detector):
    """Decode base64 / hex / url-encoded chunks and re-scan for injection."""

    name = "encoding"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            text = frag.text
            if not text or len(text) < 24:
                continue

            for label, regex, decoder in (
                ("base64",     _B64_RE,    _safe_b64_decode),
                ("hex",        _HEX_RE,    _safe_hex_decode),
                ("url-encoded", _URLENC_RE, self._urldecode),
            ):
                for m in regex.finditer(text):
                    blob = m.group(1)
                    raw = decoder(blob)
                    if not raw:
                        continue
                    try:
                        decoded = raw.decode("utf-8", errors="strict")
                    except UnicodeDecodeError:
                        try:
                            decoded = raw.decode("latin-1")
                        except Exception:
                            continue
                    if _printable_ratio(decoded) < 0.85:
                        continue
                    if len(decoded.strip()) < 8:
                        continue

                    hard = bool(_HARD_INJECT.search(decoded))
                    exfil = bool(_EXFIL.search(decoded))
                    if not (hard or exfil):
                        continue

                    severity = "critical" if hard and exfil else ("high" if hard else "med")
                    confidence = 0.93 if hard else (0.78 if exfil else 0.60)
                    preview = decoded.strip().replace("\n", " ")
                    if len(preview) > 140:
                        preview = preview[:137] + "…"
                    findings.append(Finding(
                        detector=self.name,
                        severity=severity,
                        category="encoded-payload",
                        message=(
                            f"{label.title()} blob in {frag.source} decoded to "
                            f"text that matches injection / exfiltration patterns."
                        ),
                        evidence=f"{label}: {preview}",
                        confidence=confidence,
                        location=frag.source,
                        sanitize_action="discard",
                    ))
        return findings

    @staticmethod
    def _urldecode(blob: str) -> bytes | None:
        try:
            return urllib.parse.unquote_to_bytes(blob)
        except Exception:
            return None
