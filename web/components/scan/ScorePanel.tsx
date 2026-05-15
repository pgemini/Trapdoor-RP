"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Finding, ScanResult } from "@/lib/types";
import { SEVERITY_WEIGHT, cn, severityColor } from "@/lib/util";

export interface ScorePanelProps {
  result: ScanResult;
}

interface Contribution {
  finding: Finding;
  weight: number;
  conf: number;
  contribution: number; // probability mass added (0..1)
}

function computeContributions(findings: Finding[]): {
  rows: Contribution[];
  total: number;
} {
  let product = 1;
  const prelim: Contribution[] = [];
  findings.forEach((f) => {
    const weight = SEVERITY_WEIGHT[f.severity] ?? 0;
    const conf = Math.max(0, Math.min(1, f.confidence ?? 0));
    const factor = weight * conf;
    product *= 1 - factor;
    prelim.push({ finding: f, weight, conf, contribution: factor });
  });
  const total = 1 - product;
  // recompute marginal contribution = increase in risk when this finding is added
  let cum = 1;
  const rows: Contribution[] = [];
  // sort by impact desc for nicer display
  const sorted = [...prelim].sort(
    (a, b) => b.weight * b.conf - a.weight * a.conf,
  );
  sorted.forEach((c) => {
    const before = 1 - cum;
    cum *= 1 - c.weight * c.conf;
    const after = 1 - cum;
    rows.push({ ...c, contribution: after - before });
  });
  return { rows, total };
}

export function ScorePanel({ result }: ScorePanelProps) {
  const { rows, total } = useMemo(
    () => computeContributions(result.findings),
    [result.findings],
  );
  const pct = Math.round((result.risk_score ?? total) * 100);
  const clampedPct = Math.max(0, Math.min(100, pct));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-4">
      {/* Gauge */}
      <div className="rounded-lg border border-line bg-white/3 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-dim">
            risk score
          </div>
          <div
            className={cn(
              "font-mono text-2xl font-semibold",
              clampedPct >= 85
                ? "text-sev-danger"
                : clampedPct >= 35
                  ? "text-sev-warn"
                  : "text-sev-ok",
            )}
          >
            {clampedPct}%
          </div>
        </div>

        {/* Bar */}
        <div className="relative h-6 rounded-full bg-black/45 border border-line overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #43d59d 0%, #43d59d 30%, #ffb454 55%, #ff5d6c 90%, #ff5d6c 100%)",
              opacity: 0.85,
            }}
          />
          {/* Threshold ticks */}
          {[0, 35, 85, 100].map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 w-px bg-black/40"
              style={{ left: `${t}%` }}
              aria-hidden
            />
          ))}
          {/* Needle */}
          <motion.div
            initial={{ left: "0%" }}
            animate={{ left: `${clampedPct}%` }}
            transition={{ type: "spring", stiffness: 110, damping: 18, mass: 0.6 }}
            className="absolute top-[-3px] bottom-[-3px] w-[3px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.85)]"
            style={{ transform: "translateX(-50%)" }}
            aria-hidden
          />
        </div>

        {/* Tick labels */}
        <div className="relative mt-1.5 h-4 text-[10px] font-mono text-muted-dim">
          {[
            { v: 0, label: "0" },
            { v: 35, label: "35 review" },
            { v: 85, label: "85 block" },
            { v: 100, label: "100" },
          ].map((t) => (
            <span
              key={t.v}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${t.v}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <ThresholdCard label="pass" range="0 – 34" tone="ok" active={clampedPct < 35} />
          <ThresholdCard label="review" range="35 – 84" tone="warn" active={clampedPct >= 35 && clampedPct < 85} />
          <ThresholdCard label="block" range="85 – 100" tone="danger" active={clampedPct >= 85} />
        </div>
      </div>

      {/* Math card */}
      <div className="rounded-lg border border-line bg-white/3 p-4 flex flex-col">
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-dim mb-2">
          how this is computed
        </div>
        <pre className="font-mono text-[12.5px] text-white/90 bg-black/35 border border-line rounded-md p-3 leading-relaxed whitespace-pre-wrap">
{`risk = 1 − ∏ (1 − severity_weight × confidence)
weights: info 0.05 · low 0.20 · med 0.45 · high 0.75 · critical 0.95`}
        </pre>
        <div className="mt-3 text-[11px] font-mono uppercase tracking-wider text-muted-dim">
          contributions ({rows.length})
        </div>
        <div className="mt-1.5 flex-1 max-h-[260px] overflow-y-auto pr-1 space-y-1">
          {rows.length === 0 && (
            <div className="text-sm text-muted italic px-1 py-2">
              No findings — base risk is 0%.
            </div>
          )}
          {rows.map((row, i) => {
            const sevClass = severityColor(row.finding.severity);
            const delta = Math.round(row.contribution * 100);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.22 }}
                className="flex items-center gap-2 font-mono text-[11.5px] rounded-md border border-line bg-white/3 px-2 py-1"
              >
                <span className="text-white/90 truncate flex-1">
                  {row.finding.detector}
                  <span className={cn("mx-1.5", sevClass)}>·</span>
                  <span className={sevClass}>{row.finding.severity}</span>
                  <span className="text-muted-dim">
                    {" "}× conf {Math.round(row.conf * 100)}%
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0",
                    delta >= 30
                      ? "text-sev-danger"
                      : delta >= 10
                        ? "text-sev-warn"
                        : "text-sev-ok",
                  )}
                >
                  +{delta}%
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThresholdCard({
  label,
  range,
  tone,
  active,
}: {
  label: string;
  range: string;
  tone: "ok" | "warn" | "danger";
  active: boolean;
}) {
  const toneClass =
    tone === "ok"
      ? "border-sev-ok/40 text-sev-ok"
      : tone === "warn"
        ? "border-sev-warn/40 text-sev-warn"
        : "border-sev-danger/40 text-sev-danger";
  return (
    <div
      className={cn(
        "rounded-md border bg-white/3 px-2.5 py-1.5",
        toneClass,
        active ? "ring-1 ring-current/40 bg-current/8" : "opacity-60",
      )}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider">{label}</div>
      <div className="text-[11.5px] font-mono">{range}</div>
    </div>
  );
}

export default ScorePanel;
