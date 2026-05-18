"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Copy, Check } from "lucide-react";
import { ATTACKS } from "@/lib/attackCatalog";
import { cn, severityBg, severityColor } from "@/lib/util";

const SEVERITY_ORDER = { critical: 0, high: 1, med: 2, low: 3, info: 4 } as const;

export function AttackCatalogInline() {
  const [filter, setFilter] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const detectors = Array.from(
    new Set(ATTACKS.flatMap((a) => a.detectors)),
  ).sort();

  const visible = ATTACKS
    .filter((a) => filter === null || a.detectors.includes(filter))
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
    );

  const copy = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-dim mr-2">
          Filter by detector:
        </span>
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-mono transition-colors",
            filter === null
              ? "border-accent-blue/60 bg-accent-blue/10 text-white"
              : "border-line bg-white/[0.02] text-muted hover:border-white/15",
          )}
        >
          all · {ATTACKS.length}
        </button>
        {detectors.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d === filter ? null : d)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-mono transition-colors",
              filter === d
                ? "border-accent-blue/60 bg-accent-blue/10 text-white"
                : "border-line bg-white/[0.02] text-muted hover:border-white/15",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((a, i) => {
          const sevBg = severityBg(a.severity);
          const sevTone = severityColor(a.severity);
          const isCopied = copied === a.id;
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.03 }}
              className="rounded-xl border border-line bg-white/[0.02] p-5 hover:border-white/15 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <ShieldAlert size={16} className="text-accent-blue shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h4 className="text-[15px] font-semibold tracking-tight text-white">
                      {a.name}
                    </h4>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider",
                        sevBg, sevTone, "border-current/30",
                      )}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">
                    {a.description}
                  </p>
                </div>
              </div>

              <div className="relative rounded-md border border-line bg-black/35 mt-3 mb-3 group">
                <pre className="font-mono text-[11px] text-white/85 p-3 pr-10 max-h-[110px] overflow-y-auto whitespace-pre-wrap break-words">
                  {a.exampleText}
                </pre>
                <button
                  type="button"
                  onClick={() => copy(a.id, a.exampleText)}
                  className="absolute top-2 right-2 inline-flex items-center justify-center rounded p-1 text-muted-dim hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Copy example to clipboard"
                >
                  {isCopied ? <Check size={13} className="text-sev-ok" /> : <Copy size={13} />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono">
                <span className="text-muted-dim uppercase tracking-wider">caught by:</span>
                {a.detectors.map((d) => (
                  <code key={d} className="rounded bg-white/[0.04] px-1.5 py-0.5 text-accent-blue">
                    {d}
                  </code>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-12 text-muted text-sm">
          No attacks match the current filter.
        </div>
      )}
    </div>
  );
}

export default AttackCatalogInline;
