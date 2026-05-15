"use client";

import { cn } from "@/lib/util";

const TAGLINES = [
  "Hidden prompts. Caught early.",
  "Before the model falls for it.",
  "Spot the hidden instruction.",
  "Guarding the LLM's entrance.",
];

export function Taglines() {
  // Duplicate the list so the track scrolls seamlessly.
  const track = [...TAGLINES, ...TAGLINES];

  return (
    <section
      aria-label="Trapdoor taglines"
      className={cn(
        "relative overflow-hidden border-y border-line",
        "bg-bg-elevated/60 py-7",
      )}
    >
      <style jsx>{`
        @keyframes td-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .td-scroll {
          animation: td-scroll 35s linear infinite;
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
        style={{
          background:
            "linear-gradient(to right, #06070d, rgba(6,7,13,0))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
        style={{
          background:
            "linear-gradient(to left, #06070d, rgba(6,7,13,0))",
        }}
      />

      <div className="td-scroll flex w-max gap-12 whitespace-nowrap">
        {track.map((line, i) => (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-12",
              "text-xl md:text-2xl font-semibold tracking-tight",
              i % 2 === 1 ? "text-accent-blue" : "text-white/85",
            )}
          >
            {line}
            <span
              className="h-1.5 w-1.5 rounded-full bg-white/30 shrink-0"
              aria-hidden="true"
            />
          </span>
        ))}
      </div>
    </section>
  );
}

export default Taglines;
