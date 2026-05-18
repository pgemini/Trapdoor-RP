"use client";

import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[80vh] grid place-items-center px-6">
      <div className="text-center">
        <motion.div
          className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-grad shadow-glow grid place-items-center"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ShieldAlert className="w-7 h-7 text-white" />
        </motion.div>
        <div className="text-xl font-bold tracking-tight mb-1.5">
          Loading the <span className="text-gradient">attack catalog</span>…
        </div>
        <div className="text-xs font-mono text-muted">17 categories · 7 modalities · ten detectors</div>
        <div className="mt-6 mx-auto h-1 w-64 rounded-full bg-white/5 overflow-hidden relative">
          <motion.div
            className="h-full w-1/3 bg-grad rounded-full"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
