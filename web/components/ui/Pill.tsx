import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/util";

export type PillTone = "neutral" | "ok" | "warn" | "danger" | "info" | "blue";

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  tone?: PillTone;
}

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: "bg-white/5 border-line-strong text-white",
  ok:      "bg-sev-ok/20 border-sev-ok/50 text-sev-ok",
  warn:    "bg-sev-warn/20 border-sev-warn/50 text-sev-warn",
  danger:  "bg-sev-danger/20 border-sev-danger/55 text-sev-danger",
  info:    "bg-white/8 border-line-strong text-white/90",
  blue:    "bg-accent-blue/20 border-accent-blue/50 text-accent-blue",
};

export function Pill({
  children,
  tone = "neutral",
  className,
  ...rest
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1",
        "text-[12px] font-mono font-semibold uppercase whitespace-nowrap",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        TONE_CLASSES[tone],
        className,
      )}
      style={{ letterSpacing: "0.18em", ...(rest.style ?? {}) }}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Pill;
