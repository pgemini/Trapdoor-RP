import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SEVERITY_WEIGHT: Record<string, number> = {
  info: 0.05, low: 0.20, med: 0.45, high: 0.75, critical: 0.95,
};

export function severityColor(sev: string) {
  return {
    info:     "text-muted",
    low:      "text-accent-blue",
    med:      "text-sev-warn",
    high:     "text-sev-danger",
    critical: "text-sev-danger",
  }[sev] ?? "text-muted";
}

export function severityBg(sev: string) {
  return {
    info:     "bg-white/5",
    low:      "bg-accent-blue/15",
    med:      "bg-sev-warn/15",
    high:     "bg-sev-danger/15",
    critical: "bg-sev-danger/20",
  }[sev] ?? "bg-white/5";
}

export function kbOrMb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
