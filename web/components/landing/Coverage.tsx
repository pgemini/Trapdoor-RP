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
      "BIDI overrides (Trojan Source)",
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
      "<script>/SSTI rendered as graphics",
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
      "markup leaking via transcript",
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
      "instructions hidden in tag fields",
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
      "encoded payloads in cell text",
    ],
  },
  {
    emoji: "🧾",
    title: "Text & Markdown",
    items: [
      "zero-width chars + tag-character carriers",
      "Unicode look-alikes + math-style disguises",
      "role-spoofing prefixes",
      "jailbreak / DAN / god-mode templates",
      "homograph URLs · javascript: links · data: URIs",
    ],
  },
  {
    emoji: "🔗",
    title: "Links & encodings",
    items: [
      "punycode hosts (xn--…) decoded + re-checked",
      "raw-IP URLs · URL shorteners",
      "?api_key= / ?bearer= query strings",
      "base64 / hex / ROT13 unwrapped recursively",
      "javascript: / executable data: URIs",
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
            Seven modalities. Ten detectors. One safe context.
          </h2>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">
            Every modality has its own bag of injection tricks. Trapdoor ships
            with detectors purpose-built for each — and a resilience layer
            (encoding, BIDI, URL, markup) for the attacks the model itself
            can&apos;t see.
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
