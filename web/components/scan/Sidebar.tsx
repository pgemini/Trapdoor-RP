"use client";

import { ChangeEvent, DragEvent, useCallback, useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  ClipboardPaste,
  History,
  Copy,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Trash2,
  Play,
  ShieldAlert,
  FileSpreadsheet,
  FileImage,
  FileAudio,
  FileType,
  Sparkles,
} from "lucide-react";
import type { SampleKey, ScanResult, Verdict } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/util";

// Matches the shape produced by lib/useScanJourney.ts
export interface HistoryEntry {
  id: string;
  filename: string;
  verdict: Verdict;
  risk: number;
  when: number;
  payload: ScanResult;
}

export interface SidebarProps {
  onSelectSample: (key: SampleKey) => void;
  onSelectFile: (file: File) => void;
  onSelectText: (text: string) => void;
  onScan: () => void | Promise<void>;
  result?: ScanResult | null;
  lastSource?: string;
  activeSample?: SampleKey;
  history: HistoryEntry[];
  onReplay: (entry: HistoryEntry) => void | Promise<void>;
  onClearHistory: () => void;
}

interface SampleButton {
  key: SampleKey;
  name: string;
  desc: string;
  tag: string;
  tagTone: "blue" | "warn" | "danger" | "ok" | "neutral";
  icon: React.ReactNode;
}

const SAMPLES: SampleButton[] = [
  {
    key: "resume",
    name: "Hidden résumé",
    desc: "White-on-white instructions in a PDF résumé.",
    tag: "PDF",
    tagTone: "danger",
    icon: <FileText size={14} />,
  },
  {
    key: "invoice",
    name: "OCR invoice",
    desc: "Faint OCR overlay rewrites payment details.",
    tag: "PNG",
    tagTone: "warn",
    icon: <FileImage size={14} />,
  },
  {
    key: "memo",
    name: "DOCX memo",
    desc: "Injection hidden inside metadata subject + comments.",
    tag: "DOCX",
    tagTone: "blue",
    icon: <FileText size={14} />,
  },
  {
    key: "meme",
    name: "Steganographic meme",
    desc: "Prompt smuggled via least-significant-bit channel.",
    tag: "PNG",
    tagTone: "warn",
    icon: <FileImage size={14} />,
  },
  {
    key: "readme",
    name: "ZWSP README",
    desc: "Zero-width chars + HTML comment payload.",
    tag: "MD",
    tagTone: "neutral",
    icon: <FileType size={14} />,
  },
  {
    key: "audio",
    name: "WAV with ICMT",
    desc: "RIFF metadata comment carries the injection.",
    tag: "WAV",
    tagTone: "ok",
    icon: <FileAudio size={14} />,
  },
  {
    key: "excel",
    name: "Spreadsheet override",
    desc: "Row + cell comment instruct the model to zero totals.",
    tag: "XLSX",
    tagTone: "ok",
    icon: <FileSpreadsheet size={14} />,
  },
];

const PATTERN_CATEGORIES: { name: string; desc: string }[] = [
  { name: "instruction.override",     desc: "Phrases that try to overwrite earlier instructions." },
  { name: "system.impersonation",     desc: "Claims of being the system, assistant, or admin role." },
  { name: "exfiltration.cue",         desc: "Requests to leak secrets, keys, or context to a third party." },
  { name: "tool.hijack",              desc: "Forces use of a specific tool, URL, or function call." },
  { name: "policy.bypass",            desc: "Jailbreaks, DAN-style framings, and refusal sidesteps." },
  { name: "credential.harvest",       desc: "Asks for passwords, API tokens, or env variables." },
  { name: "code.injection",           desc: "Embedded shell, SQL, or eval-style payloads." },
  { name: "url.suspicious",           desc: "Shorteners, IDN homographs, and exfil destinations." },
  { name: "obfuscation.unicode",      desc: "Bidi, tag-blocks, homoglyphs, and odd Unicode mixes." },
  { name: "obfuscation.invisible",    desc: "Zero-width, opacity-0, white-on-white, off-canvas spans." },
  { name: "metadata.injection",       desc: "Hostile EXIF, RIFF INFO, DOCX core properties." },
  { name: "steganography.signal",     desc: "LSB payloads, appended archives, decoded base64 blobs." },
  { name: "social.engineering",       desc: "Authority pressure, urgency, and persona-spoofing tactics." },
];

