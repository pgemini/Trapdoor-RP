"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/util";

interface CoverageItem {
  emoji: string;
  title: string;
  /** Tag-line under the title. */
  tagline: string;
}

const COVERAGE: CoverageItem[] = [
  { emoji: "📄", title: "Documents",         tagline: "PDF · DOCX" },
  { emoji: "🖼️", title: "Images",            tagline: "PNG · JPG · WEBP · GIF" },
  { emoji: "🎬", title: "Video",             tagline: "MP4 · MOV · WEBM · MKV" },
  { emoji: "🎧", title: "Audio",             tagline: "MP3 · WAV · FLAC · M4A" },
  { emoji: "📊", title: "Spreadsheets",      tagline: "XLSX · XLSM" },
  { emoji: "🧾", title: "Text & Markdown",   tagline: "TXT · MD · HTML · JSON · CSV" },
  { emoji: "🔗", title: "Links & encodings", tagline: "Across every other modality" },
];

export function Coverage() {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
      }}
    >
      {COVERAGE.map((c, i) => (
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
            {i + 1}
          </div>
          <div className="mt-4 text-[15px] font-semibold tracking-tight text-white">
            {c.title}
          </div>
          <div className="mt-1 text-[11px] font-mono text-muted-dim">
            {c.tagline}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default Coverage;
