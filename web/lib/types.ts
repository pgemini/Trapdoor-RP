export type Severity = "info" | "low" | "med" | "high" | "critical";
export type Verdict = "pass" | "review" | "block";
export type SanitizeAction = "none" | "strip" | "quote" | "discard";

export interface Finding {
  detector: string;
  severity: Severity;
  category: string;
  message: string;
  evidence?: string | null;
  confidence: number;
  location?: string | null;
  sanitize_action: SanitizeAction;
}

export interface Stage {
  name: string;
  status: "ok" | "warn" | "error" | "skipped";
  detail: string;
  duration_ms: number;
}

export interface ExtractedFragment {
  source: string;
  kind: string;
  text: string;
  attrs?: Record<string, unknown>;
}

export interface ScanResult {
  scan_id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  modality: string;
  duration_ms: number;
  verdict: Verdict;
  risk_score: number;
  findings: Finding[];
  stages: Stage[];
  extracted_fragments: ExtractedFragment[];
  sanitized_context: string | null;
  blocked_spans: string[];
  ai_foundry_used: boolean;
  timestamp: string;
}

export interface HealthInfo {
  ok: boolean;
  version: string;
  ai_foundry: boolean;
  transcription: { enabled: boolean; mode: string | null };
  max_upload_mb: number;
}

export interface SampleDescriptor {
  key: string;
  filename: string;
  label: string;
  subtitle: string;
  modality: string;
  size_bytes: number;
  ready: boolean;
}

export type SampleKey =
  | "resume" | "invoice" | "memo" | "meme" | "readme" | "audio" | "excel"
  | "audio_voicemail" | "audio_meeting"
  | "video_announcement" | "video_screen";
