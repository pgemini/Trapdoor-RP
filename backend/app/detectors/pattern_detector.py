from __future__ import annotations

import re

from ..schemas import ExtractedContent, Finding, Severity
from ._normalize import normalise_for_match, strip_invisible
from .base import Detector


# Public so the sanitizer can re-run the same regexes for span-level redaction.
PATTERNS: list[tuple[str, str, str, Severity, float]] = [
    # (label, regex, category, severity, base_confidence)

    # --- Instruction override ---
    ("instruction_override",
     r"\b(?:ignore|disregard|forget|skip|bypass|override)\b[^.\n]{0,40}\b"
     r"(?:previous|prior|all|earlier|above|former|original)?\s*"
     r"(?:instructions?|directives?|rules?|prompts?|guidelines?|policies|system\s+prompt|context)",
     "instruction-override", "high", 0.92),
    ("forget_everything",
     r"\b(?:forget|erase|clear|wipe)\s+everything\b",
     "instruction-override", "high", 0.85),
    ("start_over",
     r"\b(?:start|begin)\s+(?:over|again|fresh|anew)\s+(?:and|with|by)\b",
     "instruction-override", "med", 0.55),
    ("new_instructions",
     r"\bnew\s+(?:instructions?|task|directive|orders?)\s*:",
     "instruction-injection", "high", 0.80),

    # --- Role spoofing ---
    ("role_spoofing",
     # SYSTEM: / Assistant: / Developer: with colon, OR with a comma
     # because speech-to-text often writes "assistant, do X".
     r"(?:^|\n|[\s>])(?P<role>system|assistant|developer|admin|root)\s*[:,]\s*(?=\w)",
     "role-spoofing", "high", 0.78),
    ("treat_as_system",
     r"\btreat\s+[^.\n]{1,60}\bas\s+(?:a\s+)?(?:verified\s+|trusted\s+)?"
     r"(?:system|admin|developer|root)\s+(?:message|prompt|directive|instruction|command)",
     "role-spoofing", "high", 0.88),
    ("you_are_now",
     # Specific role nouns only — no more matching "you are a software engineer".
     r"\byou(?:'re| are)\s+(?:now\s+)?(?:a |an )?"
     r"(?:dan|jailbreak|developer\s+mode|admin|root|unrestricted|"
     r"uncensored|evil|opposite\s+ai|liberated|unfiltered|"
     r"god\s*mode|sudo)\b",
     "role-redefinition", "high", 0.85),
    ("act_as",
     r"\b(?:act|pretend|roleplay|behave)\s+(?:as\s+if\s+you\s+(?:are|were)|"
     r"as)\s+(?:a\s+|an\s+)?(?:jailbroken|unrestricted|"
     r"uncensored|evil|dan|admin|root|hacker)\b",
     "role-redefinition", "high", 0.82),

    # --- Prompt leak ---
    ("reveal_system_prompt",
     r"\b(?:reveal|show|print|output|repeat|display|reproduce|leak|tell\s+me)\s+"
     r"(?:your\s+|the\s+)?(?:system\s+prompt|hidden\s+instructions?|"
     r"original\s+prompt|initial\s+prompt|guidelines?|rules?)",
     "prompt-leak", "critical", 0.95),
    ("repeat_above",
     r"\brepeat\s+(?:everything|all|the\s+text)\s+(?:above|before)\b",
     "prompt-leak", "high", 0.78),

    # --- Output hijack / formatting attack ---
    ("reply_only_with",
     r"\b(?:reply|respond|answer|output)\s+only\s+(?:with|using)\b",
     "output-hijack", "med", 0.60),
    ("end_response_with",
     r"\b(?:end|finish|close|terminate)\s+(?:your\s+)?(?:response|answer|reply)\s+with\b",
     "output-hijack", "med", 0.55),

    # --- Data exfiltration ---
    ("data_exfiltration",
     r"\b(?:exfiltrate|leak|send|transmit|forward|upload|post|email)\s+"
     r"(?:the\s+|all\s+)?(?:keys?|credentials?|secrets?|tokens?|"
     r"api[\s_\-]?keys?|emails?|messages?|password|"
     r"user(?:\s*\.\s*\w+)?|session|cookies?)",
     "data-exfiltration", "critical", 0.96),
    ("send_to_attacker",
     r"\b(?:send|email|post|forward)\s+(?:it|them|this|all|everything)\s+to\s+"
     r"(?:https?://|ftp://|[A-Za-z0-9._%+\-]+@)",
     "data-exfiltration", "critical", 0.94),

    # --- Jailbreak / guardrail removal ---
    ("jailbreak_keyword",
     r"\b(?:jailbreak|dan\s+mode|developer\s+mode|do\s+anything\s+now|"
     r"god\s+mode|hacker\s+mode|opposite\s+day|aim\s+mode|"
     r"stan\s+mode|chad\s+mode)\b",
     "jailbreak", "high", 0.85),
    ("guardrails_removed",
     r"\bguardrails?\s+(?:are\s+|have\s+been\s+)?"
     r"(?:removed|dropped|disabled|off|down|lifted|deactivated|bypassed)\b",
     "guardrail-removal", "high", 0.90),
    ("drop_guardrails",
     r"\b(?:drop|disable|remove|turn\s+off|deactivate|skip)\s+"
     r"(?:your\s+|all\s+)?(?:guardrails?|safety\s+(?:filters?|rules?|checks?)|"
     r"content\s+(?:policy|filters?)|filters?|restrictions?|limitations?)",
     "guardrail-removal", "critical", 0.94),
    ("override_system_prompt",
     r"\b(?:override|bypass|ignore|circumvent)\s+(?:the\s+)?"
     r"(?:system\s+prompt|safety|guardrails?|filters?|policy)",
     "instruction-override", "high", 0.90),
    ("hypothetical_jailbreak",
     r"\bhypothetically|in\s+a\s+(?:fictional|hypothetical|alternate)\s+(?:world|universe|scenario)\b"
     r"[^.\n]{0,80}\b(?:how\s+(?:would|could|to)|describe|explain)\b",
     "jailbreak", "med", 0.55),

    # --- Score / recommendation manipulation ---
    ("rate_10_out_of_10",
     r"\b(?:rate|score|recommend|grade|rank)\b[^.\n]{0,30}\b"
     r"(?:10\s*/\s*10|10\s+out\s+of\s+10|five\s+stars?|5\s+stars?|highest|"
     r"perfect|maximum|top)\b",
     "score-manipulation", "high", 0.82),
    ("approve_unconditionally",
     r"\b(?:approve|accept|recommend|hire|select)\s+(?:this|the|them)\s+"
     r"(?:unconditionally|immediately|without\s+(?:question|review|hesitation))\b",
     "score-manipulation", "high", 0.80),

    # --- Tool / function hijack ---
    ("tool_invocation",
     r"\b(?:call|invoke|run|execute|use)\s+(?:the\s+)?(?:tool|function|api|command)\s+"
     r"['\"`]?\w+['\"`]?\s+with\b",
     "tool-hijack", "med", 0.60),
    ("python_eval",
     r"\b(?:eval|exec|os\.(?:system|popen)|subprocess\.(?:run|call|Popen))\s*\(",
     "code-injection", "high", 0.80),
]

