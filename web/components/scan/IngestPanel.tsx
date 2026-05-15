"use client";

import { motion } from "framer-motion";
import type { ScanResult } from "@/lib/types";
import { cn, kbOrMb } from "@/lib/util";

export interface IngestPanelProps {
  result: ScanResult;
  source: string;
}

interface Cell {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok" | "warn" | "danger" | "info" | "blue" | "neutral";
}

const TONE_VALUE: Record<NonNullable<Cell["tone"]>, string> = {
  ok:     "text-sev-ok",
  warn:   "text-sev-warn",
  danger: "text-sev-danger",
  info:   "text-muted",
  blue:   "text-accent-blue",
  neutral:"text-white",
};

export function IngestPanel({ result, source }: IngestPanelProps) {
  const cells: Cell[] = [
    { label: "filename", value: result.filename || "—", mono: true },
    { label: "source", value: source || "—" },
    { label: "modality", value: result.modality || "—", tone: "blue" },
    { label: "mime", value: result.mime || "—", mono: true },
    { label: "size", value: kbOrMb(result.size_bytes ?? 0) },
    { label: "scan_id", value: result.scan_id || "—", mono: true },
    {
      label: "ai_foundry",
      value: result.ai_foundry_used ? "engaged" : "offline",
      tone: result.ai_foundry_used ? "ok" : "info",
    },
    {
      label: "duration_ms",
      value: `${result.duration_ms ?? 0} ms`,
      mono: true,
      tone: "blue",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {cells.map((cell, i) => (
        <motion.div
          key={cell.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.32, ease: "easeOut" }}
          className={cn(
            "rounded-lg border border-line bg-white/3 px-3 py-2.5",
            "hover:border-line-strong transition-colors duration-200",
          )}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-dim">
            {cell.label}
          </div>
          <div
            className={cn(
              "mt-1 text-sm break-all leading-snug",
              cell.mono && "font-mono text-[12.5px]",
              cell.tone ? TONE_VALUE[cell.tone] : "text-white",
            )}
            title={cell.value}
          >
            {cell.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default IngestPanel;
