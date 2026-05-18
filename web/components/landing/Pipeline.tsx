"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/util";

interface Step {
  num: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "Ingest",
    description:
      "Accept files from upload or sample library. Detect MIME type, measure bytes, and route to the correct modality pipeline.",
  },
  {
    num: "02",
    title: "Extract",
    description:
      "Pull text layers, OCR images, decode metadata, parse subtitles, run Whisper on audio, decode LSB byte planes, and unpack archives down to leaves.",
  },
  {
    num: "03",
    title: "Detect",
    description:
      "Run all ten detectors across every fragment: pattern, unicode, invisible-text, metadata, steganography, encoding, BIDI, URL, markup, and (optionally) an AI Foundry classifier for paraphrased attacks.",
  },
  {
    num: "04",
    title: "Score",
    description:
      "Aggregate findings as independent probabilities — risk = 1 − Π(1 − severity × confidence). Output pass / review / block in one number plus a contribution breakdown.",
  },
  {
    num: "05",
    title: "Sanitize",
    description:
      "Quote, strip, or discard offending spans. Emit a clean, model-safe context with provenance for every transformation.",
  },
];

function StepArrow() {
  return (
    <div
      className="hidden lg:flex items-center justify-center px-2"
      aria-hidden="true"
    >
      <div className="relative flex items-center">
        <span className="block h-px w-12 bg-gradient-to-r from-line-strong via-white/20 to-line-strong" />
        <ArrowRight
          className="ml-1 h-4 w-4 text-white/30"
          strokeWidth={2.2}
        />
      </div>
    </div>
  );
}

export function Pipeline() {
  return (
    <section id="pipeline" className="relative border-b border-line">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full",
              "border border-line-strong bg-white/5 px-3 py-1",
              "text-[10px] font-mono font-semibold uppercase tracking-[0.18em]",
              "text-white/85",
            )}
          >
            How it works
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Five stages, one safe context.
          </h2>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">
            Every file flows through the same deterministic pipeline. Each
            stage emits a timed result, so you can audit exactly where a
            finding was born.
          </p>
        </motion.div>

        <div className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-stretch">
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              className="flex flex-col lg:flex-row lg:items-stretch lg:flex-1 lg:min-w-0"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={cn(
                  "glass rounded-xl p-5 flex-1 min-w-0",
                  "border-line hover:border-white/15 transition-colors",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                      "bg-grad text-white font-mono font-bold text-[13px]",
                      "shadow-glow border border-white/15",
                    )}
                  >
                    {s.num}
                  </span>
                  <h3 className="text-[17px] font-semibold tracking-tight text-white">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                  {s.description}
                </p>
              </motion.div>

              {i < STEPS.length - 1 && (
                <>
                  <StepArrow />
                  <div
                    className="lg:hidden flex items-center justify-center py-2"
                    aria-hidden="true"
                  >
                    <div className="h-6 w-px bg-line-strong" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Pipeline;
