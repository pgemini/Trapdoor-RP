from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

from .ai_foundry import classifier
from .detectors import all_detectors
from .extractors import pick_extractor
from .sanitizer import sanitize
from .schemas import Finding, ScanResult, Severity, Stage, Verdict


_SEVERITY_WEIGHT: dict[Severity, float] = {
    "info": 0.05,
    "low": 0.20,
    "med": 0.45,
    "high": 0.75,
    "critical": 0.95,
}


def _aggregate_risk(findings: list[Finding]) -> float:
    if not findings:
        return 0.0
    # Treat each finding as an independent probability that this file is malicious.
    p_safe = 1.0
    for f in findings:
        weight = _SEVERITY_WEIGHT[f.severity] * max(0.25, f.confidence)
        p_safe *= (1.0 - weight)
    return round(1.0 - p_safe, 4)


def _verdict_from_risk(risk: float, findings: list[Finding]) -> Verdict:
    has_high = any(f.severity in {"high", "critical"} for f in findings)
    if risk >= 0.85 or has_high:
        return "block"
    if risk >= 0.35:
        return "review"
    return "pass"


def scan_bytes(data: bytes, filename: str) -> ScanResult:
    start_total = time.perf_counter()
    scan_id = uuid.uuid4().hex[:12]
    stages: list[Stage] = []
    findings: list[Finding] = []

    # --- Extract -------------------------------------------------------------
    extractor = pick_extractor(filename)
    t = time.perf_counter()
    try:
        content = extractor.extract(data, filename)
        stages.append(Stage(
            name=f"extract:{extractor.modality}",
            status="ok",
            detail=f"{len(content.fragments)} fragments",
            duration_ms=int((time.perf_counter() - t) * 1000),
        ))
        for note in content.notes:
            stages.append(Stage(name="extract:note", status="warn", detail=note))
    except Exception as e:
        stages.append(Stage(
            name=f"extract:{extractor.modality}",
            status="error",
            detail=str(e),
            duration_ms=int((time.perf_counter() - t) * 1000),
        ))
        return ScanResult(
            scan_id=scan_id,
            filename=filename,
            mime="application/octet-stream",
            size_bytes=len(data),
            modality=extractor.modality,
            duration_ms=int((time.perf_counter() - start_total) * 1000),
            verdict="review",
            risk_score=0.0,
            findings=[],
            stages=stages,
            timestamp=datetime.now(timezone.utc),
        )

    # --- Detect --------------------------------------------------------------
    for detector in all_detectors():
        t = time.perf_counter()
        try:
            sub = detector.detect(content)
            findings.extend(sub)
            status = "warn" if sub else "ok"
            detail = f"{len(sub)} finding(s)" if sub else "no findings"
            if detector.name == "ai-foundry" and not classifier.enabled:
                status, detail = "skipped", "AI Foundry not configured"
            stages.append(Stage(
                name=f"detect:{detector.name}",
                status=status,
                detail=detail,
                duration_ms=int((time.perf_counter() - t) * 1000),
            ))
        except Exception as e:
            stages.append(Stage(
                name=f"detect:{detector.name}",
                status="error",
                detail=str(e),
                duration_ms=int((time.perf_counter() - t) * 1000),
            ))

    # --- Sanitize ------------------------------------------------------------
    t = time.perf_counter()
    sanitized, blocked = sanitize(content, findings)
    stages.append(Stage(
        name="sanitize",
        status="ok",
        detail=f"{len(blocked)} block(s), {len(sanitized)} chars passed through",
        duration_ms=int((time.perf_counter() - t) * 1000),
    ))

    # --- Score & verdict -----------------------------------------------------
    risk = _aggregate_risk(findings)
    verdict = _verdict_from_risk(risk, findings)

    return ScanResult(
        scan_id=scan_id,
        filename=filename,
        mime=content.mime,
        size_bytes=len(data),
        modality=content.modality,
        duration_ms=int((time.perf_counter() - start_total) * 1000),
        verdict=verdict,
        risk_score=risk,
        findings=sorted(findings, key=lambda f: -_SEVERITY_WEIGHT[f.severity]),
        stages=stages,
        extracted_fragments=content.fragments,
        sanitized_context=sanitized,
        blocked_spans=blocked,
        ai_foundry_used=classifier.enabled,
        timestamp=datetime.now(timezone.utc),
    )
