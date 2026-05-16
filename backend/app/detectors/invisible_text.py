from __future__ import annotations

from ..schemas import ExtractedContent, Finding
from .base import Detector


class InvisibleTextDetector(Detector):
    """Flag fragments tagged invisible by extractors (e.g. white-on-white PDF text).

    Severity tier:
      med       — tiny invisible fragment (< 20 chars), might just be a
                   stylistic flourish that survived extraction.
      high      — substantial invisible text (≥ 20 chars).
      critical  — invisible content makes up the majority of the visible
                   total for that source location (clear hiding intent).
    """

    name = "invisible-text"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        # Build a per-source ratio: how much of THIS page / location is invisible?
        per_source_total: dict[str, int] = {}
        per_source_invisible: dict[str, int] = {}
        for f in content.fragments:
            src = f.source
            per_source_total[src] = per_source_total.get(src, 0) + len(f.text or "")
            if f.attrs.get("visibility") == "invisible":
                per_source_invisible[src] = per_source_invisible.get(src, 0) + len(f.text or "")

        findings: list[Finding] = []
        for frag in content.fragments:
            if frag.attrs.get("visibility") != "invisible":
                continue
            text = (frag.text or "").strip()
            if not text:
                continue

            preview = text.replace("\n", " ")
            preview = preview[:160] + ("…" if len(preview) > 160 else "")

            total = per_source_total.get(frag.source, 0)
            inv = per_source_invisible.get(frag.source, 0)
            ratio = (inv / total) if total else 1.0

            n = len(text)
            if n < 20:
                severity, confidence = "med", 0.65
            elif ratio >= 0.5:
                severity, confidence = "critical", 0.95
            else:
                severity, confidence = "high", 0.9

            reason = frag.attrs.get("reason", "invisible")
            findings.append(Finding(
                detector=self.name,
                severity=severity,
                category="invisible-text",
                message=(
                    f"Hidden text detected in {frag.source} ({reason}) — "
                    f"{n} chars, {ratio*100:.0f}% of source location."
                ),
                evidence=preview,
                confidence=confidence,
                location=frag.source,
                sanitize_action="strip",
            ))
        return findings
