"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Filter, Tag, Search, ArrowUpRight,
  AlertOctagon, AlertTriangle, Info as InfoIcon,
} from "lucide-react";

import { Nav }    from "@/components/nav/Nav";
import { Card, CardBody, CardHeader, CardTitle, CardSub } from "@/components/ui/Card";
import { Badge }  from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ATTACKS, type AttackEntry } from "@/lib/attackCatalog";
import { cn } from "@/lib/util";

const MODALITIES = [
  { key: "text",        label: "Text"        },
  { key: "pdf",         label: "PDF"         },
  { key: "docx",        label: "DOCX"        },
  { key: "image",       label: "Image"       },
  { key: "audio",       label: "Audio"       },
  { key: "video",       label: "Video"       },
  { key: "spreadsheet", label: "Spreadsheet" },
  { key: "markdown",    label: "Markdown"    },
] as const;
type ModalityKey = (typeof MODALITIES)[number]["key"];

const SEVERITY_ORDER: Record<AttackEntry["severity"], number> = {
  critical: 0, high: 1, med: 2, low: 3, info: 4,
};

function sevTone(s: AttackEntry["severity"]) {
  return s === "critical" || s === "high" ? "danger"
       : s === "med"                       ? "warn"
       : s === "low"                       ? "blue"
       : "neutral";
}
function SevIcon({ s }: { s: AttackEntry["severity"] }) {
  const cls = sevTone(s) === "danger" ? "text-sev-danger"
            : sevTone(s) === "warn"   ? "text-sev-warn"
            : sevTone(s) === "blue"   ? "text-accent-blue"
            : "text-muted";
  if (s === "critical" || s === "high") return <AlertOctagon className={`w-4 h-4 ${cls}`} />;
  if (s === "med") return <AlertTriangle className={`w-4 h-4 ${cls}`} />;
  return <InfoIcon className={`w-4 h-4 ${cls}`} />;
}

export default function AttacksPage() {
  const [q, setQ]           = useState("");
  const [mods, setMods]     = useState<Set<ModalityKey>>(new Set());
  const [selected, setSel]  = useState<AttackEntry | null>(null);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return ATTACKS
      .filter(a => {
        if (mods.size && !a.modalities.some(m => mods.has(m as ModalityKey))) return false;
        if (!term) return true;
        return (
          a.name.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term) ||
          a.exampleText.toLowerCase().includes(term) ||
          a.id.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [q, mods]);

  function toggleMod(m: ModalityKey) {
    setMods(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  }

  return (
    <>
      <Nav variant="landing" />

      <main className="max-w-[1280px] mx-auto px-6 pb-24 pt-10">
        <header className="text-center max-w-[760px] mx-auto mb-12">
          <span className="inline-block mb-3 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/25 text-[#c9beff] text-[11px] font-semibold tracking-[0.08em] uppercase">
            Attack catalog
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-3">
            <ShieldAlert className="inline w-9 h-9 mr-2 -mt-2 text-accent-blue" />
            <span className="text-gradient">17 ways</span> the LLM gets owned.
          </h1>
          <p className="text-muted">
            Every category Trapdoor recognises, with a copy-paste-ready payload and the
            detectors that catch it. Click any card to try it live in the scanner.
          </p>
        </header>

        {/* Search + filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search attacks (name, description, payload…)"
                  className="w-full pl-10 pr-3 py-2 text-sm font-mono bg-black/30 border border-line rounded-lg focus:outline-none focus:border-accent-blue/50"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted" />
                {MODALITIES.map(m => (
                  <button
                    key={m.key}
                    onClick={() => toggleMod(m.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition border",
                      mods.has(m.key)
                        ? "bg-accent-blue/15 border-accent-blue/40 text-[#9fd6f5]"
                        : "bg-white/2 border-line text-muted hover:bg-white/5"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
                {(mods.size > 0 || q) && (
                  <button onClick={() => { setMods(new Set()); setQ(""); }}
                          className="px-2.5 py-1 rounded-md text-[11px] text-accent-blue hover:underline font-mono">
                    clear
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted font-mono">
              {filtered.length} of {ATTACKS.length} attack categories
            </div>
          </CardBody>
        </Card>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3 }}
              onClick={() => setSel(a)}
              className="text-left bg-panel border border-line rounded-xl p-5 hover:border-line-strong transition group"
            >
              <div className="flex items-start gap-3 mb-3">
                <SevIcon s={a.severity} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base mb-0.5 group-hover:text-gradient">{a.name}</h3>
                  <div className="font-mono text-[10.5px] text-muted">{a.id}</div>
                </div>
                <Badge tone={sevTone(a.severity) as "danger" | "warn" | "blue" | "neutral"}>
                  {a.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-[#cdd3e4] leading-relaxed mb-3 line-clamp-3">{a.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {a.modalities.map(m => (
                  <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-muted">
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono pt-3 border-t border-line">
                <span className="text-muted">
                  <Tag className="inline w-3 h-3 mr-1" />
                  {a.detectors.join(" · ")}
                </span>
                <span className="text-accent-blue inline-flex items-center gap-1">
                  open <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted font-mono">no attacks match those filters.</div>
        )}
      </main>

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setSel(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[760px] bg-panel border border-line-strong rounded-2xl shadow-deep overflow-hidden"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SevIcon s={selected.severity} />
                    <div>
                      <CardTitle>{selected.name}</CardTitle>
                      <CardSub>{selected.id}</CardSub>
                    </div>
                    <Badge tone={sevTone(selected.severity) as "danger" | "warn" | "blue" | "neutral"} className="ml-auto">
                      {selected.severity.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-[#cdd3e4] mb-4 leading-relaxed">{selected.description}</p>
                  <p className="text-xs text-muted mb-4">{selected.realWorld}</p>

                  <div className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">
                    Example payload
                  </div>
                  <pre className="text-xs font-mono bg-black/40 border border-line rounded-lg p-3 whitespace-pre-wrap break-words max-h-[200px] overflow-auto mb-4 text-[#e0e6f3]">
{selected.exampleText}
                  </pre>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {selected.modalities.map(m => (
                      <span key={m} className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 text-muted">
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] font-mono text-muted mb-5">
                    <Tag className="inline w-3 h-3 mr-1" />
                    detectors: <span className="text-accent-blue">{selected.detectors.join(" · ")}</span>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setSel(null)}>Close</Button>
                    <Link href={{ pathname: "/scan", query: { text: selected.exampleText } }} prefetch={false}>
                      <Button variant="primary">Try it in the scanner →</Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
