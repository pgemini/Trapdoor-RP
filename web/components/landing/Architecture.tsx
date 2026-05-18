"use client";

import { motion } from "framer-motion";
import {
  Upload, FileSearch, Search, Calculator, Filter,
  Cpu, Zap, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/util";

interface Stage {
  num: string;
  title: string;
  icon: typeof Upload;
  detail: string;
}

const STAGES: Stage[] = [
  { num: "01", title: "Ingest",   icon: Upload,
    detail: "MIME-type detection + byte-count + modality routing" },
  { num: "02", title: "Extract",  icon: FileSearch,
    detail: "OCR · Whisper · LSB decode · metadata · subtitle parse" },
  { num: "03", title: "Detect",   icon: Search,
    detail: "Ten detectors run in parallel — heuristic + AI" },
  { num: "04", title: "Score",    icon: Calculator,
    detail: "risk = 1 − Π(1 − severity × confidence) → block/review/pass" },
  { num: "05", title: "Sanitize", icon: Filter,
    detail: "Strip / quote / discard offending spans → LLM-safe context" },
];

interface Detector {
  name: string;
  desc: string;
  layer: "heuristic" | "ai";
}

const DETECTORS: Detector[] = [
  { name: "pattern",        layer: "heuristic", desc: "23 curated injection regexes, obfuscation-aware" },
  { name: "unicode",        layer: "heuristic", desc: "zero-width · tag chars · math symbols · script mixing" },
  { name: "invisible-text", layer: "heuristic", desc: "white-on-white · 0-opacity · tiny font" },
  { name: "metadata",       layer: "heuristic", desc: "PDF / DOCX / EXIF / ID3 / RIFF tags" },
  { name: "steganography",  layer: "heuristic", desc: "LSB-decoded ASCII in image pixels" },
  { name: "encoding",       layer: "heuristic", desc: "base64 / hex / URL-encoded / ROT13 (recursive)" },
  { name: "bidi",           layer: "heuristic", desc: "Trojan Source · line separators · annotations" },
  { name: "url",            layer: "heuristic", desc: "homograph · punycode · IP · data: URI · shorteners" },
  { name: "markup",         layer: "heuristic", desc: "<script> · SQL · SSTI in OCR / transcript / metadata" },
  { name: "ai-foundry",     layer: "ai",        desc: "Azure GPT-4o classifier — paraphrase-tolerant" },
];

export function Architecture() {
  return (
    <div className="space-y-16">
      {/* Stage pipeline */}
      <div>
        <h3 className="text-[15px] font-mono uppercase tracking-[0.15em] text-muted mb-6">
          The five-stage pipeline
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="glass rounded-xl border border-line p-5 hover:border-accent-blue/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-grad text-white font-mono font-bold text-[12px] border border-white/15">
                    {s.num}
                  </span>
                  <Icon size={16} className="text-accent-blue" />
                </div>
                <div className="text-[15px] font-semibold tracking-tight text-white">{s.title}</div>
                <div className="mt-1.5 text-[11.5px] text-muted leading-relaxed">{s.detail}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detector chain */}
      <div>
        <h3 className="text-[15px] font-mono uppercase tracking-[0.15em] text-muted mb-6">
          Ten independent detectors, two layers
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {DETECTORS.map((d, i) => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
              className={cn(
                "rounded-lg border p-3.5 transition-colors",
                d.layer === "ai"
                  ? "border-accent-purple/40 bg-accent-purple/[0.04] hover:border-accent-purple/60"
                  : "border-line bg-white/[0.02] hover:border-white/15",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <code className="font-mono text-[12px] font-semibold text-white">{d.name}</code>
                {d.layer === "ai" ? (
                  <Cpu size={12} className="text-accent-purple" />
                ) : (
                  <Zap size={12} className="text-muted-dim" />
                )}
              </div>
              <div className="text-[11px] text-muted leading-relaxed">{d.desc}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Zap size={11} className="text-muted-dim" /> heuristic — always on, ~5–50 ms, no external calls
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Cpu size={11} className="text-accent-purple" /> ai-foundry — optional Azure GPT-4o second opinion
          </span>
        </div>
      </div>

      {/* Verdict outcome bar */}
      <div>
        <h3 className="text-[15px] font-mono uppercase tracking-[0.15em] text-muted mb-6">
          One verdict, three outcomes
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "PASS",   icon: ShieldCheck,    color: "text-sev-ok",     bg: "border-sev-ok/40 bg-sev-ok/[0.05]",     desc: "risk &lt; 0.35 · safe to forward to the LLM" },
            { label: "REVIEW", icon: AlertTriangle,  color: "text-sev-warn",   bg: "border-sev-warn/40 bg-sev-warn/[0.05]", desc: "0.35 ≤ risk &lt; 0.85 · sanitised, surfaced for review" },
            { label: "BLOCK",  icon: AlertTriangle,  color: "text-sev-danger", bg: "border-sev-danger/40 bg-sev-danger/[0.05]", desc: "risk ≥ 0.85 or any high/critical finding · never reaches the LLM" },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.label} className={cn("rounded-xl border p-5", v.bg)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={v.color} />
                  <span className={cn("font-mono font-bold tracking-wider text-[12px]", v.color)}>{v.label}</span>
                </div>
                <div className="text-[12px] text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: v.desc }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Architecture;
