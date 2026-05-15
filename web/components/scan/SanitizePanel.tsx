"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Quote, Ban } from "lucide-react";
import type { ExtractedFragment, Finding, ScanResult } from "@/lib/types";
import { cn } from "@/lib/util";

export interface SanitizePanelProps {
  result: ScanResult;
  fragments: ExtractedFragment[];
  findingsByLoc: Map<string, Finding[]>;
}

type Fate = "forwarded" | "quoted" | "blocked";

interface FateRow {
  fragment: ExtractedFragment;
  fate: Fate;
  reason: string;
  label: string;
}

function isInvisible(f: ExtractedFragment): boolean {
  const v = f.attrs?.visibility;
  return typeof v === "string" && v.toLowerCase() === "invisible";
}

function findingsFor(
  frag: ExtractedFragment,
  byLoc: Map<string, Finding[]>,
): Finding[] {
  const direct = byLoc.get(frag.source) ?? [];
  if (direct.length) return direct;
  const out: Finding[] = [];
  byLoc.forEach((arr, key) => {
    if (frag.source && (key.startsWith(frag.source) || frag.source.startsWith(key))) {
      out.push(...arr);
    }
  });
  return out;
}

function decideFate(
  frag: ExtractedFragment,
  findings: Finding[],
): { fate: Fate; reason: string; label: string } {
  const kind = (frag.kind || "").toLowerCase();
  const flagged = findings.length > 0;

  if (isInvisible(frag)) {
    return { fate: "blocked", reason: "invisible content", label: "invisible" };
  }
  if (kind === "comment") {
    return { fate: "blocked", reason: "comment payload", label: "comment" };
  }
  if (kind === "decoded") {
    return { fate: "blocked", reason: "decoded steganographic payload", label: "decoded" };
  }
  if (kind === "metadata") {
    if (flagged) {
      return { fate: "blocked", reason: "flagged metadata", label: `metadata.${frag.source.replace(/^metadata\.?/, "") || "field"}` };
    }
    return {
      fate: "forwarded",
      reason: "metadata clean",
      label: `[metadata.${frag.source.replace(/^metadata\.?/, "") || "field"}]`,
    };
  }
  if (kind === "ocr") {
    return { fate: "quoted", reason: "OCR text quoted", label: "ocr" };
  }
  if (flagged) {
    return { fate: "quoted", reason: "flagged content quoted", label: kind || "text" };
  }
  return { fate: "forwarded", reason: "passed checks", label: kind || "text" };
}

function previewText(text: string, n = 96): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "(empty)";
  return t.length > n ? t.slice(0, n) + "…" : t;
}

const FATE_STYLES: Record<Fate, { chip: string; row: string; icon: React.ReactNode; label: string }> = {
  forwarded: {
    chip: "border-sev-ok/45 bg-sev-ok/12 text-sev-ok",
    row: "border-sev-ok/25 bg-sev-ok/4",
    icon: <Check size={13} />,
    label: "forwarded",
  },
  quoted: {
    chip: "border-sev-warn/45 bg-sev-warn/12 text-sev-warn",
    row: "border-sev-warn/25 bg-sev-warn/4",
    icon: <Quote size={12} />,
    label: "quoted",
  },
  blocked: {
    chip: "border-sev-danger/50 bg-sev-danger/12 text-sev-danger",
    row: "border-sev-danger/30 bg-sev-danger/4",
    icon: <Ban size={13} />,
    label: "blocked",
  },
};

export function SanitizePanel({
  result,
  fragments,
  findingsByLoc,
}: SanitizePanelProps) {
  const rows = useMemo<FateRow[]>(() => {
    return fragments.map((frag) => {
      const findings = findingsFor(frag, findingsByLoc);
      const d = decideFate(frag, findings);
      return { fragment: frag, fate: d.fate, reason: d.reason, label: d.label };
    });
  }, [fragments, findingsByLoc]);

  const counts = useMemo(() => {
    const c = { forwarded: 0, quoted: 0, blocked: 0 };
    rows.forEach((r) => {
      c[r.fate]++;
    });
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <SummaryChip fate="forwarded" count={counts.forwarded} />
        <SummaryChip fate="quoted" count={counts.quoted} />
        <SummaryChip fate="blocked" count={counts.blocked} />
      </div>

      {/* Diff: before / after */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-white/3 overflow-hidden">
          <div className="px-3 py-2 border-b border-line flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              before · raw fragments
            </span>
            <span className="text-[10.5px] font-mono text-muted-dim">
              {rows.length} item{rows.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="p-2 space-y-1.5 max-h-[360px] overflow-y-auto">
            {rows.length === 0 && (
              <div className="text-sm text-muted italic px-2 py-3">
                No fragments to compare.
              </div>
            )}
            {rows.map((r, i) => {
              const style = FATE_STYLES[r.fate];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.22 }}
                  className={cn("rounded-md border px-2.5 py-2", style.row)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5",
                        "text-[10px] font-mono uppercase tracking-wider",
                        style.chip,
                      )}
                    >
                      {style.icon}
                      {style.label}
                    </span>
                    <span className="text-[10.5px] font-mono text-muted-dim truncate">
                      {r.fragment.source || r.label}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "font-mono text-[11.5px] break-words whitespace-pre-wrap leading-snug",
                      r.fate === "blocked"
                        ? "line-through text-sev-danger/85"
                        : "text-white/85",
                    )}
                  >
                    {previewText(r.fragment.text, 220)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white/3 overflow-hidden">
          <div className="px-3 py-2 border-b border-line flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              after · sanitized context
            </span>
            <span className="text-[10.5px] font-mono text-muted-dim">
              {(result.sanitized_context ?? "").length} chars
            </span>
          </div>
          <pre className="m-0 p-3 font-mono text-[12px] text-white/90 leading-relaxed whitespace-pre-wrap break-words max-h-[360px] overflow-y-auto">
            {result.sanitized_context && result.sanitized_context.length > 0
              ? result.sanitized_context
              : "(empty — nothing was forwarded to the model)"}
          </pre>
        </div>
      </div>

      {/* Blocked spans */}
      {result.blocked_spans && result.blocked_spans.length > 0 && (
        <div className="rounded-lg border border-sev-danger/40 bg-sev-danger/8">
          <div className="px-3 py-2 border-b border-sev-danger/30">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sev-danger">
              blocked spans · {result.blocked_spans.length}
            </span>
          </div>
          <ul className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
            {result.blocked_spans.map((span, i) => (
              <li
                key={i}
                className="font-mono text-[11.5px] text-sev-danger/95 bg-black/30 border border-sev-danger/25 rounded px-2 py-1 break-words whitespace-pre-wrap"
              >
                {span}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryChip({ fate, count }: { fate: Fate; count: number }) {
  const style = FATE_STYLES[fate];
  const symbol =
    fate === "forwarded" ? "✓" : fate === "quoted" ? "❝" : "✕";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5",
        "font-mono text-[12px]",
        style.chip,
      )}
    >
      <span aria-hidden className="text-sm leading-none">
        {symbol}
      </span>
      <span className="font-semibold">{count}</span>
      <span className="opacity-80 uppercase tracking-wider text-[10.5px]">
        {style.label}
      </span>
    </div>
  );
}

export default SanitizePanel;
