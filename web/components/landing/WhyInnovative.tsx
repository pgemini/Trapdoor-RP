"use client";

import { motion } from "framer-motion";
import {
  EyeOff, Network, GaugeCircle, FileCheck, Languages, ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/util";

interface Innovation {
  icon: typeof EyeOff;
  title: string;
  body: string;
}

const POINTS: Innovation[] = [
  {
    icon: EyeOff,
    title: "Catches what the model can't see",
    body:
      "Invisible PDF text, zero-width chars, BIDI overrides, encoded payloads, " +
      "homograph URLs, OCR-channel markup — all stripped by the tokenizer or " +
      "the renderer before the LLM ever decides. Trapdoor inspects them at the " +
      "byte and codepoint layer, before any model is invoked.",
  },
  {
    icon: Network,
    title: "Ten independent verdicts, not one",
    body:
      "Each detector reasons about a different axis of attack — vocabulary, " +
      "codepoints, visibility, placement, encoding, display order, link target, " +
      "channel mismatch, semantic intent. An attacker has to defeat every " +
      "relevant one simultaneously; a real attack usually trips several at once.",
  },
  {
    icon: GaugeCircle,
    title: "Faster than a single LLM call",
    body:
      "Nine of the ten detectors are regex / unicode / parsing logic — no GPU, " +
      "no external API, no per-scan cost. The optional AI Foundry layer caches " +
      "by SHA-256, so duplicate fragments cost one call per scan rather than per " +
      "fragment.",
  },
  {
    icon: ShieldOff,
    title: "Works offline, by design",
    body:
      "Default mode requires no external service. Drop it into a regulated " +
      "or air-gapped environment and 9 detectors still produce a full " +
      "verdict. The AI second-opinion turns on with a single env var when " +
      "you're ready.",
  },
  {
    icon: FileCheck,
    title: "Auditable, not opaque",
    body:
      "Every block is backed by a finding record — detector, category, severity, " +
      "confidence, evidence span, location, and the sanitize action that was " +
      "applied. Model refusals say \"I can't help with that\"; Trapdoor tells you " +
      "exactly which byte range, on which page, triggered which rule.",
  },
  {
    icon: Languages,
    title: "Language-agnostic detectors",
    body:
      "Structural checks (unicode, invisible text, bidi, url, markup, " +
      "steganography, encoding) reason about codepoints and bytes — they fire " +
      "the same on English, Hindi, Arabic, or Japanese. The AI layer adds " +
      "semantic coverage for paraphrased attacks in any language.",
  },
];

export function WhyInnovative() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {POINTS.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={cn(
              "glass rounded-xl border border-line p-6",
              "hover:border-accent-blue/40 transition-colors",
            )}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-grad shadow-glow border border-white/15 shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight text-white leading-snug">
                  {p.title}
                </div>
              </div>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">{p.body}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

export default WhyInnovative;
