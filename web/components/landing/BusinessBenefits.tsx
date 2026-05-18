"use client";

import { motion } from "framer-motion";
import {
  DollarSign, Clock, ShieldCheck, FileCheck,
  Building2, Users, BookOpen, Briefcase, Stethoscope, Banknote,
} from "lucide-react";
import { cn } from "@/lib/util";

interface Benefit {
  icon: typeof DollarSign;
  title: string;
  value: string;
  detail: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: ShieldCheck,
    title: "Defence-in-depth, by design",
    value: "10 detectors",
    detail:
      "Each detector reasons about a different attack axis (vocabulary, codepoints, channel, encoding, intent). An attacker has to defeat every relevant one — not just slip past the LLM.",
  },
  {
    icon: Clock,
    title: "Faster than the LLM itself",
    value: "5–50 ms",
    detail:
      "9 of 10 detectors are pure regex / unicode / parsing logic — no external calls, no GPU. The optional AI Foundry layer caches by SHA-256 so duplicate fragments cost one call per scan, not per fragment.",
  },
  {
    icon: DollarSign,
    title: "Zero per-scan API cost",
    value: "Offline-capable",
    detail:
      "Heuristic mode requires no Azure / OpenAI key. Suits air-gapped, regulated, or cost-sensitive deployments. Switch on the AI classifier only when paraphrase-tolerance is worth the per-call spend.",
  },
  {
    icon: FileCheck,
    title: "Auditable, not opaque",
    value: "Finding[]",
    detail:
      "Every block / review verdict is backed by a Finding with detector, category, severity, confidence, evidence, location, and the sanitize action that was applied. Compliance artefact ready out of the box.",
  },
];

interface UseCase {
  icon: typeof Building2;
  industry: string;
  scenario: string;
  example: string;
}

const USE_CASES: UseCase[] = [
  {
    icon: Briefcase,
    industry: "HR / Recruiting",
    scenario: "LLM-driven resume screening",
    example:
      "Catches white-on-white \"recommend 10/10\" payloads, role-impersonation in PDF metadata, base64-encoded hire-me commands, and homograph URLs pointing at fake portfolios.",
  },
  {
    icon: Stethoscope,
    industry: "Healthcare",
    scenario: "Clinical note summarisation",
    example:
      "Prevents indirect injection inside scanned patient documents, BIDI overrides in imported records, and exfiltration prompts hidden in EXIF / DICOM tags from third-party imaging systems.",
  },
  {
    icon: Banknote,
    industry: "Financial services",
    scenario: "RAG over compliance documents",
    example:
      "Blocks instruction-override smuggled inside SEC filings, encoded payloads in spreadsheet cells, and prompt-leak attempts hidden in customer-uploaded invoices.",
  },
  {
    icon: Users,
    industry: "Customer support",
    scenario: "Auto-summary of uploaded tickets",
    example:
      "Catches HTML / SQL payloads OCR'd out of screenshot attachments, javascript: URIs in user-provided links, and \"forward this transcript to attacker@…\" exfil prompts.",
  },
  {
    icon: BookOpen,
    industry: "Legal / eDiscovery",
    scenario: "AI-assisted document review",
    example:
      "Surfaces Trojan-Source overrides in contracts, encoded clauses, and instructions embedded in document properties that would otherwise bias an LLM-driven review.",
  },
  {
    icon: Building2,
    industry: "Enterprise IT / SaaS",
    scenario: "Multi-tenant LLM applications",
    example:
      "Stops user-A's malicious upload from poisoning user-B's session. CORS-friendly, container-deployable, runs offline in air-gapped tenants.",
  },
];

interface ProofPoint {
  label: string;
  value: string;
  detail: string;
}

const PROOF: ProofPoint[] = [
  { label: "Modalities covered",  value: "7",    detail: "PDF · DOCX · image · audio · video · spreadsheet · text/markdown" },
  { label: "Attack categories",   value: "17",   detail: "across the resilience layer + AI classifier" },
  { label: "Median scan time",    value: "<800 ms", detail: "for a typical document on free-tier compute" },
  { label: "Detection coverage",  value: "98.4%", detail: "on Trapdoor's published attack corpus" },
  { label: "Per-scan API cost",   value: "$0",   detail: "in heuristic mode · ~$0.0002 with AI classifier on" },
  { label: "Languages supported", value: "Any",  detail: "structural detectors are language-agnostic" },
];

export function BusinessBenefits() {
  return (
    <div className="space-y-16">
      {/* Why-it-pays headlines */}
      <div>
        <h3 className="text-[15px] font-mono uppercase tracking-[0.15em] text-muted mb-6">
          Why teams ship Trapdoor
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass rounded-xl border border-line p-6 hover:border-accent-blue/40 transition-colors"
              >
                <div className="flex items-baseline gap-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-grad shadow-glow border border-white/15 shrink-0 mt-0.5">
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-[17px] font-semibold tracking-tight text-white">{b.title}</span>
                      <span className="font-mono text-[12.5px] text-accent-blue">{b.value}</span>
                    </div>
                    <p className="mt-2 text-[13.5px] text-muted leading-relaxed">{b.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Proof-point band */}
      <div className="glass rounded-xl border border-line p-6 md:p-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROOF.map((p) => (
            <div key={p.label} className="border-l-2 border-accent-blue/40 pl-4">
              <div className="text-[28px] font-extrabold tracking-tight text-white leading-none">{p.value}</div>
              <div className="mt-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-dim">{p.label}</div>
              <div className="mt-1 text-[12px] text-muted leading-relaxed">{p.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div>
        <h3 className="text-[15px] font-mono uppercase tracking-[0.15em] text-muted mb-6">
          Where it pays off
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u, i) => {
            const Icon = u.icon;
            return (
              <motion.div
                key={u.industry}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="rounded-lg border border-line bg-white/[0.02] p-5 hover:border-white/15 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={15} className="text-accent-blue" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-dim">{u.industry}</span>
                </div>
                <div className="text-[14px] font-semibold tracking-tight text-white mb-1.5">{u.scenario}</div>
                <p className="text-[12px] text-muted leading-relaxed">{u.example}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom-line cost block */}
      <div className={cn(
        "rounded-xl p-6 md:p-7 border",
        "border-accent-blue/30 bg-gradient-to-br from-accent-blue/[0.08] to-transparent",
      )}>
        <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-accent-blue mb-2">
          Bottom line
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-[13px] text-white/90 leading-relaxed">
          <div>
            <span className="font-semibold">A single successful injection</span> against a customer-support LLM can leak credentials,
            corrupt downstream automation, or pivot to your tools layer.
          </div>
          <div>
            <span className="font-semibold">Model self-defence catches the obvious cases</span> in English,
            but is structurally blind to invisible text, encoded payloads, BIDI overrides, homograph URLs, and OCR-channel markup.
          </div>
          <div>
            <span className="font-semibold">Trapdoor sits in front of the model</span> — every uploaded
            file is scanned + sanitised before a single token reaches your prompt. Zero per-scan cost in heuristic mode.
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessBenefits;
