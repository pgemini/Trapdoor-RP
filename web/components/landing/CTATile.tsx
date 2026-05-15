"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/util";

const BULLETS = [
  "Drop any PDF, image, video, audio or spreadsheet",
  "See every detector that fires with severity & evidence",
  "Inspect extracted fragments and the sanitized context",
  "Backed by AI Foundry + Whisper when enabled",
];

interface Blip {
  top: string;
  left: string;
  size: number;
  color: string;
  delay: number;
}

const BLIPS: Blip[] = [
  { top: "22%", left: "18%", size: 14, color: "#00a4ef", delay: 0 },
  { top: "58%", left: "62%", size: 18, color: "#7c5cff", delay: 0.7 },
  { top: "35%", left: "78%", size: 11, color: "#f25022", delay: 1.4 },
];

export function CTATile() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-8 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Link
          href="/scan"
          className={cn(
            "group relative block overflow-hidden rounded-2xl",
            "border border-line-strong",
            "bg-gradient-to-br from-[rgba(0,164,239,0.10)] via-[rgba(124,92,255,0.08)] to-[rgba(242,80,34,0.06)]",
            "shadow-deep transition-all duration-300",
            "hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,164,239,0.20)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60",
          )}
        >
          {/* radial accents */}
          <div
            className="absolute -top-32 -left-32 h-80 w-80 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(0,164,239,0.55), transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(124,92,255,0.55), transparent 70%)",
            }}
          />

          <div className="relative grid grid-cols-1 gap-8 p-7 md:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            {/* LEFT — blip visualization */}
            <div
              className={cn(
                "relative h-56 lg:h-64 rounded-xl",
                "border border-line bg-bg-elevated/60 overflow-hidden",
              )}
            >
              <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
              {BLIPS.map((b, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    top: b.top,
                    left: b.left,
                    width: b.size,
                    height: b.size,
                    background: b.color,
                    boxShadow: `0 0 24px ${b.color}`,
                  }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: b.delay,
                  }}
                />
              ))}
              {BLIPS.map((b, i) => (
                <motion.div
                  key={`ring-${i}`}
                  className="absolute rounded-full border pointer-events-none"
                  style={{
                    top: b.top,
                    left: b.left,
                    width: b.size,
                    height: b.size,
                    borderColor: b.color,
                  }}
                  animate={{
                    scale: [1, 3, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: b.delay,
                  }}
                />
              ))}
              <div className="absolute bottom-3 left-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted">
                Live detector pulse
              </div>
            </div>

            {/* RIGHT — copy */}
            <div>
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full",
                  "border border-line-strong bg-white/5 px-3 py-1",
                  "text-[10px] font-mono font-semibold uppercase tracking-[0.18em]",
                  "text-white/85",
                )}
              >
                Interactive Scanner
              </div>
              <h2 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Try Trapdoor on your own files.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Upload anything suspicious — or pick one of the curated sample
                attacks. Trapdoor runs the full pipeline and shows you every
                detector that fired, in plain language.
              </p>

              <ul className="mt-5 space-y-2">
                {BULLETS.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 text-[14px] text-white/85"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center",
                        "rounded-full bg-accent-blue/20 border border-accent-blue/40",
                      )}
                    >
                      <Check className="h-2.5 w-2.5 text-accent-blue" strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <span
                className={cn(
                  "mt-7 inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
                  "text-sm font-semibold text-white bg-grad shadow-glow",
                  "border border-white/10",
                  "transition-transform duration-200",
                  "group-hover:-translate-y-0.5",
                )}
              >
                Open the scanner
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </section>
  );
}

export default CTATile;
