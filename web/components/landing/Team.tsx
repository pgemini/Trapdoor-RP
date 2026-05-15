"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/util";

interface Member {
  initials: string;
  name: string;
  role: string;
  team: string;
  gradient: string;
}

const MEMBERS: Member[] = [
  {
    initials: "RB",
    name: "Ravi Bansal",
    role: "Lead",
    team: "Security Innovation",
    gradient: "linear-gradient(135deg, #00a4ef 0%, #7c5cff 100%)",
  },
  {
    initials: "PG",
    name: "Prateek Gemini",
    role: "Platform & UI",
    team: "Security Innovation",
    gradient: "linear-gradient(135deg, #7c5cff 0%, #f25022 100%)",
  },
];

export function Team() {
  return (
    <section className="relative border-b border-line">
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
            The team
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Built by two for the model-safety bar.
          </h2>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">
            Trapdoor is an end-to-end submission: security research, pipeline
            engineering, AI Foundry integration and the interface you&apos;re
            looking at.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MEMBERS.map((m, i) => (
            <motion.div
              key={m.initials}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className={cn(
                "glass rounded-xl p-5 flex items-center gap-4",
                "border-line hover:border-white/15 transition-colors",
              )}
            >
              <div
                className={cn(
                  "h-14 w-14 shrink-0 rounded-full",
                  "flex items-center justify-center",
                  "text-white font-semibold text-[15px] tracking-wider",
                  "shadow-glow border border-white/15",
                )}
                style={{ background: m.gradient }}
              >
                {m.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-semibold tracking-tight text-white truncate">
                  {m.name}
                </div>
                <div className="mt-0.5 text-[12px] text-muted font-mono uppercase tracking-[0.14em]">
                  {m.role} · {m.team}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default Team;