const VERDICT_TONE: Record<Verdict, "ok" | "warn" | "danger"> = {
  pass: "ok",
  review: "warn",
  block: "danger",
};

export function Sidebar({
  onSelectSample,
  onSelectFile,
  onSelectText,
  onScan,
  result,
  lastSource,
  activeSample,
  history,
  onReplay,
  onClearHistory,
}: SidebarProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pasted, setPasted] = useState("");
  const [patternsOpen, setPatternsOpen] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sanitized = result?.sanitized_context ?? "";

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onSelectFile(f);
    // reset so the same file can be re-selected
    if (e.target) e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onSelectFile(f);
    },
    [onSelectFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleCopy = async () => {
    if (!sanitized) return;
    try {
      await navigator.clipboard.writeText(sanitized);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 1400);
    } catch {
      setCopyOk(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(result.filename || "scan").replace(/[^a-z0-9._-]/gi, "_")}-${result.scan_id || "result"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const submitText = () => {
    const trimmed = pasted.trim();
    if (!trimmed) return;
    onSelectText(trimmed);
  };

  const recent = useMemo(() => history.slice(0, 6), [history]);

  return (
    <aside
      className={cn(
        "w-full lg:w-[340px] shrink-0 lg:sticky lg:top-4 lg:self-start",
        "lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto",
        "space-y-4 pb-6",
      )}
    >
      {/* Upload */}
      <Section title="Upload" icon={<UploadCloud size={13} />}>
        <label
          htmlFor="trapdoor-file-input"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDragEnter={handleDragOver}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2",
            "rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer",
            "transition-colors duration-200 text-center",
            dragOver
              ? "border-accent-blue bg-accent-blue/8"
              : "border-line-strong bg-white/3 hover:border-white/25 hover:bg-white/5",
          )}
        >
          <UploadCloud
            size={22}
            className={dragOver ? "text-accent-blue" : "text-muted"}
          />
          <div className="text-[13px] text-white/90 font-medium">
            Drop a file or click to browse
          </div>
          <div className="text-[11px] text-muted">
            PDF, DOCX, XLSX, PNG, JPG, WAV, MD, TXT…
          </div>
          <input
            ref={fileInputRef}
            id="trapdoor-file-input"
            type="file"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>
        <Button
          variant="primary"
          onClick={onScan}
          className="w-full mt-3"
        >
          <Play size={14} />
          Run scan
        </Button>
        {result && (
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-muted-dim">
            <span className="truncate mr-2" title={result.filename}>
              {result.filename}
            </span>
            <Pill tone={VERDICT_TONE[result.verdict]} className="text-[10.5px] px-2 py-0.5">
              {result.verdict}
            </Pill>
          </div>
        )}
      </Section>

      {/* Demo attacks */}
      <Section title="Demo attacks" icon={<ShieldAlert size={13} />}>
        <div className="space-y-1.5">
          {SAMPLES.map((s) => {
            const active = activeSample === s.key;
            return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelectSample(s.key)}
              className={cn(
                "w-full text-left rounded-lg border bg-white/3 px-3 py-2",
                "hover:bg-white/6 transition-colors",
                "flex items-start gap-2.5",
                active
                  ? "border-accent-blue/55 ring-1 ring-accent-blue/35 bg-accent-blue/8"
                  : "border-line hover:border-line-strong",
              )}
            >
              <div className="mt-0.5 text-muted shrink-0">{s.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-white/90 font-medium truncate">
                    {s.name}
                  </span>
                  <Badge tone={s.tagTone} className="shrink-0">
                    {s.tag}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted leading-snug mt-0.5">
                  {s.desc}
                </div>
              </div>
            </button>
            );
          })}
        </div>
      </Section>

      {/* Paste text */}
      <Section title="Paste text" icon={<ClipboardPaste size={13} />}>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste suspicious text here…"
          rows={5}
          className={cn(
            "w-full rounded-lg border border-line bg-black/35 px-3 py-2",
            "font-mono text-[12.5px] text-white/90 placeholder:text-muted-dim",
            "focus:outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/40",
            "resize-y min-h-[100px]",
          )}
        />
        <Button
          variant="ghost"
          onClick={submitText}
          disabled={!pasted.trim()}
          className="w-full mt-2"
        >
          <Sparkles size={13} />
          Scan text
        </Button>
      </Section>

      {/* Recent */}
      <Section
        title="Recent"
        icon={<History size={13} />}
        right={
          history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[10.5px] font-mono uppercase tracking-wider text-muted hover:text-sev-danger transition-colors inline-flex items-center gap-1"
            >
              <Trash2 size={11} />
              clear
            </button>
          )
        }
      >
        {recent.length === 0 ? (
          <div className="text-[11.5px] text-muted italic px-1 py-1">
            No scans yet — your last 6 will appear here.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {recent.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => void onReplay(h)}
                className={cn(
                  "w-full text-left rounded-md border border-line bg-white/3 px-2.5 py-1.5",
                  "hover:border-line-strong hover:bg-white/6 transition-colors",
                  "flex items-center gap-2",
                )}
                title={`${h.filename} · ${h.payload?.modality ?? ""}`}
              >
                <Pill
                  tone={VERDICT_TONE[h.verdict]}
                  className="text-[9.5px] px-1.5 py-0 shrink-0"
                >
                  {h.verdict}
                </Pill>
                <span className="font-mono text-[11.5px] text-white/85 truncate flex-1">
                  {h.filename}
                </span>
                <span className="text-[10px] font-mono text-muted-dim shrink-0">
                  {Math.round((h.risk ?? 0) * 100)}%
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Tools */}
      <Section title="Tools" icon={<Download size={13} />}>
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={!sanitized}
            onClick={handleCopy}
            className={cn(
              "w-full inline-flex items-center justify-between gap-2",
              "rounded-md border border-line bg-white/3 px-3 py-2 text-[12.5px] text-white/90",
              "hover:border-line-strong hover:bg-white/6 transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Copy size={13} className="text-accent-blue" />
              Copy sanitized
            </span>
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-muted-dim">
              {copyOk ? "copied" : sanitized ? `${sanitized.length} ch` : "—"}
            </span>
          </button>
          <button
            type="button"
            disabled={!result}
            onClick={handleDownload}
            className={cn(
              "w-full inline-flex items-center justify-between gap-2",
              "rounded-md border border-line bg-white/3 px-3 py-2 text-[12.5px] text-white/90",
              "hover:border-line-strong hover:bg-white/6 transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Download size={13} className="text-accent-blue" />
              Download JSON
            </span>
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-muted-dim">
              {result ? "scan_id" : "—"}
            </span>
          </button>
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              "w-full inline-flex items-center justify-between gap-2",
              "rounded-md border border-line bg-white/3 px-3 py-2 text-[12.5px] text-white/90",
              "hover:border-line-strong hover:bg-white/6 transition-colors",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <ExternalLink size={13} className="text-accent-blue" />
              API docs
            </span>
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-muted-dim">
              /api/docs
            </span>
          </a>
          {lastSource && (
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-muted-dim text-right pt-1">
              source: {lastSource}
            </div>
          )}
        </div>
      </Section>

      {/* Patterns */}
      <Section
        title="Patterns"
        icon={<FileText size={13} />}
        collapsible
        open={patternsOpen}
        onToggle={() => setPatternsOpen((v) => !v)}
      >
        {patternsOpen && (
          <div className="space-y-1.5">
            <div className="text-[10.5px] text-muted leading-snug px-0.5 pb-1">
              13 internal taxonomy buckets. Regex bodies live server-side.
            </div>
            {PATTERN_CATEGORIES.map((p, i) => (
              <div
                key={p.name}
                className="rounded-md border border-line bg-white/3 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-dim w-5 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[11.5px] text-white/90 truncate">
                    {p.name}
                  </span>
                </div>
                <div className="text-[10.5px] text-muted leading-snug mt-0.5 pl-7">
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </aside>
  );
}

function Section({
  title,
  icon,
  children,
  right,
  collapsible,
  open,
  onToggle,
}: {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  right?: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <section className="glass rounded-xl overflow-hidden">
      <header
        className={cn(
          "px-3.5 py-2.5 border-b border-line flex items-center justify-between gap-2",
          collapsible && "cursor-pointer select-none hover:bg-white/3",
        )}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center gap-2">
          {collapsible ? (
            open ? (
              <ChevronDown size={14} className="text-muted" />
            ) : (
              <ChevronRight size={14} className="text-muted" />
            )
          ) : (
            <span className="text-muted">{icon}</span>
          )}
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/85">
            {title}
          </span>
        </div>
        {right}
      </header>
      <div className="px-3.5 py-3">{children}</div>
    </section>
  );
}

export default Sidebar;
