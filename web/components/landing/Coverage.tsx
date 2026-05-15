"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/util";

interface CoverageItem {
  emoji: string;
  title: string;
  items: string[];
}

const COVERAGE: CoverageItem[] = [
  {
    emoji: "📄",
    title: "Documents",
    items: [
      "white/invisible text",
      "hidden HTML comments",
      "tracked changes & comments",
      "metadata & XMP injection",
    ],
  },
  {
    emoji: "🖼️",
    title: "Images",
    items: [
      "OCR overlays",
      "low-contrast steganography",
      "LSB-encoded payloads",
      "EXIF instruction fields",
    ],
  },
  {
    emoji: "🎬",
    title: "Video",
    items: [
      "single-frame injections",
      "subtitle & CC payloads",
      "audio-track override",
      "sampled vision scanning",
    ],
  },
  {
    emoji: "🎧",
    title: "Audio",
    items: [
      "ID3 / Vorbis / RIFF INFO tags",
      "MP4 atom metadata",
      "spoken content via Whisper",
      "podcast transcripts",
    ],
  },
  {
    emoji: "📊",
    title: "Spreadsheets",
    items: [
      "cell injections",
      "cell comments",
      "named ranges",
      "workbook properties, formula vectors",
    ],
  },
  {
    emoji: "🧾",
    title: "Text & Markdown",
    items: [
      "zero-width characters",
      "Unicode look-alikes",
      "role-spoofing prefixes",
      "jailbreak templates",
    ],
  },
];

export function Coverage() {
  return (
    <section
      id="coverage"
      className="relative border-b border-line bg-bg-elevated/40"
    >
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
            Coverage
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Six modalities. One model-safety surface.
          </h2>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">
            Every modality has its own bag of injection tricks. Trapdoor ships
            with detectors purpose-built for each.
          </p>
        </motion.div>

        <div
          className="mt-10 grid gap-4"
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
                "glass rounded-xl p-5",
                "border-line hover:border-white/15 transition-colors",
              )}
            >
              <div className="text-3xl leading-none">{c.emoji}</div>
              <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-white">
                {c.title}
              </h3>
              <ul className="mt-3 space-y-1.5">
                {c.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[12.5px] text-muted leading-snug"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        "bg-accent-blue shadow-[0_0_6px_rgba(0,164,239,0.6)]",
                      )}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Coverage;
