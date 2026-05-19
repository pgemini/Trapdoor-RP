"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/util";

interface Milestone {
  phase: "NOW" | "NEXT";
  title: string;
  items: string[];
}

const MILESTONES: Milestone[] = [
  {
    phase: "NOW",
    title: "Pilot-ready",
    items: [
      "7 modalities · 13 categories",
      "Next.js + FastAPI live on Azure",
      "AI Foundry + Whisper wired",
      "Sentence-level redaction",
    ],
  },
  {
    phase: "NEXT",
    title: "Copilot integration",
    items: [
      "Integrating with Microsoft Copilot through the public API",
      "SharePoint / OneDrive document hooks before retrieval",
      "Teams + Outlook attachment pre-scan",
    ],
  },
  {
    phase: "NEXT",
    title: "Improvisation layer",
    items: [
      "Learning loop on blocked spans — new guardrail-avoiding payloads feed the detector set",
      "Auto-tuned thresholds per tenant from observed traffic",
      "An adaptive LLM layer that catches paraphrases the regex bank misses",
    ],
  },
];

export function Roadmap() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {MILESTONES.map((m, i) => (
        <motion.div
          key={m.title}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, delay: i * 0.07 }}
          className={cn(
            "rounded-xl border border-line bg-white/[0.02] p-6 relative",
            "hover:border-sev-danger/40 transition-colors",
          )}
        >
          {/* Red top bar */}
          <span
            className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-sev-danger"
            aria-hidden="true"
          />
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-sev-danger mb-3 mt-1">
            {m.phase}
          </div>
          <div className="text-[18px] font-semibold tracking-tight text-white mb-4">
            {m.title}
          </div>
          <ul className="space-y-2">
            {m.items.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-[13px] text-muted leading-relaxed"
              >
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sev-danger" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}

export default Roadmap;
