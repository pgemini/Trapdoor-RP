"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <motion.div
        className="text-3xl font-extrabold tracking-tight text-gradient"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Trapdoor
        <span className="inline-block ml-2 text-muted text-sm font-mono font-normal">loading…</span>
      </motion.div>
    </div>
  );
}
