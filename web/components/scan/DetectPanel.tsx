"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, MinusCircle } from "lucide-react";
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
  { key: "unicode",         label: "unicode",         description: "Homoglyphs, tag-blocks, bidi controls, suspicious script mixes." },
  { key: "invisible-text",  label: "invisible-text",  description: "Zero-width chars, white-on-white, off-canvas, opacity-0 spans." },
  { key: "metadata",        label: "metadata",        description: "Author, subject, comments, RIFF tags, EXIF strings." },
  { key: "steganography",   label: "steganography",   description: "LSB payloads, appended ZIPs, decoded base64 inside pixels." },
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
      const findings = result.findings.filter(
        (f) => (f.detector || "").toLowerCase() === meta.key,
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

  useEffect(() => {
    setRevealCount(0);
    const ids: number[] = [];
    rows.forEach((_, i) => {
      const id = window.setTimeout(() => {
        setRevealCount((c) => Math.max(c, i + 1));
      }, 320 + i * 280);
      ids.push(id);
    });
    return () => {
      ids.forEach(clearTimeout);
    };
  }, [rows]);

  const sortedFindings = useMemo(() => {
    return [...result.findings].sort(
      (a, b) =>
        severityRank(b.severity) - severityRank(a.severity) ||
        b.confidence - a.confidence,
    );
  }, [result.findings]);

  return (
    <div className="space-y-5">
      {/* Detector chain */}
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          const revealed = i < revealCount;
          const effective: DetectorState = revealed ? row.state : "scanning";
          return (
            <motion.div
              key={row.meta.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={cn(
                "rounded-lg border px-3 py-2 flex items-center gap-3",
                effective === "found"
                  ? "border-sev-danger/40 bg-sev-danger/8"
                  : effective === "clean"
                    ? "border-sev-ok/30 bg-sev-ok/6"
                    : effective === "skipped"
                      ? "border-line bg-white/2 opacity-60"
                      : "border-accent-blue/40 bg-accent-blue/8",
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
            </motion.div>
          );
        })}
      </div>

      {/* Findings list */}
      {sortedFindings.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-dim px-0.5">
            findings ({sortedFindings.length})
          </div>
          <AnimatePresence initial={false}>
            {sortedFindings.map((f, i) => (
              <FindingCard key={`${f.detector}-${i}-${f.message}`} f={f} idx={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.035, duration: 0.28 }}
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
