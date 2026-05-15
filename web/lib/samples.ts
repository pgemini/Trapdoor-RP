import type { SampleKey } from "./types";

export interface SampleMeta {
  key: SampleKey;
  filename: string;
  badge: "PDF" | "PNG" | "DOCX" | "MD" | "WAV" | "XLSX";
  tag: "pdf" | "img" | "doc" | "md" | "aud" | "xls";
  label: string;
  subtitle: string;
  modality: string;
}

export const SAMPLES: SampleMeta[] = [
  { key: "resume",  filename: "resume_candidate_42.pdf", badge: "PDF",  tag: "pdf", label: "Resume PDF",       subtitle: "White-on-white text injection",  modality: "document/pdf"   },
  { key: "invoice", filename: "invoice_scan.png",        badge: "PNG",  tag: "img", label: "Invoice scan",     subtitle: "OCR overlay + PNG metadata",     modality: "image"          },
  { key: "memo",    filename: "policy_memo.docx",        badge: "DOCX", tag: "doc", label: "Policy memo",      subtitle: "DOCX metadata payload",          modality: "document/docx"  },
  { key: "meme",    filename: "support_meme.png",        badge: "PNG",  tag: "img", label: "Support meme",     subtitle: "LSB steganography payload",      modality: "image"          },
  { key: "readme",  filename: "README_external.md",      badge: "MD",   tag: "md",  label: "External README",  subtitle: "ZWSP + HTML comment",            modality: "text"           },
  { key: "audio",   filename: "support_call.wav",        badge: "WAV",  tag: "aud", label: "Support call",     subtitle: "RIFF INFO metadata injection",   modality: "audio"          },
  { key: "excel",   filename: "expenses_q1.xlsx",        badge: "XLSX", tag: "xls", label: "Q1 expenses",      subtitle: "Cells + comment + properties",   modality: "spreadsheet/xlsx" },
];

export const PATTERN_LIBRARY: Array<{ name: string; description: string }> = [
  { name: "instruction_override",   description: "ignore previous instructions" },
  { name: "forget_everything",      description: "forget everything" },
  { name: "role_spoofing",          description: "system: / assistant:" },
  { name: "new_instructions",       description: "new instructions:" },
  { name: "reveal_system_prompt",   description: "reveal system prompt" },
  { name: "data_exfiltration",      description: "leak / exfiltrate keys|secrets|tokens" },
  { name: "jailbreak_keyword",      description: "DAN mode, jailbreak" },
  { name: "drop_guardrails",        description: "drop your guardrails" },
  { name: "override_system_prompt", description: "override system prompt" },
  { name: "treat_as_system",        description: "treat this as a system message" },
  { name: "score_manipulation",     description: "rate … 10/10" },
  { name: "zero_width_chars",       description: "ZWSP / ZWNJ / ZWJ / BOM" },
  { name: "confusable_script",      description: "mixed Latin + Cyrillic look-alikes" },
];
