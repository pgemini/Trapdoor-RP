"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Nav }            from "@/components/nav/Nav";
import { Button }         from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardSub, CardTitle } from "@/components/ui/Card";
import { Sidebar }        from "@/components/scan/Sidebar";
import { Stepper }        from "@/components/scan/Stepper";
import { PreviewCard }    from "@/components/scan/PreviewCard";
import { IngestPanel }    from "@/components/scan/IngestPanel";
import { ExtractPanel }   from "@/components/scan/ExtractPanel";
import { DetectPanel }    from "@/components/scan/DetectPanel";
import { ScorePanel }     from "@/components/scan/ScorePanel";
import { SanitizePanel }  from "@/components/scan/SanitizePanel";
import { VerdictPanel }   from "@/components/scan/VerdictPanel";
import { PatternExplorer } from "@/components/scan/PatternExplorer";

import { useScanJourney, STEPS, type StepKey } from "@/lib/useScanJourney";
import { useToast }       from "@/components/ui/Toast";
import { SAMPLES, type SampleMeta } from "@/lib/samples";
import type { Finding, SampleKey } from "@/lib/types";

export default function ScanPage() {
  return (
    <Suspense fallback={null}>
      <ScanPageInner />
    </Suspense>
  );
}

function ScanPageInner() {
  const journey = useScanJourney();
  const { toast } = useToast();
  const params  = useSearchParams();

  // /scan?text=… opens the page pre-filled with a paste-text source.
  useEffect(() => {
    const t = params?.get("text");
    if (t && !journey.source) {
      journey.setSource({ kind: "text", text: t, label: `from attack catalog · ${t.length} chars` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll the page to the currently-animating step. We compute the
  // target Y manually (not scrollIntoView) so we can offset for the sticky
  // nav and cancel any in-flight smooth scrolls cleanly.
  useEffect(() => {
    if (!journey.current) return;
    const el = document.getElementById(`step-${journey.current}`);
    if (!el) return;
    const STICKY_OFFSET = 80; // sticky-nav height + a little breathing room
    requestAnimationFrame(() => {
      const y = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
  }, [journey.current]);

  // Build a findings-by-location index once per result so child panels
  // don't re-compute it.
  const findingsByLoc = useMemo(() => {
    const m = new Map<string, Finding[]>();
    if (!journey.result) return m;
    for (const f of journey.result.findings) {
      const k = f.location ?? "(unknown)";
      const arr = m.get(k) ?? [];
      arr.push(f);
      m.set(k, arr);
    }
    return m;
  }, [journey.result]);

  const fragments = journey.result?.extracted_fragments ?? [];

  type PreviewArgs =
    | { kind: null }
    | { kind: "sample"; sampleKey: SampleKey }
    | { kind: "upload"; file: File }
    | { kind: "text"; text: string };
  function previewProps(): PreviewArgs {
    const s = journey.source;
    if (!s) return { kind: null };
    if (s.kind === "sample") return { kind: "sample", sampleKey: s.sampleKey };
    if (s.kind === "upload") return { kind: "upload", file: s.file };
    return { kind: "text", text: s.text };
  }

  function previewKindLabel() {
    const s = journey.source;
    if (!s) return "—";
    if (s.kind === "sample") return (SAMPLES.find(x => x.key === s.sampleKey)?.modality) ?? "sample";
    if (s.kind === "upload") return s.file.type || "binary";
    return "text/plain · pasted";
  }

  const onSelectSample = (key: SampleKey) => {
    const meta = SAMPLES.find(s => s.key === key);
    journey.setSource({ kind: "sample", sampleKey: key, label: `demo sample · ${meta?.label ?? key}` });
    journey.reset();
  };
  const onSelectFile = (file: File) => {
    journey.setSource({ kind: "upload", file, label: `upload · ${file.name}` });
    journey.reset();
    toast(`Ready: ${file.name}`, "success");
  };
  const onSelectText = (text: string) => {
    journey.setSource({ kind: "text", text, label: `paste · ${text.length} chars` });
    journey.reset();
  };

  const onScan = async () => {
    if (!journey.source) {
      toast("Pick a sample, upload, or paste text first.", "error");
      return;
    }
    await journey.run();
  };

  const sourceLabel = journey.source?.label ?? "";
  const fileName = (() => {
    if (journey.result?.filename) return journey.result.filename;
    const s = journey.source;
    if (!s) return "—";
    if (s.kind === "upload") return s.file.name;
    if (s.kind === "sample") return SAMPLES.find(x => x.key === s.sampleKey)?.filename ?? `${s.sampleKey}.bin`;
    return "pasted-text.txt";
  })();

  const headerSub = (() => {
    if (journey.result) {
      const kb = (journey.result.size_bytes / 1024).toFixed(1);
      return `${kb} KB · ${journey.result.mime} · ${journey.result.modality}`;
    }
    if (journey.source?.kind === "upload") {
      const f = journey.source.file;
      return `${(f.size / 1024).toFixed(1)} KB · ${f.type || "unknown"}`;
    }
    if (journey.source?.kind === "sample") {
      const key = journey.source.sampleKey;
      const meta = SAMPLES.find(s => s.key === key);
      return meta ? `demo · ${meta.subtitle}` : "demo sample";
    }
    if (journey.source?.kind === "text") return `${journey.source.text.length} chars pasted`;
    return "Pick a sample, upload a file, or paste text to begin.";
  })();

  return (
    <div className="min-h-screen">
      <Nav variant="scan" />

      <div className="max-w-[1480px] mx-auto px-6 pb-16 pt-6 grid gap-6 items-start grid-cols-1 lg:grid-cols-[340px_1fr]">
        <Sidebar
          onSelectSample={onSelectSample}
          onSelectFile={onSelectFile}
          onSelectText={onSelectText}
          onScan={onScan}
          result={journey.result}
          history={journey.history}
          onReplay={journey.replay}
          onClearHistory={journey.clearHistory}
        />

        <div className="flex flex-col gap-4 min-w-0">
          {/* Header card */}
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold tracking-tight break-all">{fileName || "No file selected"}</h1>
                  <div className="text-xs text-muted font-mono mt-1">{headerSub}</div>
                </div>
                <Button
                  variant="primary"
                  onClick={onScan}
                  disabled={!journey.source || journey.running}
                  className="min-w-[200px] justify-center"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] mr-2" />
                  {journey.running ? "Scanning…" : "Run Trapdoor scan"}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Preview card */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardSub>{previewKindLabel()}</CardSub>
            </CardHeader>
            <CardBody>
              <PreviewCard {...previewProps()} />
            </CardBody>
          </Card>

          {/* Journey card */}
          <Card>
            <CardHeader>
              <CardTitle>Journey</CardTitle>
              <Stepper
                current={journey.current ?? ""}
                completed={journey.completed as Set<string>}
                alerts={journey.alerts as Set<string>}
                onJump={(s) => document.getElementById(`step-${s}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              />
            </CardHeader>

            <div className="divide-y divide-line">
              <JStep step="ingest" num="01" title="Ingest" meta="classify the upload"
                running={journey.current === "ingest"} done={journey.completed.has("ingest")} alert={journey.alerts.has("ingest")}>
                {journey.result
                  ? <IngestPanel result={journey.result} source={sourceLabel} />
                  : <Idle text="Click Run Trapdoor scan to begin." />}
              </JStep>

              <JStep step="extract" num="02" title="Extract" meta="pull every fragment from the file"
                running={journey.current === "extract"} done={journey.completed.has("extract")} alert={journey.alerts.has("extract")}>
                {journey.completed.has("extract") && journey.result
                  ? <ExtractPanel fragments={fragments} findingsByLoc={findingsByLoc} />
                  : <Idle text="Waiting for the extractor." />}
              </JStep>

              <JStep step="detect" num="03" title="Detect" meta="six detectors inspect every fragment"
                running={journey.current === "detect"} done={journey.completed.has("detect")} alert={journey.alerts.has("detect")}>
                {journey.completed.has("detect") && journey.result
                  ? <DetectPanel result={journey.result} />
                  : <Idle text="Detectors haven't run yet." />}
              </JStep>

              <JStep step="score" num="04" title="Score" meta="aggregate findings into a risk number"
                running={journey.current === "score"} done={journey.completed.has("score")} alert={journey.alerts.has("score")}>
                {journey.completed.has("score") && journey.result
                  ? <ScorePanel result={journey.result} />
                  : <Idle text="No score yet." />}
              </JStep>

              <JStep step="sanitize" num="05" title="Sanitize" meta="strip, quote, or discard offending spans"
                running={journey.current === "sanitize"} done={journey.completed.has("sanitize")} alert={journey.alerts.has("sanitize")}>
                {journey.completed.has("sanitize") && journey.result
                  ? <SanitizePanel result={journey.result} fragments={fragments} findingsByLoc={findingsByLoc} />
                  : <Idle text="Output not yet sanitized." />}
              </JStep>

              <JStep step="verdict" num="06" title="Verdict" meta="block / review / pass"
                running={journey.current === "verdict"} done={journey.completed.has("verdict")} alert={journey.alerts.has("verdict")}>
                {journey.completed.has("verdict") && journey.result
                  ? <VerdictPanel result={journey.result} />
                  : <Idle text="Verdict pending." />}
              </JStep>
            </div>
          </Card>

          {/* Innovation widgets */}
          <PatternExplorer />
        </div>
      </div>
    </div>
  );
}

function JStep({ step, num, title, meta, running, done, alert, children }: {
  step: StepKey; num: string; title: string; meta: string;
  running: boolean; done: boolean; alert: boolean; children: React.ReactNode;
}) {
  const state = alert ? "alert" : done ? "done" : running ? "running" : "pending";
  const wrap =
    state === "running" ? "bg-gradient-to-b from-accent-blue/5 to-transparent border-l-2 border-accent-blue" :
    state === "alert"   ? "bg-gradient-to-b from-sev-danger/5 to-transparent border-l-2 border-sev-danger" :
    state === "pending" ? "opacity-30" :
                          "";
  const numCls = state === "alert"
    ? "text-sev-danger bg-sev-danger/10 border-sev-danger/20"
    : "text-accent-blue bg-accent-blue/10 border-accent-blue/20";
  return (
    <section id={`step-${step}`} className={`px-6 py-5 transition-opacity ${wrap}`}>
      <header className="flex items-center gap-4 mb-3">
        <span className={`font-mono text-[10px] font-bold px-2 py-[3px] rounded border ${numCls}`}>{num}</span>
        <h3 className="text-base font-bold">{title}</h3>
        <span className="text-xs text-muted font-mono ml-auto">{meta}</span>
      </header>
      {children}
    </section>
  );
}

function Idle({ text }: { text: string }) {
  return <div className="text-muted text-sm py-6 text-center">{text}</div>;
}
