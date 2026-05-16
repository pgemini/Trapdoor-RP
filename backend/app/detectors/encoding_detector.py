"""Encoding-bypass detector.

Attackers routinely hide instructions inside encoded blobs because:

  * Many LLMs will obediently decode Base64 / hex they're handed and then
    treat the cleartext as a fresh instruction.
  * Heuristic / regex detectors miss the encoded form — the raw bytes
    look like noise.

This detector finds suspicious encoded chunks in every fragment, decodes
them safely, and emits a Finding when the cleartext matches injection
patterns, contains URLs / secrets / role markers, or carries known
attack templates. Decoding is recursive up to depth 2 so payloads like
base64-of-base64 are unpeeled.
"""
from __future__ import annotations

import base64
import binascii
import codecs
import re
import string
import urllib.parse

from ..schemas import ExtractedContent, Finding
from ._normalize import is_high_entropy, shannon_entropy
from .base import Detector


# Standard base64 (and url-safe variant).  Require ≥20 alphabet chars,
# optional 1-2 padding chars.  The data-portion length needn't be a
# multiple of 4 — the decoder will validate.  We rely on the entropy
# and unique-char heuristics below to filter random IDs / hashes.
_B64_RE = re.compile(
    r"(?<![A-Za-z0-9+/=_\-])"
    r"([A-Za-z0-9+/_\-]{20,}={0,2})"
    r"(?![A-Za-z0-9+/=_\-])"
)
# Hex blob (even number of digits, ≥40 chars = 20 bytes).
_HEX_RE = re.compile(r"(?<![0-9A-Fa-fx])([0-9A-Fa-f]{40,})(?![0-9A-Fa-f])")
# URL-encoded sequences with ≥4 escapes — heuristic for hidden text.
_URLENC_RE = re.compile(r"((?:%[0-9A-Fa-f]{2}){4,})")

# Indicators inside the *decoded* text that bump severity / confidence.
_HARD_INJECT = re.compile(
    r"\b(?:ignore|disregard|forget)\s+(?:previous|prior|all|earlier|above)\s*"
    r"(?:instructions?|directives?|rules?|prompts?|system\s+prompt)\b"
    r"|\b(?:system|assistant|developer|admin|root)\s*[:,]\s*\w"
    r"|\b(?:jailbreak|dan\s+mode|developer\s+mode|do\s+anything\s+now)\b"
    r"|\bdrop\s+(?:your\s+)?(?:guardrails?|safety)\b"
    r"|\btreat\s+\w[^.\n]{0,40}\bas\s+(?:a\s+)?(?:system|admin)",
    re.IGNORECASE,
)
_EXFIL = re.compile(
    r"\b(?:api[_\s\-]?key|secret|token|password|credentials?|exfiltrate|bearer)\b"
    r"|@[\w.\-]+\.[a-z]{2,}"
    r"|https?://",
    re.IGNORECASE,
)


def _printable_ratio(s: str) -> float:
    if not s:
        return 0.0
    n = sum(1 for ch in s if (32 <= ord(ch) < 127) or ch in "\n\r\t")
    return n / len(s)


def _decode_base64(blob: str) -> bytes | None:
    # Reject obviously-not-base64 (e.g., pure hex hashes get matched
    # by _B64_RE too — but their entropy is low and they have no '+/=').
    if "=" not in blob[-3:] and len(blob) % 4 != 0:
        return None
    s = blob.replace("-", "+").replace("_", "/")
    pad = (-len(s)) % 4
    s = s + ("=" * pad)
    try:
        raw = base64.b64decode(s, validate=False)
    except (binascii.Error, ValueError):
        return None
    return raw


def _decode_hex(blob: str) -> bytes | None:
    if len(blob) % 2:
        return None
    try:
        return bytes.fromhex(blob)
    except ValueError:
        return None


def _decode_urlenc(blob: str) -> bytes | None:
    try:
        return urllib.parse.unquote_to_bytes(blob)
    except Exception:
        return None


def _rot13(s: str) -> str:
    return codecs.decode(s, "rot_13")


def _is_plausible_b64(blob: str) -> bool:
    # 1. minimum entropy of the *blob itself* (random base64 has ≥5
    #    bits/char; an English-text string has ~3-4 bits/char even when
    #    it happens to fit the alphabet)
    if not is_high_entropy(blob, threshold=4.5):
        return False
    # 2. roughly balanced character set — base64 of compressed/random
    #    data should use most of its 64 chars.  Long runs of one char
    #    are usually a hash, an ID, or repetitive text.
    unique = len(set(blob.replace("=", "")))
    if unique < 12:
        return False
    return True


