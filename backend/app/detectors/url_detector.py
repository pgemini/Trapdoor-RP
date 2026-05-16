"""URL-shape detector.

LLMs are easily fooled by URLs because their tokenizer sees the
post-IDN form, not the visual form a human would copy. Catches:

  * IDN homograph hosts — `аpple.com` with a Cyrillic 'а'.
  * Punycode hosts (`xn--…`) — *and* mixed-script in their decoded form.
  * Raw IP-literal URLs — almost always a way to evade domain filters.
  * `data:` URIs with executable MIME types (HTML, JS, SVG).
  * Uncommon schemes (`file://`, `gopher://`, `ftp://`).
  * Known URL-shortener domains hiding the real destination.
  * Suspicious query parameters (api_key, password, token, etc.).
  * URLs inside markdown link syntax `[text](url)` and angle brackets.
"""
from __future__ import annotations

import re
import unicodedata
from functools import lru_cache
from urllib.parse import parse_qsl, urlparse

from ..schemas import ExtractedContent, Finding
from .base import Detector


_SCHEME_URL_RE = re.compile(
    r"\b(?P<scheme>https?|ftp|file|gopher)://(?P<rest>[^\s\"'<>)\]\}]+)"
    r"|\b(?P<dscheme>data):(?P<drest>[^\s\"'<>)\]\}]+)",
    re.IGNORECASE,
)

# Markdown link form: [label](url) or autolink <url>.
_MARKDOWN_LINK_RE = re.compile(r"\[[^\]]*\]\(([^\s)]+)\)")
_AUTOLINK_RE = re.compile(r"<(https?://[^\s>]+)>")

_IP_HOST_RE = re.compile(r"^(\d{1,3}\.){3}\d{1,3}(:\d+)?$")
_HEX_IP_RE = re.compile(r"^0x[0-9a-fA-F]+$")
_INT_IP_RE = re.compile(r"^\d{8,12}(:\d+)?$")  # decimal-encoded IP

_DANGEROUS_DATA_MIME = re.compile(
    r"^(?:text/html|application/(?:javascript|x-javascript|ecmascript)"
    r"|image/svg\+xml)\b",
    re.IGNORECASE,
)

# Known URL shorteners. Not exhaustive — these are the high-traffic
# ones; sufficient to flag the technique.
SHORTENERS = frozenset({
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "j.mp", "rebrand.ly", "tiny.cc", "lnkd.in",
    "rb.gy", "shorturl.at", "cutt.ly", "soo.gd", "qr.ae", "v.gd",
})

# Query parameters that should NEVER appear in a URL embedded in a
# document. If they do, the document is asking the model (or the
# user) to leak something.
SUSPICIOUS_PARAMS = frozenset({
    "api_key", "apikey", "api-key", "access_token", "accesstoken",
    "auth", "authorization", "bearer", "token", "secret", "password",
    "passwd", "pwd", "session", "sid", "ssn", "credit_card",
    "exfil", "leak", "data",
})


@lru_cache(maxsize=2048)
def _script_for(ch: str) -> str:
    try:
        return unicodedata.name(ch).split(" ")[0]
    except ValueError:
        return ""


def _mixed_script_host(host: str) -> set[str]:
    scripts: set[str] = set()
    for ch in host:
        if ch.isalpha():
            s = _script_for(ch)
            if s:
                scripts.add(s)
    return {s for s in scripts if s not in {"LATIN", "DIGIT"}}


def _decode_punycode(host: str) -> str:
    try:
        return host.encode("ascii").decode("idna")
    except UnicodeError:
        return host


def _iter_urls(text: str):
    """Yield (scheme, full_url) tuples from `text`, including markdown links."""
    for m in _SCHEME_URL_RE.finditer(text):
        if m.group("scheme"):
            yield m.group("scheme").lower(), f"{m.group('scheme')}://{m.group('rest')}"
        else:
            yield m.group("dscheme").lower(), f"{m.group('dscheme')}:{m.group('drest')}"
    for m in _MARKDOWN_LINK_RE.finditer(text):
        url = m.group(1)
        if "://" in url:
            scheme, _, _ = url.partition("://")
            yield scheme.lower(), url
        elif url.lower().startswith("javascript:") or url.lower().startswith("data:"):
            yield url.split(":", 1)[0].lower(), url
    for m in _AUTOLINK_RE.finditer(text):
        url = m.group(1)
        scheme, _, _ = url.partition("://")
        yield scheme.lower(), url


