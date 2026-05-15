"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { ScanResult, Verdict } from "@/lib/types";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/util";

export interface VerdictPanelProps {
  result: ScanResult;
}

const VERDICT_META: Record<
  Verdict,
  {
    title: string;
    reason: string;
    pillTone: "ok" | "warn" | "danger";
    icon: React.ReactNode;
    ring: string;
    glowColor: string;
  }
> = {
  pass: {
    title: "Safe to forward",
    reason: "No prompt-injection indicators crossed the review threshold.",
    pillTone: "ok",
    icon: <ShieldCheck size={26} className="text-sev-ok" />,
    ring: "ring-sev-ok/45",
    glowColor: "rgba(67,213,157,0.32)",
  },
  review: {
    title: "Human review recommended",
    reason: "Suspicious signals were found; sanitized context was forwarded with caveats.",
    pillTone: "warn",
    icon: <ShieldAlert size={26} className="text-sev-warn" />,
    ring: "ring-sev-warn/45",
    glowColor: "rgba(255,180,84,0.32)",
  },
  block: {
    title: "Blocked at the trapdoor",
    reason: "High-confidence injection indicators were detected. The payload was not forwarded.",
    pillTone: "danger",
    icon: <ShieldX size={26} className="text-sev-danger" />,
    ring: "ring-sev-danger/45",
    glowColor: "rgba(255,93,108,0.34)",
  },
};

export function VerdictPanel({ result }: VerdictPanelProps) {
  const meta = VERDICT_META[result.verdict] ?? VERDICT_META.review;
  const pct = Math.round((result.risk_score ?? 0) * 100);
  const sanitizedChars = (result.sanitized_context ?? "").length;
  const blockedCount = result.blocked_spans?.length ?? 0;

  const stats: { label: string; value: string; tone?: string }[] = [
    {
      label: "risk score",
      value: `${pct}%`,
      tone:
        pct >= 85 ? "text-sev-danger" : pct >= 35 ? "text-sev-warn" : "text-sev-ok",
    },
    {
      label: "findings",
      value: String(result.findings.length),
      tone:
        result.findings.length === 0
          ? "text-sev-ok"
          : result.findings.length > 4
            ? "text-sev-danger"
            : "text-sev-warn",
    },
    {
      label: "sanitized chars",
      value: String(sanitizedChars),
      tone: "text-accent-blue",
    },
    {
      label: "blocked spans",
      value: String(blockedCount),
      tone: blockedCount > 0 ? "text-sev-danger" : "text-muted",
    },
    {
      label: "modality",
      value: result.modality || "—",
      tone: "text-white",
    },
    {
      label: "duration",
      value: `${result.duration_ms ?? 0} ms`,
      tone: "text-white",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 20 }}
      className={cn(
        "rounded-xl border border-line-strong bg-panel/80 px-6 py-6",
        "ring-1", meta.ring,
        "relative overflow-hidden",
      )}
      style={{
        boxShadow: `0 30px 80px -20px ${meta.glowColor}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(600px 300px at 50% -10%, ${meta.glowColor}, transparent 70%)`,
        }}
        aria-hidden
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-4">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 250, damping: 18 }}
            className={cn(
              "h-14 w-14 rounded-full grid place-items-center",
              "bg-white/5 border border-line-strong",
            )}
          >
            {meta.icon}
          </motion.div>

          <div className="flex-1 min-w-[200px]">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.3 }}
            >
              <Pill tone={meta.pillTone} className="text-[13px]">
                {result.verdict}
              </Pill>
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.3 }}
              className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white"
            >
              {meta.title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mt-1 text-sm text-muted leading-snug"
            >
              {meta.reason}
            </motion.p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.05, duration: 0.28 }}
              className="rounded-lg border border-line bg-white/4 px-3 py-2.5"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-dim">
                {s.label}
              </div>
              <div
                className={cn(
                  "mt-1 font-mono text-lg font-semibold leading-tight",
                  s.tone ?? "text-white",
                )}
              >
                {s.value}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default VerdictPanel;
