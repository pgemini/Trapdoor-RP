from __future__ import annotations

import hashlib
import logging
import time
from typing import Optional

from ..ai_foundry import classifier
from ..schemas import ExtractedContent, Finding, Severity
from .base import Detector

log = logging.getLogger("trapdoor.llm-detector")


def _severity_from_category(cat: str, conf: float) -> Severity:
    cat = cat.lower()
    if cat in {"data-exfiltration", "prompt-leak", "guardrail-removal"}:
        return "critical" if conf >= 0.7 else "high"
    if cat in {"instruction-override", "role-spoofing", "jailbreak"}:
        return "high" if conf >= 0.65 else "med"
    if cat == "benign":
        return "info"
    return "med"


class LLMDetector(Detector):
    """Azure AI Foundry classifier.

    Hardened with:
      * Per-process content-hash cache so repeat fragments cost one API
        call per scan, not per fragment.
      * Bounded retry on transient (None / empty) results.
      * Severity-mapping is local-only — a swapped model can't downgrade
        a verdict to 'info'.
    """

    name = "ai-foundry"

    MIN_LEN = 10                 # ≥10 chars before we spend an API call
    METADATA_MIN_LEN = 30        # stricter floor for metadata fragments
    SCAN_KINDS = {"text", "ocr", "comment", "decoded", "transcript", "audio-transcript"}
    MAX_RETRIES = 2
    RETRY_BACKOFF_S = 0.4
    CACHE_LIMIT = 512            # cap per-process cache size

    def __init__(self) -> None:
        self._cache: dict[str, dict | None] = {}

    def detect(self, content: ExtractedContent) -> list[Finding]:
        if not classifier.enabled:
            return []

        findings: list[Finding] = []
        for frag in content.fragments:
            text = (frag.text or "").strip()
            if not text:
                continue
            if frag.kind == "metadata" and len(text) < self.METADATA_MIN_LEN:
                continue
            if frag.kind not in self.SCAN_KINDS and frag.kind != "metadata":
                continue
            if len(text) < self.MIN_LEN:
                continue

            result = self._classify_with_cache(text)
            if not result or not result.get("injection"):
                continue

            try:
                confidence = float(result["confidence"])
            except (TypeError, ValueError):
                continue
            confidence = max(0.0, min(1.0, confidence))
            category = str(result.get("category", "")).strip().lower() or "unknown"
            findings.append(Finding(
                detector=self.name,
                severity=_severity_from_category(category, confidence),
                category=category,
                message=(result.get("reason")
                         or f"LLM classifier flagged {frag.source}."),
                evidence=text[:220],
                confidence=confidence,
                location=frag.source,
                sanitize_action="strip",
            ))
        return findings

    # ---- internals -----------------------------------------------------

    def _classify_with_cache(self, text: str) -> Optional[dict]:
        key = hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()[:32]
        if key in self._cache:
            return self._cache[key]

        result: Optional[dict] = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                result = classifier.classify(text)
            except Exception as e:                       # defensive — should never bubble
                log.warning("classifier.classify raised: %s", e)
                result = None
            if result is not None:
                break
            if attempt < self.MAX_RETRIES:
                time.sleep(self.RETRY_BACKOFF_S * (2 ** attempt))

        # Bound cache growth — drop the oldest entry when over the limit.
        if len(self._cache) >= self.CACHE_LIMIT:
            try:
                first = next(iter(self._cache))
                self._cache.pop(first, None)
            except StopIteration:
                pass
        self._cache[key] = result
        return result
