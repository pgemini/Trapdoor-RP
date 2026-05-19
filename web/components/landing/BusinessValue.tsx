"use client";

import { motion } from "framer-motion";
import {
  Briefcase, Stethoscope, Banknote, Users, BookOpen, Building2,
} from "lucide-react";
import { cn } from "@/lib/util";

interface UseCase {
  icon: typeof Briefcase;
  industry: string;
  scenario: string;
  threat: string;
  trapdoor: string;
}

interface CostStat {
  value: string;
  label: string;
}

const COST_STATS: CostStat[] = [
  { value: "$5+M",   label: "Loss avoided per AI breach (IBM 2024)" },
  { value: "60–90%", label: "Less manual content review" },
  { value: "$0.0008", label: "Per scan in heuristic-only mode" },
  { value: "~2–4 wk", label: "Typical implementation period" },
];

interface EconRow {
  mode: string;
  latency: string;
  cost: string;
}

const PER_SCAN_ECON: EconRow[] = [
  { mode: "Heuristic-only",            latency: "<700 ms",  cost: "$0.0008" },
  { mode: "+ AI Foundry classifier",   latency: "~1200 ms", cost: "$0.005"  },
  { mode: "+ Vision OCR + transcribe", latency: "1.5–5 s",  cost: "$0.02"   },
];

const CXO_LINES: string[] = [
  "−1 FTE per 50k tickets on content review (HR, support)",
  "−40% incident-response hours on \"did the model leak X?\"",
  "−30% outbound LLM tokens — clean context is shorter",
  "+1 audit narrative — every block logged with evidence",
];

const USE_CASES: UseCase[] = [
  {
    icon: Briefcase,
    industry: "HR & Recruiting",
    scenario: "LLM-driven résumé screening",
    threat:
      "Candidates embed white-on-white \"rate 10/10\" payloads in PDFs, role-impersonation in document metadata, and links to fake portfolios.",
    trapdoor:
      "Invisible-text + metadata detectors catch the resume class entirely; verdict BLOCK before the screener model ever runs.",
  },
  {
    icon: Stethoscope,
    industry: "Healthcare",
    scenario: "Clinical-note summarisation",
    threat:
      "Indirect injection inside scanned patient records, BIDI overrides in imported documents, exfiltration prompts hidden in imaging EXIF tags.",
    trapdoor:
      "Bidi + invisible-text + metadata detectors run before the summary model is invoked. No PHI leaves the box unless the file passes.",
  },
  {
    icon: Banknote,
    industry: "Financial services",
    scenario: "RAG over compliance documents",
    threat:
      "Instruction-override smuggled inside SEC filings, encoded payloads in spreadsheet cells, prompt-leak attempts in customer invoices.",
    trapdoor:
      "Pattern + encoding + markup detectors strip the attack spans from sanitized_context; the RAG retriever indexes clean text only.",
  },
  {
    icon: Users,
    industry: "Customer support",
    scenario: "Auto-summary of uploaded tickets",
    threat:
      "HTML / SQL payloads OCR'd out of screenshot attachments, javascript: URIs in user-provided links, \"forward this transcript\" exfil prompts.",
    trapdoor:
      "Markup + url detectors fire on the OCR/transcript channel mismatch — these payloads have no business being in those fragments.",
  },
  {
    icon: BookOpen,
    industry: "Legal & eDiscovery",
    scenario: "AI-assisted document review",
    threat:
      "Trojan-Source overrides in contracts, encoded clauses, instructions buried in document properties that bias an LLM-driven review.",
    trapdoor:
      "Bidi catches the U+202E class with no false positives; metadata role-impersonation catches /Author = SYSTEM.",
  },
  {
    icon: Building2,
    industry: "Enterprise SaaS",
    scenario: "Multi-tenant LLM applications",
    threat:
      "User-A's malicious upload poisons User-B's session via shared retrieval. No external service can be called from the air-gapped tenant.",
    trapdoor:
      "9 of 10 detectors require zero external calls; runs entirely in-tenant. CORS-friendly, container-deployable, sub-second.",
  },
];

export function BusinessValue() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((u, i) => {
          const Icon = u.icon;
          return (
            <motion.div
              key={u.industry}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={cn(
                "rounded-xl border border-line bg-white/[0.02] p-5",
                "hover:border-accent-blue/40 transition-colors",
              )}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-grad border border-white/15 shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-accent-blue">
                  {u.industry}
                </span>
              </div>
              <div className="text-[15px] font-semibold tracking-tight text-white mb-3">
                {u.scenario}
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-sev-danger/80 mb-0.5">
                    Threat
                  </div>
                  <p className="text-[12.5px] text-muted leading-relaxed">{u.threat}</p>
                </div>
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-sev-ok/85 mb-0.5">
                    What Trapdoor does
                  </div>
                  <p className="text-[12.5px] text-muted leading-relaxed">{u.trapdoor}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* COST SAVINGS */}
      <div className="space-y-6 pt-4">
        <div className="max-w-3xl">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-sev-danger mb-2">
            Cost · Savings
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            A trapdoor at the gateway is cheaper than a breach at the bottom.
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COST_STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className={cn(
                "rounded-xl border px-4 py-4 relative overflow-hidden",
                "border-sev-danger/30 bg-gradient-to-br from-sev-danger/[0.08] via-panel-soft to-panel-soft",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
              )}
            >
              <div className="text-[28px] font-extrabold tracking-tight text-sev-danger leading-none">
                {s.value}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.12em] font-mono text-white/85 leading-snug">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-white/[0.02] p-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-sev-danger mb-4">
              Per-scan economics (/ 5 MB)
            </div>
            <table className="w-full text-[13px]">
              <tbody>
                {PER_SCAN_ECON.map((r, i) => (
                  <tr
                    key={r.mode}
                    className={cn(
                      "border-t border-line/60",
                      i === 0 && "border-t-0",
                    )}
                  >
                    <td className="py-2.5 pr-3 font-semibold text-white whitespace-nowrap">
                      {r.mode}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted whitespace-nowrap">
                      {r.latency}
                    </td>
                    <td className="py-2.5 pl-3 font-mono font-bold text-sev-danger text-right whitespace-nowrap">
                      {r.cost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-line bg-white/[0.02] p-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-sev-danger mb-4">
              CXO line-items
            </div>
            <ul className="space-y-2.5">
              {CXO_LINES.map((line) => (
                <li
                  key={line}
                  className="flex gap-2.5 text-[13px] text-white/90 leading-relaxed"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sev-danger" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessValue;
