import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/util";

export type BadgeTone = "neutral" | "ok" | "warn" | "danger" | "info" | "blue";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-white/5 border-line-strong text-white/85",
  ok:      "bg-sev-ok/15 border-sev-ok/35 text-sev-ok",
  warn:    "bg-sev-warn/15 border-sev-warn/35 text-sev-warn",
  danger:  "bg-sev-danger/15 border-sev-danger/40 text-sev-danger",
  info:    "bg-white/5 border-line-strong text-muted",
  blue:    "bg-accent-blue/15 border-accent-blue/35 text-accent-blue",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5",
        "text-[10.5px] font-mono uppercase tracking-wider whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
