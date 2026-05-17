"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, MinusCircle, X } from "lucide-react";
import type { Finding, ScanResult } from "@/lib/types";
import { cn, severityBg, severityColor } from "@/lib/util";

export interface DetectPanelProps {
  result: ScanResult;
}

interface DetectorMeta {
  key: string;
  label: string;
  description: string;
}

const DETECTORS: DetectorMeta[] = [
  { key: "pattern",         label: "pattern",         description: "Regex taxonomy: instruction overrides, exfil cues, system impostors." },
  { key: "unicode",         label: "unicode",         description: "Homoglyphs, tag-blocks, math-alphanumeric, suspicious script mixes." },
  { key: "invisible-text",  label: "invisible-text",  description: "Zero-width chars, white-on-white, off-canvas, opacity-0 spans." },
  { key: "metadata",        label: "metadata",        description: "Author, subject, comments, RIFF tags, EXIF strings." },
  { key: "steganography",   label: "steganography",   description: "LSB payloads, appended ZIPs, decoded base64 inside pixels." },
  { key: "encoding",        label: "encoding",        description: "Base64 / hex / URL-encoded blobs decoded + re-scanned for injection." },
  { key: "bidi",            label: "bidi",            description: "Bidirectional overrides + line separators (Trojan Source class)." },
  { key: "url",             label: "url",             description: "Homograph / punycode / IP / data: URI / shortener / credential params." },
  { key: "markup",          label: "markup",          description: "HTML / JS / SQL / template-injection inside OCR / transcript / metadata." },
  { key: "ai-foundry",      label: "ai-foundry",      description: "Azure AI Foundry content-safety verdict (when enabled)." },
];

type DetectorState = "scanning" | "clean" | "found" | "skipped";

interface DetectorRow {
  meta: DetectorMeta;
  state: DetectorState;
  findings: Finding[];
  detail: string;
}

function stageStatusFor(
  stages: ScanResult["stages"],
  detector: string,
): { status: "ok" | "warn" | "error" | "skipped"; detail: string } | null {
  const want = `detect:${detector}`;
  for (const s of stages) {
    if (!s?.name) continue;
    const n = s.name.toLowerCase();
    if (n === want || n.startsWith(want + ":") || n.endsWith(":" + detector) || n === detector) {
      return { status: s.status, detail: s.detail || "" };
    }
  }
  return null;
}

function severityRank(sev: string): number {
  return { info: 1, low: 2, med: 3, high: 4, critical: 5 }[sev as "info"] ?? 0;
}

