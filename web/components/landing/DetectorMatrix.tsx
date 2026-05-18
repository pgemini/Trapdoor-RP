"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ATTACKS } from "@/lib/attackCatalog";
import { cn, severityColor } from "@/lib/util";

// Detectors in pipeline order (matches backend/app/detectors.all_detectors())
const DETECTORS = [
  { key: "pattern",        short: "pat",  layer: "h" as const },
  { key: "unicode",        short: "uni",  layer: "h" as const },
  { key: "invisible-text", short: "inv",  layer: "h" as const },
  { key: "metadata",       short: "meta", layer: "h" as const },
  { key: "steganography",  short: "stg",  layer: "h" as const },
  { key: "encoding",       short: "enc",  layer: "h" as const },
  { key: "bidi",           short: "bdi",  layer: "h" as const },
  { key: "url",            short: "url",  layer: "h" as const },
  { key: "markup",         short: "mkp",  layer: "h" as const },
  { key: "ai-foundry",     short: "ai",   layer: "ai" as const },
];

const SEV_RANK = { critical: 4, high: 3, med: 2, low: 1, info: 0 } as const;

export function DetectorMatrix() {
  // Hover/select state — by detector OR by attack
  const [sel, setSel] = useState<{ kind: "detector" | "attack"; key: string } | null>(null);

  // Build the cell map once: catches[attackId][detectorKey] = true
  const catches = useMemo(() => {
    const m: Record<string, Record<string, boolean>> = {};
    for (const a of ATTACKS) {
      m[a.id] = {};
      for (const d of a.detectors) m[a.id][d] = true;
    }
    return m;
  }, []);

  // Sort attacks by severity (critical first), then by name
  const sortedAttacks = useMemo(
    () => [...ATTACKS].sort(
      (a, b) =>
        (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0)
        || a.name.localeCompare(b.name),
    ),
    [],
  );

  // For each detector, count how many attacks it catches
  const detectorTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const d of DETECTORS) t[d.key] = 0;
    for (const a of ATTACKS) for (const k of a.detectors) t[k] = (t[k] ?? 0) + 1;
    return t;
  }, []);

  const isHighlightedDetector = (k: string) =>
    !sel
      ? false
      : sel.kind === "detector"
      ? sel.key === k
      : catches[sel.key]?.[k];

  const isHighlightedAttack = (id: string) =>
    !sel
      ? false
      : sel.kind === "attack"
      ? sel.key === id
      : catches[id]?.[sel.key];

  const cellLit = (attackId: string, detKey: string) =>
    !!catches[attackId]?.[detKey];

  const cellHighlighted = (attackId: string, detKey: string) => {
    if (!sel) return cellLit(attackId, detKey);
    if (sel.kind === "detector") return sel.key === detKey && cellLit(attackId, detKey);
    return sel.key === attackId && cellLit(attackId, detKey);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-mono uppercase tracking-[0.15em] text-muted">
          Detector ↔ Attack connections
        </h3>
        <div className="text-[11px] font-mono text-muted-dim">
          {sel ? (
            <button
              type="button"
              onClick={() => setSel(null)}
              className="hover:text-white transition-colors"
            >
              clear selection ✕
            </button>
          ) : (
            <span>hover or click any row or column to highlight its connections</span>
          )}
        </div>
      </div>

      {/* The matrix */}
      <div className="rounded-xl border border-line bg-white/[0.015] p-3 md:p-5 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[12px]">
          {/* Detector column headers */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-bg-elevated/90 backdrop-blur text-left pl-2 pr-3 pb-3 text-[11px] font-mono uppercase tracking-wider text-muted-dim font-normal">
                Attack ↓ &nbsp; / &nbsp; Detector →
              </th>
              {DETECTORS.map(d => {
                const active = sel?.kind === "detector" && sel.key === d.key;
                const dim = sel && !isHighlightedDetector(d.key);
                return (
                  <th
                    key={d.key}
                    onMouseEnter={() => setSel({ kind: "detector", key: d.key })}
                    onMouseLeave={() => setSel(null)}
                    onClick={() =>
                      setSel(prev =>
                        prev?.kind === "detector" && prev.key === d.key
                          ? null
                          : { kind: "detector", key: d.key },
                      )
                    }
                    className={cn(
                      "px-2 pb-3 font-normal text-center cursor-pointer transition-opacity duration-150",
                      "select-none",
                      dim && "opacity-35",
                    )}
                  >
                    <div className={cn(
                      "rounded-md py-1.5 px-1 transition-colors",
                      active
                        ? d.layer === "ai" ? "bg-accent-purple/20 text-white" : "bg-accent-blue/20 text-white"
                        : d.layer === "ai" ? "text-accent-purple" : "text-muted",
                    )}>
                      <div className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                        {d.short}
                      </div>
                      <div className="font-mono text-[9.5px] text-muted-dim mt-0.5">
                        {detectorTotals[d.key] ?? 0}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sortedAttacks.map(a => {
              const active = sel?.kind === "attack" && sel.key === a.id;
              const dim = sel && !isHighlightedAttack(a.id);
              const sevColor = severityColor(a.severity);
              return (
                <tr
                  key={a.id}
                  onMouseEnter={() => setSel({ kind: "attack", key: a.id })}
                  onMouseLeave={() => setSel(null)}
                  className={cn(
                    "transition-opacity duration-150",
                    dim && "opacity-35",
                  )}
                >
                  <th
                    scope="row"
                    onClick={() =>
                      setSel(prev =>
                        prev?.kind === "attack" && prev.key === a.id
                          ? null
                          : { kind: "attack", key: a.id },
                      )
                    }
                    className={cn(
                      "sticky left-0 z-10 bg-bg-elevated/90 backdrop-blur",
                      "text-left pl-2 pr-3 py-1.5 font-normal whitespace-nowrap cursor-pointer select-none",
                      "border-t border-line/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("w-1 h-1 rounded-full",
                        a.severity === "critical" ? "bg-sev-danger" :
                        a.severity === "high"     ? "bg-sev-danger" :
                        a.severity === "med"      ? "bg-sev-warn"   :
                        a.severity === "low"      ? "bg-accent-blue" : "bg-muted-dim",
                      )} />
                      <span className={cn(
                        "text-[12px] font-medium",
                        active ? "text-white" : "text-muted",
                      )}>
                        {a.name}
                      </span>
                      <span className={cn(
                        "ml-1 text-[9.5px] font-mono uppercase tracking-wider",
                        sevColor,
                      )}>
                        {a.severity}
                      </span>
                    </div>
                  </th>
                  {DETECTORS.map(d => {
                    const lit = cellLit(a.id, d.key);
                    const hot = cellHighlighted(a.id, d.key);
                    return (
                      <td
                        key={d.key}
                        className={cn(
                          "text-center align-middle border-t border-line/40",
                          "p-0",
                        )}
                      >
                        {lit && (
                          <span className="inline-flex items-center justify-center w-full py-1.5">
                            <motion.span
                              animate={{ scale: hot ? 1.25 : 1 }}
                              transition={{ duration: 0.15 }}
                              className={cn(
                                "block rounded-full",
                                hot ? "h-3 w-3 shadow-[0_0_10px_currentColor]" : "h-2 w-2",
                                d.layer === "ai" ? "bg-accent-purple text-accent-purple" : "bg-accent-blue text-accent-blue",
                                !sel ? "" : (hot ? "" : "opacity-40"),
                              )}
                            />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend / readout */}
      <div className="flex flex-wrap items-start justify-between gap-3 text-[11px]">
        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-muted-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-blue" /> heuristic detector catches it
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-purple" /> ai-foundry catches it
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-sev-danger" /> attack severity
          </span>
        </div>
        <div className="font-mono text-muted-dim text-right">
          {ATTACKS.length} attack categories &nbsp;·&nbsp; {DETECTORS.length} detectors &nbsp;·&nbsp;{" "}
          {ATTACKS.reduce((acc, a) => acc + a.detectors.length, 0)} connections
        </div>
      </div>

      {/* Selected attack/detector inline detail */}
      {sel && (
        <SelectionSummary
          sel={sel}
          attacks={sortedAttacks}
          detectors={DETECTORS}
        />
      )}
    </div>
  );
}

function SelectionSummary({
  sel, attacks, detectors,
}: {
  sel: { kind: "detector" | "attack"; key: string };
  attacks: typeof ATTACKS;
  detectors: typeof DETECTORS;
}) {
  if (sel.kind === "detector") {
    const d = detectors.find(x => x.key === sel.key);
    if (!d) return null;
    const caught = attacks.filter(a => a.detectors.includes(d.key));
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "rounded-lg border p-4 text-[12.5px]",
          d.layer === "ai"
            ? "border-accent-purple/40 bg-accent-purple/[0.05]"
            : "border-accent-blue/40 bg-accent-blue/[0.05]",
        )}
      >
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-dim mb-2">
          <span className={d.layer === "ai" ? "text-accent-purple" : "text-accent-blue"}>
            {d.key}
          </span>{" "}
          catches {caught.length} attack {caught.length === 1 ? "category" : "categories"}:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {caught.map(a => (
            <span key={a.id}
              className="rounded-md border border-line bg-white/[0.04] px-2 py-1 text-[11px] text-white">
              {a.name}
            </span>
          ))}
        </div>
      </motion.div>
    );
  }
  // attack selected
  const a = attacks.find(x => x.id === sel.key);
  if (!a) return null;
  const dets = detectors.filter(x => a.detectors.includes(x.key));
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-line p-4 text-[12.5px] bg-white/[0.02]"
    >
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-dim mb-2">
        <span className="text-white">{a.name}</span>{" "}
        is caught by {dets.length} {dets.length === 1 ? "detector" : "detectors"}:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {dets.map(d => (
          <span key={d.key}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-mono",
              d.layer === "ai"
                ? "border-accent-purple/40 bg-accent-purple/[0.08] text-accent-purple"
                : "border-accent-blue/40 bg-accent-blue/[0.08] text-accent-blue",
            )}>
            {d.key}
          </span>
        ))}
      </div>
      <p className="mt-2.5 text-muted leading-relaxed">{a.description}</p>
    </motion.div>
  );
}

export default DetectorMatrix;
