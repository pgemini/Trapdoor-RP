"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { scanFile, scanSample, scanText } from "@/lib/api";
import type { ScanResult, SampleKey } from "@/lib/types";

export type StepKey = "ingest" | "extract" | "detect" | "score" | "sanitize" | "verdict";
export const STEPS: StepKey[] = ["ingest", "extract", "detect", "score", "sanitize", "verdict"];

export type Source =
  | { kind: "sample"; sampleKey: SampleKey; label: string }
  | { kind: "upload"; file: File; label: string }
  | { kind: "text";   text: string; label: string }
  | null;

export interface HistoryEntry {
  id: string;
  filename: string;
  verdict: ScanResult["verdict"];
  risk: number;
  when: number;
  payload: ScanResult;
}

const HISTORY_KEY = "trapdoor.history.v1";
const HISTORY_LIMIT = 8;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export function useScanJourney() {
  const [source, setSource] = useState<Source>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<StepKey | null>(null);
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());
  const [alerts,    setAlerts]    = useState<Set<StepKey>>(new Set());
  const [history,   setHistory]   = useState<HistoryEntry[]>([]);
  const cancelled = useRef(false);

  // load history from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const saveHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => {
      const next = [entry, ...prev.filter(h => h.id !== entry.id)].slice(0, HISTORY_LIMIT);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }, []);

  const reset = useCallback(() => {
    cancelled.current = true;
    setResult(null);
    setCurrent(null);
    setCompleted(new Set());
    setAlerts(new Set());
  }, []);

  const animate = useCallback(async (r: ScanResult) => {
    cancelled.current = false;
    setResult(r);
    setCompleted(new Set());
    setAlerts(new Set());

    const completedSet  = new Set<StepKey>();
    const alertsSet     = new Set<StepKey>();
    const advance = (s: StepKey, alert = false) => {
      completedSet.add(s);
      setCompleted(new Set(completedSet));
      if (alert) {
        alertsSet.add(s);
        setAlerts(new Set(alertsSet));
      }
    };

    // ingest
    if (cancelled.current) return;
    setCurrent("ingest");      await sleep(700);  advance("ingest");
    // extract
    if (cancelled.current) return;
    setCurrent("extract");     await sleep(900);  advance("extract");
    // detect (longer — each detector animates inside its panel)
    if (cancelled.current) return;
    setCurrent("detect");      await sleep(1900); advance("detect", r.findings.length > 0);
    // score
    if (cancelled.current) return;
    setCurrent("score");       await sleep(1300); advance("score", r.risk_score >= 0.85);
    // sanitize
    if (cancelled.current) return;
    setCurrent("sanitize");    await sleep(800);  advance("sanitize");
    // verdict
    if (cancelled.current) return;
    setCurrent("verdict");     await sleep(400);  advance("verdict", r.verdict !== "pass");
  }, []);

  const run = useCallback(async () => {
    if (!source || running) return;
    setRunning(true);
    reset();
    try {
      let r: ScanResult;
      if (source.kind === "sample")     r = await scanSample(source.sampleKey);
      else if (source.kind === "upload") r = await scanFile(source.file);
      else                                r = await scanText(source.text);
      await animate(r);
      saveHistory({
        id: r.scan_id,
        filename: r.filename,
        verdict: r.verdict,
        risk: r.risk_score,
        when: Date.now(),
        payload: r,
      });
    } finally {
      setRunning(false);
    }
  }, [source, running, reset, animate, saveHistory]);

  const replay = useCallback((entry: HistoryEntry) => {
    setSource({ kind: "sample", sampleKey: "resume", label: `replay · ${entry.id}` });
    setRunning(true);
    reset();
    void animate(entry.payload).finally(() => setRunning(false));
  }, [animate, reset]);

  return {
    source, setSource,
    result,
    running,
    current,
    completed,
    alerts,
    history,
    run,
    reset,
    replay,
    clearHistory,
  };
}