export function DetectPanel({ result }: DetectPanelProps) {
  const rows = useMemo<DetectorRow[]>(() => {
    return DETECTORS.map((meta) => {
      const findings = result.findings
        .filter((f) => (f.detector || "").toLowerCase() === meta.key)
        .sort(
          (a, b) =>
            severityRank(b.severity) - severityRank(a.severity) ||
            b.confidence - a.confidence,
        );
      const stage = stageStatusFor(result.stages, meta.key);
      let state: DetectorState;
      if (stage?.status === "skipped") state = "skipped";
      else if (findings.length > 0 || stage?.status === "warn" || stage?.status === "error") {
        state = "found";
      } else state = "clean";
      return {
        meta,
        state,
        findings,
        detail: stage?.detail ?? (findings.length ? `${findings.length} match${findings.length === 1 ? "" : "es"}` : "no anomalies"),
      };
    });
  }, [result]);

  const [revealCount, setRevealCount] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Re-run the reveal cascade whenever the rows change, and auto-expand
  // every row that has findings so the cards are visible immediately.
  useEffect(() => {
    setRevealCount(0);
    setExpanded(new Set(rows.filter((r) => r.findings.length > 0).map((r) => r.meta.key)));
    const ids: number[] = [];
    rows.forEach((_, i) => {
      const id = window.setTimeout(() => {
        setRevealCount((c) => Math.max(c, i + 1));
      }, 320 + i * 200);
      ids.push(id);
    });
    return () => {
      ids.forEach(clearTimeout);
    };
  }, [rows]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const totalFindings = result.findings.length;

  return (
    <div className="space-y-4">
      {/* Detector chain — each found row is an accordion */}
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          const revealed = i < revealCount;
          const effective: DetectorState = revealed ? row.state : "scanning";
          const isExpandable = effective === "found" && row.findings.length > 0;
          const isOpen = isExpandable && expanded.has(row.meta.key);

          return (
            <motion.div
              key={row.meta.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className={cn(
                "rounded-lg border overflow-hidden",
                effective === "found"
                  ? "border-sev-danger/40 bg-sev-danger/8 shadow-[inset_3px_0_0_rgba(255,93,108,0.6)]"
                  : effective === "clean"
                    ? "border-sev-ok/30 bg-sev-ok/6"
                    : effective === "skipped"
                      ? "border-line bg-white/2 opacity-60"
                      : "border-accent-blue/40 bg-accent-blue/8",
              )}
            >
              <button
                type="button"
                disabled={!isExpandable}
                onClick={() => isExpandable && toggle(row.meta.key)}
                aria-expanded={isOpen}
                aria-controls={`det-panel-${row.meta.key}`}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left",
                  isExpandable && "cursor-pointer hover:bg-sev-danger/12 transition-colors",
                  !isExpandable && "cursor-default",
                )}
              >
                <DetectorIndicator state={effective} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[12.5px] text-white">
                      {row.meta.label}
                    </span>
                    <span className="text-[10.5px] uppercase tracking-wider font-mono text-muted-dim">
                      {effective === "scanning"
                        ? "scanning…"
                        : effective === "found"
                          ? `${row.findings.length} hit${row.findings.length === 1 ? "" : "s"}`
                          : effective === "clean"
                            ? "clean"
                            : "skipped"}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-muted truncate">
                    {effective === "scanning" ? row.meta.description : row.detail || row.meta.description}
                  </div>
                </div>
                <StateGlyph state={effective} count={row.findings.length} />
                {isExpandable && (
                  <ChevronRight
                    size={16}
                    className={cn(
                      "shrink-0 text-sev-danger transition-transform duration-200",
                      isOpen && "rotate-90",
                    )}
                  />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`det-panel-${row.meta.key}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-dashed border-line/60 px-3 py-3 space-y-2 bg-black/15">
                      {row.findings.map((f, j) => (
                        <FindingCard key={`${row.meta.key}-${j}`} f={f} idx={j} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-dim px-0.5 pt-1">
        {totalFindings === 0
          ? "no findings — file is clean"
          : `${totalFindings} finding${totalFindings === 1 ? "" : "s"} across ${rows.filter((r) => r.findings.length > 0).length} detector${rows.filter((r) => r.findings.length > 0).length === 1 ? "" : "s"} · click any row to inspect`}
      </div>
    </div>
  );
}

function DetectorIndicator({ state }: { state: DetectorState }) {
  if (state === "scanning") {
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-70 animate-ping" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-blue" />
      </span>
    );
  }
  if (state === "clean") {
    return <span className="h-2.5 w-2.5 rounded-full bg-sev-ok shrink-0" />;
  }
  if (state === "found") {
    return <span className="h-2.5 w-2.5 rounded-full bg-sev-danger shrink-0" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-muted-dim shrink-0" />;
}

function StateGlyph({ state, count }: { state: DetectorState; count: number }) {
  if (state === "scanning") return null;
  if (state === "clean") return <Check size={15} className="text-sev-ok shrink-0" />;
  if (state === "found")
    return (
      <span className="inline-flex items-center gap-1 text-sev-danger shrink-0">
        <X size={15} />
        <span className="text-[11px] font-mono">{count}</span>
      </span>
    );
  return <MinusCircle size={14} className="text-muted-dim shrink-0" />;
}

function FindingCard({ f, idx }: { f: Finding; idx: number }) {
  const sevTone = severityColor(f.severity);
  const sevBg = severityBg(f.severity);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03, duration: 0.22 }}
      className="rounded-lg border border-line bg-white/3 px-3.5 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10.5px] font-mono uppercase tracking-wider",
            sevBg,
            sevTone,
            "border-current/30",
          )}
        >
          {f.severity}
        </span>
        <span className="font-mono text-[11.5px] text-white/85">
          {f.category}
        </span>
        <span className="text-[10.5px] font-mono text-muted">
          conf {Math.round((f.confidence ?? 0) * 100)}%
        </span>
        <span className="text-[10.5px] font-mono text-muted-dim ml-auto">
          {f.detector}
        </span>
      </div>
      <div className="mt-2 text-[13px] text-white/90 leading-snug">
        {f.message}
      </div>
      {f.evidence && (
        <pre className="mt-2 rounded-md border border-line bg-black/35 font-mono text-[11.5px] text-white/85 p-2 max-h-[140px] overflow-y-auto whitespace-pre-wrap break-words">
          {f.evidence}
        </pre>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-mono uppercase tracking-wider text-muted-dim">
        <span>
          location: <span className="text-muted normal-case">{f.location || "—"}</span>
        </span>
        <span>
          sanitize:{" "}
          <span
            className={cn(
              "normal-case",
              f.sanitize_action === "discard"
                ? "text-sev-danger"
                : f.sanitize_action === "quote"
                  ? "text-sev-warn"
                  : f.sanitize_action === "strip"
                    ? "text-accent-blue"
                    : "text-muted",
            )}
          >
            {f.sanitize_action}
          </span>
        </span>
      </div>
    </motion.div>
  );
}

export default DetectPanel;
