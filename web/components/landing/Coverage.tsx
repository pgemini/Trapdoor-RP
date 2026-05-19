"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ATTACKS } from "@/lib/attackCatalog";
import { cn } from "@/lib/util";

interface CoverageItem {
  emoji: string;
  title: string;
  /** Catalog modality keys folded into this card (used to compute the count). */
  modalityKeys: string[];
  /** Tag-line under the count. */
  tagline: string;
}

const COVERAGE: CoverageItem[] = [
  { emoji: "📄", title: "Documents",        modalityKeys: ["pdf", "docx"],     tagline: "PDF · DOCX" },
  { emoji: "🖼️", title: "Images",           modalityKeys: ["image"],            tagline: "PNG · JPG · WEBP · GIF" },
  { emoji: "🎬", title: "Video",            modalityKeys: ["video"],            tagline: "MP4 · MOV · WEBM · MKV" },
  { emoji: "🎧", title: "Audio",            modalityKeys: ["audio"],            tagline: "MP3 · WAV · FLAC · M4A" },
  { emoji: "📊", title: "Spreadsheets",     modalityKeys: ["spreadsheet"],      tagline: "XLSX · XLSM" },
  { emoji: "🧾", title: "Text & Markdown",  modalityKeys: ["text", "markdown"], tagline: "TXT · MD · HTML · JSON · CSV" },
  // Cross-cutting modality — counted by attacks whose mechanism is link/encoding
  // even if surfaced through one of the other file types.
  { emoji: "🔗", title: "Links & encodings", modalityKeys: ["__cross"],          tagline: "Across every other modality" },
];

// Attack-category IDs that are "links/encodings" by mechanism
// (the catalog uses modalities for *delivery*, not mechanism).
const CROSS_LINKS_ENCODINGS = new Set([
  "encoded_payload", "homograph_url",
]);

export function Coverage() {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of COVERAGE) {
      if (c.modalityKeys[0] === "__cross") {
        map[c.title] = ATTACKS.filter(a => CROSS_LINKS_ENCODINGS.has(a.id)).length;
        continue;
      }
      const keys = new Set(c.modalityKeys);
      map[c.title] = ATTACKS.filter(a => a.modalities.some(m => keys.has(m))).length;
    }
    return map;
  }, []);

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
      }}
    >
      {COVERAGE.map((c, i) => {
        const n = counts[c.title];
        return (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            whileHover={{ y: -3 }}
            className={cn(
              "glass rounded-xl p-6 text-center",
              "border-line hover:border-accent-blue/40 transition-colors",
            )}
          >
            <div className="text-4xl leading-none mb-3">{c.emoji}</div>
            <div className="text-[44px] font-extrabold tracking-tight bg-gradient-to-br from-white to-[#a0d5ff] bg-clip-text text-transparent leading-none">
              {n}
            </div>
            <div className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-muted">
              attack vectors
            </div>
            <div className="mt-4 text-[15px] font-semibold tracking-tight text-white">
              {c.title}
            </div>
            <div className="mt-1 text-[11px] font-mono text-muted-dim">
              {c.tagline}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default Coverage;
