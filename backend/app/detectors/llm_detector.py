from __future__ import annotations

from typing import Optional

from ..ai_foundry import classifier
from ..schemas import ExtractedContent, Finding, Severity
from .base import Detector


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
    name = "ai-foundry"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        if not classifier.enabled:
            return []

        findings: list[Finding] = []
        # Only send substantial / suspicious-shaped fragments to keep calls bounded.
        for frag in content.fragments:
            text = frag.text.strip()
            if len(text) < 12:
                continue
            if frag.kind in {"text", "ocr", "comment", "decoded"} or (
                frag.kind == "metadata" and len(text) > 30
            ):
                result: Optional[dict] = classifier.classify(text)
                if not result or not result.get("injection"):
                    continue
                confidence = float(result["confidence"])
                category = str(result["category"])
                findings.append(Finding(
                    detector=self.name,
                    severity=_severity_from_category(category, confidence),
                    category=category,
                    message=result.get("reason") or f"LLM classifier flagged {frag.source}.",
                    evidence=text[:220],
                    confidence=confidence,
                    location=frag.source,
                    sanitize_action="strip",
                ))
        return findings