class URLDetector(Detector):
    name = "url"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        seen: set[tuple[str, str]] = set()  # de-dupe (source, url)

        for frag in content.fragments:
            text = frag.text or ""
            if "://" not in text and "data:" not in text and "](" not in text:
                continue

            for scheme, url in _iter_urls(text):
                key = (frag.source, url)
                if key in seen:
                    continue
                seen.add(key)

                if scheme == "data":
                    findings.extend(self._inspect_data_uri(url, frag.source))
                    continue
                if scheme == "javascript":
                    findings.append(Finding(
                        detector=self.name,
                        severity="critical",
                        category="javascript-uri",
                        message=f"javascript: URI in {frag.source}.",
                        evidence=url[:160],
                        confidence=0.95,
                        location=frag.source,
                        sanitize_action="discard",
                    ))
                    continue

                try:
                    parsed = urlparse(url)
                except Exception:
                    continue
                host = (parsed.hostname or "").strip(". ").lower()

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

                if host and (_IP_HOST_RE.match(host) or _HEX_IP_RE.match(host)
                             or _INT_IP_RE.match(host)):
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

                # Punycode — surface the decoded form AND check it for
                # mixed scripts (a punycode form is sometimes the
                # only evidence of a homograph).
                if host and any(p.startswith("xn--") for p in host.split(".")):
                    decoded = _decode_punycode(host)
                    decoded_scripts = _mixed_script_host(decoded)
                    severity = "critical" if decoded_scripts else "high"
                    findings.append(Finding(
                        detector=self.name,
                        severity=severity,
                        category="punycode-url",
                        message=(
                            f"Punycode host ({host} → {decoded}) in {frag.source}"
                            + (f"; decoded form mixes scripts ({', '.join(sorted(decoded_scripts))})." if decoded_scripts else ".")
                        ),
                        evidence=url[:160],
                        confidence=0.90 if decoded_scripts else 0.85,
                        location=frag.source,
                        sanitize_action="quote",
                    ))
                else:
                    # Visual-script-mixing in the literal host (homoglyph).
                    scripts = _mixed_script_host(host)
                    if scripts:
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

                if host in SHORTENERS:
                    findings.append(Finding(
                        detector=self.name,
                        severity="med",
                        category="url-shortener",
                        message=(
                            f"URL shortener ({host}) hides the real destination "
                            f"of {url[:60]}…"
                        ),
                        evidence=url[:160],
                        confidence=0.65,
                        location=frag.source,
                        sanitize_action="quote",
                    ))

                # Suspicious query parameters.
                if parsed.query:
                    try:
                        params = parse_qsl(parsed.query, keep_blank_values=True)
                    except Exception:
                        params = []
                    flagged = [k for k, _ in params if k.lower() in SUSPICIOUS_PARAMS]
                    if flagged:
                        findings.append(Finding(
                            detector=self.name,
                            severity="high",
                            category="suspicious-url-params",
                            message=(
                                f"URL in {frag.source} carries credential-like "
                                f"query parameter(s): {', '.join(flagged)}."
                            ),
                            evidence=url[:160],
                            confidence=0.85,
                            location=frag.source,
                            sanitize_action="quote",
                        ))
        return findings

    def _inspect_data_uri(self, url: str, source: str) -> list[Finding]:
        body = url[len("data:"):]
        mediatype, _, payload = body.partition(",")
        mediatype = mediatype.split(";")[0] or "text/plain"
        out: list[Finding] = []

        if _DANGEROUS_DATA_MIME.match(mediatype):
            out.append(Finding(
                detector=self.name,
                severity="critical",
                category="data-uri-executable",
                message=f"data: URI with executable MIME type {mediatype!r} in {source}.",
                evidence=url[:160],
                confidence=0.92,
                location=source,
                sanitize_action="discard",
            ))
        elif len(payload) > 64:
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
