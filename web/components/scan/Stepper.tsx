"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/util";

export const STEPPER_STEPS = [
  "ingest",
  "extract",
  "detect",
  "score",
  "sanitize",
  "verdict",
] as const;

export type StepperStep = (typeof STEPPER_STEPS)[number];

export interface StepperProps {
  current: string;
  completed: Set<string>;
  alerts: Set<string>;
  onJump?: (step: string) => void;
}

export function Stepper({ current, completed, alerts, onJump }: StepperProps) {
  return (
    <div
      className={cn(
        "glass rounded-xl px-3 py-2.5 flex items-center gap-1 overflow-x-auto",
        "font-mono text-[11.5px] uppercase tracking-wider select-none",
      )}
      role="navigation"
      aria-label="Scan pipeline progress"
    >
      {STEPPER_STEPS.map((step, idx) => {
        const isCurrent = step === current;
        const isCompleted = completed.has(step);
        const isAlert = alerts.has(step);

        const stateClass = isAlert
          ? "bg-sev-danger/12 text-sev-danger border-sev-danger/35"
          : isCompleted
            ? "bg-sev-ok/12 text-sev-ok border-sev-ok/30"
            : isCurrent
              ? "bg-accent-blue/15 text-accent-blue border-accent-blue/55 ring-1 ring-accent-blue/45 shadow-glow"
              : "bg-white/3 text-muted border-line";

        const prefix = isAlert
          ? <span aria-hidden>✗</span>
          : isCompleted
            ? <span aria-hidden>✓</span>
            : <span aria-hidden className="opacity-60">{String(idx + 1).padStart(2, "0")}</span>;

        const clickable = !!onJump && (isCompleted || isAlert || isCurrent);

        return (
          <Fragment key={step}>
            <motion.button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump?.(step)}
              whileHover={clickable ? { y: -1 } : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1",
                "transition-colors duration-200",
                stateClass,
                clickable
                  ? "cursor-pointer hover:brightness-125"
                  : "cursor-default",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {prefix}
              <span>{step}</span>
            </motion.button>
            {idx < STEPPER_STEPS.length - 1 && (
              <span
                className="text-muted-dim px-0.5 shrink-0"
                aria-hidden
              >
                ›
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default Stepper;
