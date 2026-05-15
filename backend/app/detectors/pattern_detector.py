from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding, Severity
from .base import Detector


# Public so the sanitizer can re-run the same regexes for span-level redaction.
PATTERNS: list[tuple[str, str, str, Severity, float]] = [
    # (label, regex, category, severity, base_confidence)
    ("instruction_override",
     r"\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|all|earlier|above)?\s*(instructions?|directives?|rules?|prompts?|system\s+prompt)",
     "instruction-override", "high", 0.92),
    ("forget_everything",
     r"\bforget\s+everything\b",
     "instruction-override", "high", 0.85),
    ("role_spoofing",
     # Match SYSTEM: / Assistant: with colon, OR with a comma (because
     # speech-to-text typically writes the role as "Assistant, …")
     r"(?:^|\n|\s)(system|assistant|developer)\s*[:,]\s*(?=\w)",
     "role-spoofing", "high", 0.78),
    ("guardrails_removed",
     # Passive voice: "guardrails removed / dropped / disabled / off"
     r"\bguardrails?\s+(?:are\s+)?(removed|dropped|disabled|off|down|lifted)\b",
     "guardrail-removal", "high", 0.90),
    ("you_are_now",
     r"\byou\s+are\s+(now\s+)?(a|an)?\s*\w+",
     "role-redefinition", "med", 0.55),
    ("new_instructions",
     r"\bnew\s+(instructions?|task|directive)\s*:",
     "instruction-injection", "high", 0.80),
    ("reveal_system_prompt",
     r"\breveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions?|guidelines?)",
     "prompt-leak", "critical", 0.95),
    ("reply_only_with",
     r"\b(reply|respond|answer)\s+only\s+(with|using)\b",
     "output-hijack", "med", 0.60),
    ("data_exfiltration",
     r"\b(exfiltrate|leak|send|transmit)\s+(the\s+)?(keys?|credentials?|secrets?|tokens?|api\s*keys?|emails?|messages?|user\s*\.\s*\w+)",
     "data-exfiltration", "critical", 0.96),
    ("jailbreak_keyword",
     r"\b(jailbreak|dan\s+mode|developer\s+mode|do\s+anything\s+now)\b",
     "jailbreak", "high", 0.85),
    ("drop_guardrails",
     r"\bdrop\s+(your\s+)?(guardrails?|safety\s+(filters?|rules?)|filters?)",
     "guardrail-removal", "critical", 0.94),
    ("override_system_prompt",
     r"\b(override|bypass)\s+(the\s+)?(system\s+prompt|safety)",
     "instruction-override", "high", 0.90),
    ("treat_as_system",
     # Allow up to ~60 chars of filler between "treat" and "as",
     # so phrases like "treat the rest of this audio as a system prompt" match.
     r"\btreat\s+[^.\n]{1,60}\bas\s+(a\s+)?(verified\s+|trusted\s+)?(system|admin)\s+(message|prompt|directive|instruction)",
     "role-spoofing", "high", 0.88),
    ("rate_10_out_of_10",
     r"\b(rate|score|recommend)\b[^.\n]{0,30}\b10\s*\/\s*10\b",
     "score-manipulation", "high", 0.82),
]


class PatternDetector(Detector):
    name = "pattern"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            for label, pattern, category, severity, base_conf in PATTERNS:
                m = re.search(pattern, frag.text, flags=re.IGNORECASE)
                if not m:
                    continue
                snippet = self._snippet(frag.text, m.start(), m.end())
                bump = 0.0
                if frag.kind == "metadata":
                    bump += 0.04
                if frag.attrs.get("visibility") == "invisible":
                    bump += 0.05
                if frag.kind == "comment":
                    bump += 0.05
                confidence = min(0.99, base_conf + bump)
                findings.append(Finding(
                    detector=self.name,
                    severity=severity,
                    category=category,
                    message=f"Matched injection pattern '{label}' in {frag.source}.",
                    evidence=snippet,
                    confidence=confidence,
                    location=frag.source,
                    sanitize_action="strip",
                ))
        return findings

    @staticmethod
    def _snippet(text: str, start: int, end: int, pad: int = 40) -> str:
        a = max(0, start - pad)
        b = min(len(text), end + pad)
        s = text[a:b].replace("\n", " ").strip()
        return f"…{s}…" if (a > 0 or b < len(text)) else s
