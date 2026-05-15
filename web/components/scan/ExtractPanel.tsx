"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ExtractedFragment, Finding } from "@/lib/types";
import { cn } from "@/lib/util";

export interface ExtractPanelProps {
  fragments: ExtractedFragment[];
  findingsByLoc: Map<string, Finding[]>;
}

type KindKey = "text" | "metadata" | "ocr" | "comment" | "decoded" | "other";

function kindOf(f: ExtractedFragment): KindKey {
  const k = (f.kind || "").toLowerCase();
  if (k === "text" || k === "metadata" || k === "ocr" || k === "comment" || k === "decoded") {
    return k;
  }
  return "other";
}

const KIND_CLASSES: Record<KindKey, string> = {
  text:     "bg-accent-blue/12 border-accent-blue/40 text-accent-blue",
  metadata: "bg-accent-purple/15 border-accent-purple/40 text-[#bfa9ff]",
  ocr:      "bg-sev-ok/12 border-sev-ok/35 text-sev-ok",
  comment:  "bg-sev-warn/15 border-sev-warn/40 text-sev-warn",
  decoded:  "bg-sev-danger/15 border-sev-danger/45 text-sev-danger",
  other:    "bg-white/5 border-line-strong text-white/80",
};

function isInvisible(frag: ExtractedFragment): boolean {
  const v = frag.attrs?.visibility;
  return typeof v === "string" && v.toLowerCase() === "invisible";
}

function previewText(text: string, n = 60): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "(empty)";
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function findingsFor(
  frag: ExtractedFragment,
  byLoc: Map<string, Finding[]>,
): Finding[] {
  const direct = byLoc.get(frag.source) ?? [];
  if (direct.length) return direct;
  // try prefix-match (e.g., "metadata.author" vs "metadata")
  const out: Finding[] = [];
  byLoc.forEach((arr, key) => {
    if (frag.source && (key.startsWith(frag.source) || frag.source.startsWith(key))) {
      out.push(...arr);
    }
  });
  return out;
}

export function ExtractPanel({ fragments, findingsByLoc }: ExtractPanelProps) {
  const firstDangerIdx = useMemo(() => {
    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      if (isInvisible(f)) return i;
      const k = kindOf(f);
      if (k === "decoded" || k === "comment") return i;
      if (findingsFor(f, findingsByLoc).length > 0) return i;
    }
    return fragments.length > 0 ? 0 : -1;
  }, [fragments, findingsByLoc]);

  const [selected, setSelected] = useState<number>(firstDangerIdx);

  useEffect(() => {
    setSelected(firstDangerIdx);
  }, [firstDangerIdx]);

  if (fragments.length === 0) {
    return (
      <div className="text-sm text-muted italic px-1 py-3">
        No fragments were extracted for this artifact.
      </div>
    );
  }

  const safeSelected = selected >= 0 && selected < fragments.length ? selected : 0;
  const current = fragments[safeSelected];
  const currentFindings = current ? findingsFor(current, findingsByLoc) : [];
  const currentInvisible = current ? isInvisible(current) : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,1.1fr)] gap-4">
      {/* Chip cloud */}
      <div className="flex flex-wrap gap-1.5 content-start max-h-[420px] overflow-y-auto pr-1">
        {fragments.map((frag, i) => {
          const k = kindOf(frag);
          const invis = isInvisible(frag);
          const active = i === safeSelected;
          return (
            <motion.button
              key={`${frag.source}-${i}`}
              type="button"
              onClick={() => setSelected(i)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.018, duration: 0.22 }}
              whileHover={{ y: -1 }}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-mono leading-tight",
                "max-w-[220px] text-left truncate transition-colors",
                KIND_CLASSES[k],
                invis && "ring-1 ring-sev-danger/70",
                active && "outline outline-2 outline-offset-1 outline-white/35",
              )}
              title={`${frag.source} · ${frag.kind}${invis ? " · invisible" : ""}`}
            >
              <span className="opacity-70 mr-1">[{frag.kind}]</span>
              {invis && <span className="mr-1" aria-hidden>🙈</span>}
              <span className="truncate align-middle">
                {previewText(frag.text, 36)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Detail viewer */}
      <motion.div
        key={safeSelected}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-lg border border-line bg-white/3 p-3.5 min-h-[180px]"
      >
        {!current ? (
          <div className="text-muted text-sm italic">Select a fragment to inspect.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10.5px] font-mono uppercase tracking-wider",
                  KIND_CLASSES[kindOf(current)],
                )}
              >
                {current.kind}
              </span>
              <span className="text-[11px] font-mono text-muted truncate">
                {current.source || "(no source)"}
              </span>
              {currentInvisible && (
                <span className="rounded-md border border-sev-danger/55 bg-sev-danger/15 text-sev-danger text-[10.5px] font-mono uppercase tracking-wider px-2 py-0.5">
                  invisible
                </span>
              )}
              {currentFindings.length > 0 && (
                <span className="rounded-md border border-sev-warn/45 bg-sev-warn/12 text-sev-warn text-[10.5px] font-mono uppercase tracking-wider px-2 py-0.5">
                  {currentFindings.length} finding{currentFindings.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <pre
              className={cn(
                "font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-words",
                "max-h-[320px] overflow-y-auto",
                currentInvisible ? "text-sev-danger" : "text-white/90",
              )}
            >
              {current.text || "(empty)"}
            </pre>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default ExtractPanel;
