from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Severity = Literal["info", "low", "med", "high", "critical"]
Verdict = Literal["pass", "review", "block"]
SanitizeAction = Literal["none", "strip", "quote", "discard"]


class Finding(BaseModel):
    detector: str
    severity: Severity
    category: str
    message: str
    evidence: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    location: Optional[str] = None
    sanitize_action: SanitizeAction = "strip"


class Stage(BaseModel):
    name: str
    status: Literal["ok", "warn", "error", "skipped"]
    detail: str
    duration_ms: int = 0


class ExtractedFragment(BaseModel):
    """A piece of content pulled out of a file by an extractor."""
    source: str                # e.g. "page-2", "metadata.subject", "frame-7", "ocr"
    kind: str                  # text | metadata | ocr | decoded | comment
    text: str
    attrs: dict = Field(default_factory=dict)  # color, font, font_size, bbox, etc.


class ExtractedContent(BaseModel):
    modality: str
    mime: str
    fragments: list[ExtractedFragment]
    raw_metadata: dict = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)


class ScanResult(BaseModel):
    scan_id: str
    filename: str
    mime: str
    size_bytes: int
    modality: str
    duration_ms: int
    verdict: Verdict
    risk_score: float
    findings: list[Finding]
    stages: list[Stage]
    extracted_fragments: list[ExtractedFragment] = Field(default_factory=list)
    sanitized_context: Optional[str] = None
    blocked_spans: list[str] = Field(default_factory=list)
    ai_foundry_used: bool = False
    timestamp: datetime
