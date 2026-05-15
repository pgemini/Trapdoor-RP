"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/util";

type Status = "connecting" | "live" | "down";

interface HealthShape {
  ok?: boolean;
  ai_foundry?: boolean;
  transcription?: { enabled?: boolean };
}

export function BackendStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>("connecting");
  const [label, setLabel] = useState<string>("connecting…");

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const r = await fetch("/api/healthz", { cache: "no-store" });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const data: HealthShape = await r.json();
        if (cancelled) return;
        const foundry = !!data.ai_foundry;
        const whisper = !!data.transcription?.enabled;
        const engine = foundry ? "AI Foundry" : "heuristic";
        const suffix = whisper ? " + Whisper" : "";
        setStatus("live");
        setLabel(`live · ${engine}${suffix}`);
      } catch {
        if (cancelled) return;
        setStatus("down");
        setLabel("backend offline");
      }
    }

    void tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const tone =
    status === "live"
      ? status === "live" && label.includes("AI Foundry")
        ? "blue"
        : "ok"
      : status === "down"
        ? "danger"
        : "neutral";

  const toneClass = {
    ok: "bg-sev-ok/15 border-sev-ok/40 text-sev-ok",
    blue: "bg-accent-blue/15 border-accent-blue/40 text-accent-blue",
    danger: "bg-sev-danger/15 border-sev-danger/45 text-sev-danger",
    neutral: "bg-white/5 border-line-strong text-muted",
  }[tone];

  const dotClass = {
    ok: "bg-sev-ok shadow-[0_0_10px_rgba(67,213,157,0.7)]",
    blue: "bg-accent-blue shadow-[0_0_10px_rgba(0,164,239,0.7)]",
    danger: "bg-sev-danger shadow-[0_0_10px_rgba(255,93,108,0.7)]",
    neutral: "bg-muted",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        "text-[11px] font-mono font-semibold uppercase whitespace-nowrap",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] tracking-wider",
        toneClass,
        className,
      )}
      title={label}
    >
      <span className={cn("h-2 w-2 rounded-full animate-pulse-glow", dotClass)} />
      <Activity className="h-3 w-3 opacity-70" strokeWidth={2.5} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export default BackendStatus;