def _is_plausible_hex(blob: str) -> bool:
    # Hex of english text uses ~8 chars per 4 bits effectively, with
    # entropy around 3.5-4.0. Random hashes are 4.0+. We want both.
    return is_high_entropy(blob, threshold=3.6)


def _decode_text(raw: bytes) -> str | None:
    """Try utf-8 then latin-1; require the result to be mostly printable."""
    try:
        decoded = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        try:
            decoded = raw.decode("latin-1")
        except Exception:
            return None
    if _printable_ratio(decoded) < 0.85:
        return None
    if len(decoded.strip()) < 8:
        return None
    return decoded


def _signals(text: str) -> tuple[bool, bool]:
    return bool(_HARD_INJECT.search(text)), bool(_EXFIL.search(text))


class EncodingDetector(Detector):
    """Decode base64 / hex / url-encoded / ROT13 chunks and re-scan for injection."""

    name = "encoding"
    MAX_RECURSION = 2  # decode-of-decode allowed twice

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            text = frag.text
            if not text or len(text) < 24:
                continue

            # base64 (entropy-filtered)
            for m in _B64_RE.finditer(text):
                blob = m.group(1)
                if not _is_plausible_b64(blob):
                    continue
                raw = _decode_base64(blob)
                if not raw:
                    continue
                decoded = _decode_text(raw)
                if not decoded:
                    continue
                self._evaluate(decoded, blob, "base64", frag.source, findings, depth=1)

            # hex (entropy-filtered)
            for m in _HEX_RE.finditer(text):
                blob = m.group(1)
                if not _is_plausible_hex(blob):
                    continue
                raw = _decode_hex(blob)
                if not raw:
                    continue
                decoded = _decode_text(raw)
                if not decoded:
                    continue
                self._evaluate(decoded, blob, "hex", frag.source, findings, depth=1)

            # url-encoded
            for m in _URLENC_RE.finditer(text):
                blob = m.group(1)
                raw = _decode_urlenc(blob)
                if not raw:
                    continue
                decoded = _decode_text(raw)
                if not decoded:
                    continue
                self._evaluate(decoded, blob, "url-encoded", frag.source, findings, depth=1)

            # ROT13 — only worth running on text that has decent alpha
            # density; otherwise skip (cheap heuristic).
            alpha = sum(1 for ch in text if ch.isalpha())
            if alpha >= 40:
                rot = _rot13(text)
                hard, exfil = _signals(rot)
                if hard:
                    findings.append(self._make_finding(
                        "rot13", rot, frag.source, hard=True, exfil=exfil,
                    ))

        return findings

    def _evaluate(self, decoded: str, blob: str, label: str, source: str,
                  out: list[Finding], depth: int) -> None:
        hard, exfil = _signals(decoded)
        if hard or exfil:
            out.append(self._make_finding(label, decoded, source, hard=hard, exfil=exfil))
            return

        # Recursion — maybe the decoded blob itself contains another
        # encoded payload (base64-of-base64 is a real bypass pattern).
        if depth >= self.MAX_RECURSION:
            return
        for inner_re, inner_dec, inner_label in (
            (_B64_RE, _decode_base64, "base64"),
            (_HEX_RE, _decode_hex,    "hex"),
        ):
            for m in inner_re.finditer(decoded):
                inner_blob = m.group(1)
                if inner_label == "base64" and not _is_plausible_b64(inner_blob):
                    continue
                if inner_label == "hex" and not _is_plausible_hex(inner_blob):
                    continue
                inner_raw = inner_dec(inner_blob)
                if not inner_raw:
                    continue
                inner_decoded = _decode_text(inner_raw)
                if not inner_decoded:
                    continue
                self._evaluate(
                    inner_decoded, inner_blob,
                    f"{label}→{inner_label}", source, out, depth + 1,
                )

    @staticmethod
    def _make_finding(label: str, decoded: str, source: str,
                      *, hard: bool, exfil: bool) -> Finding:
        severity = "critical" if hard and exfil else ("high" if hard else "med")
        confidence = 0.93 if hard else (0.78 if exfil else 0.60)
        preview = decoded.strip().replace("\n", " ")
        if len(preview) > 140:
            preview = preview[:137] + "…"
        return Finding(
            detector="encoding",
            severity=severity,
            category="encoded-payload",
            message=(
                f"{label} blob in {source} decoded to text matching "
                f"{'injection' if hard else 'exfiltration'} patterns."
            ),
            evidence=f"{label}: {preview}",
            confidence=confidence,
            location=source,
            sanitize_action="discard",
        )