# Pre-compile once; the regex set is large enough that this matters.
_COMPILED: list[tuple[str, re.Pattern[str], str, Severity, float]] = [
    (label, re.compile(pat, re.IGNORECASE), cat, sev, conf)
    for (label, pat, cat, sev, conf) in PATTERNS
]


def _overlaps(span_a: tuple[int, int], span_b: tuple[int, int]) -> bool:
    return not (span_a[1] <= span_b[0] or span_b[1] <= span_a[0])


class PatternDetector(Detector):
    name = "pattern"

    def detect(self, content: ExtractedContent) -> list[Finding]:
        findings: list[Finding] = []
        for frag in content.fragments:
            raw = frag.text
            if not raw:
                continue

            # We scan two views of the fragment:
            #   1. lightly cleaned  (zero-width + BIDI stripped)  for evidence
            #   2. fully normalised (NFKC, math unfold, letter-space collapse,
            #      casefolded) for matching obfuscated forms.
            cleaned = strip_invisible(raw)
            normalised = normalise_for_match(raw)

            seen_spans: list[tuple[int, int]] = []  # in `cleaned`

            for label, pat, category, severity, base_conf in _COMPILED:
                # Try the cleaned text first (so spans line up for evidence).
                m = pat.search(cleaned)
                target_text = cleaned
                if not m and normalised != cleaned.casefold():
                    m = pat.search(normalised)
                    target_text = normalised
                if not m:
                    continue

                span = (m.start(), m.end())
                # Skip if a higher-confidence pattern already claimed this span.
                if any(_overlaps(span, s) for s in seen_spans):
                    continue

                seen_spans.append(span)

                snippet = self._snippet(target_text, m.start(), m.end())
                bump = 0.0
                if frag.kind == "metadata":
                    bump += 0.04
                if frag.attrs.get("visibility") == "invisible":
                    bump += 0.05
                if frag.kind == "comment":
                    bump += 0.05
                # If the match was only visible in the normalised view, the
                # original was obfuscated — that itself is a stronger signal.
                if target_text is normalised and cleaned.casefold() != normalised:
                    bump += 0.03
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
