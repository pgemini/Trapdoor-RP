"""URL-shape detector.

LLMs are easily fooled by URLs because their tokenizer sees the
post-IDN form, not the visual form a human would copy.  Things this
detector catches that an LLM safety filter typically does not:

  * IDN homograph hosts — `аpple.com` with a Cyrillic 'а' (U+0430)
    instead of Latin 'a' (U+0061).
  * Punycode hosts (`xn--…`) — visible to humans only after decoding.
  * Raw IP-literal URLs — almost always a way to evade domain filters
    on data-exfiltration calls.
  * `data:` URIs whose MIME type is executable (HTML, JS, SVG with
    script).  An LLM that's instructed to "open the link" will happily
    decode and act on these.
  * `file://`, `gopher://`, `ftp://` schemes — uncommon in modern
    business content; near-zero false-positive rate.
"""
from __future__ import annotations

import re
import unicodedata
from urllib.parse import urlparse, unquote

from ..schemas import ExtractedContent, Finding
from .base import Detector


_URL_RE = re.compile(
    r"\b(?P<scheme>https?|ftp|file|gopher)://(?P<rest>[^\s\"'<>]+)"
    r"|\b(?P<dscheme>data):(?P<drest>[^\s\"'<>]+)",
    re.IGNORECASE,
)

_IP_HOST_RE = re.compile(r"^(\d{1,3}\.){3}\d{1,3}(:\d+)?$")
_HEX_IP_RE = re.compile(r"^0x[0-9a-fA-F]+$")

# Suspicious data: URI mime types.
_DANGEROUS_DATA_MIME = re.compile(
    r"^(?:text/html|application/(?:javascript|x-javascript|ecmascript)"
    r"|image/svg\+xml)\b",
    re.IGNORECASE,
)


def _script_for(ch: str) -> str:
    """Return the Unicode 'script' tag from the character's name."""
    try:
        name = unicodedata.name(ch)
    except ValueError:
        return ""
    # First token of the name is usually the script ("LATIN", "CYRILLIC"…).
    return name.split(" ")[0]


def _mixed_script_host(host: str) -> set[str]:
    scripts = set()
    for ch in host:
        if ch.isalpha():
            s = _script_for(ch)
            if s:
                scripts.add(s)
    # Strip the always-fine ones we don't consider mixed.
    benign = {"LATIN", "DIGIT"}
    return {s for s in scripts if s not in benign}


class URLDetector(Detector):
    """Flag homograph URLs, punycode hosts, raw IPs, dangerous data: URIs."""

    name = "url"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            text = frag.text
            if not text:
                continue
            for m in _URL_RE.finditer(text):
                if m.group("scheme"):
                    scheme = m.group("scheme").lower()
                    url = f"{scheme}://{m.group('rest')}"
                else:
                    scheme = m.group("dscheme").lower()
                    url = f"{scheme}:{m.group('drest')}"

                if scheme == "data":
                    findings.extend(self._inspect_data_uri(url, frag.source))
                    continue

                try:
                    parsed = urlparse(url)
                except Exception:
                    continue
                host = (parsed.hostname or "").strip(". ")

                # Uncommon / pre-web schemes.
                if scheme in {"file", "gopher", "ftp"}:
                    findings.append(Finding(
                        detector=self.name,
                        severity="high",
                        category="suspicious-url-scheme",
                        message=f"{scheme.upper()} URL in {frag.source}.",
                        evidence=url[:160],
                        confidence=0.85,
                        location=frag.source,
                        sanitize_action="quote",
                    ))

                # Raw IP host.
                if host and (_IP_HOST_RE.match(host) or _HEX_IP_RE.match(host)):
                    findings.append(Finding(
                        detector=self.name,
                        severity="high",
                        category="ip-literal-url",
                        message=f"URL points at a raw IP address ({host}).",
                        evidence=url[:160],
                        confidence=0.80,
                        location=frag.source,
                        sanitize_action="quote",
                    ))

                # Punycode host — make the decoded form visible.
                if host and any(p.startswith("xn--") for p in host.split(".")):
                    try:
                        decoded = host.encode("ascii").decode("idna")
                    except UnicodeError:
                        decoded = host
                    findings.append(Finding(
                        detector=self.name,
                        severity="high",
                        category="punycode-url",
                        message=f"Punycode host ({host} → {decoded}) in {frag.source}.",
                        evidence=url[:160],
                        confidence=0.88,
                        location=frag.source,
                        sanitize_action="quote",
                    ))
                else:
                    # Visual-script-mixing in the host (IDN homograph).
                    scripts = _mixed_script_host(host)
                    if len(scripts) >= 1 and "LATIN" in {s for s in scripts | {"LATIN"}} and scripts:
                        # The host has at least one non-Latin alpha codepoint.
                        findings.append(Finding(
                            detector=self.name,
                            severity="high",
                            category="homograph-url",
                            message=(
                                f"URL host {host!r} mixes scripts "
                                f"({', '.join(sorted(scripts))}) — possible homograph."
                            ),
                            evidence=url[:160],
                            confidence=0.84,
                            location=frag.source,
                            sanitize_action="quote",
                        ))
        return findings

    def _inspect_data_uri(self, url: str, source: str) -> list[Finding]:
        # data:[<mediatype>][;base64],<data>
        body = url[len("data:"):]
        mediatype, _, payload = body.partition(",")
        mediatype = mediatype.split(";")[0] or "text/plain"
        out: list[Finding] = []

        if _DANGEROUS_DATA_MIME.match(mediatype):
            out.append(Finding(
                detector=self.name,
                severity="critical",
                category="data-uri-executable",
                message=(
                    f"data: URI with executable MIME type {mediatype!r} in {source}."
                ),
                evidence=url[:160],
                confidence=0.92,
                location=source,
                sanitize_action="discard",
            ))
        elif len(payload) > 64:
            # Long opaque data: URIs in user content are suspicious even if
            # the media type is benign — they're a common smuggling channel.
            out.append(Finding(
                detector=self.name,
                severity="med",
                category="data-uri-large",
                message=f"Large opaque data: URI ({len(payload)} chars) in {source}.",
                evidence=url[:160],
                confidence=0.6,
                location=source,
                sanitize_action="quote",
            ))
        return out
