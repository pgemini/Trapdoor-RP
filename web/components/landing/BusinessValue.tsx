"use client";

import { motion } from "framer-motion";
import {
  Briefcase, Stethoscope, Banknote, Users, BookOpen, Building2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/util";

interface UseCase {
  icon: typeof Briefcase;
  industry: string;
  scenario: string;
  threat: string;
  trapdoor: string;
}

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

      {/* Bottom band */}
      <div className={cn(
        "rounded-xl p-6 md:p-7 border",
        "border-accent-blue/30 bg-gradient-to-br from-accent-blue/[0.08] to-transparent",
      )}>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-accent-blue mb-2">
              The common thread
            </div>
            <p className="text-[14px] text-white/90 leading-relaxed">
              Anywhere an AI reads files supplied by someone other than the
              immediate user — Trapdoor scans and sanitises every byte before a
              single token reaches the prompt. One layer, one verdict, every
              modality.
            </p>
          </div>
          <a
            href="#demo"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5",
              "text-[13px] font-semibold text-white bg-grad shadow-glow",
              "border border-white/10 shrink-0",
              "hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,164,239,0.35)]",
              "transition-all duration-200 ease-out",
            )}
          >
            Try the live scanner
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default BusinessValue;
