import type { HealthInfo, SampleDescriptor, SampleKey, ScanResult } from "./types";

// In production (Vercel) set NEXT_PUBLIC_API_BASE to the Render backend URL,
// e.g. https://trapdoor-api.onrender.com. In dev the value is "", which makes
// requests hit Next's same-origin proxy (configured in next.config.ts).
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export async function getHealth(): Promise<HealthInfo> {
  const r = await fetch(`${BASE}/api/healthz`, { cache: "no-store" });
  if (!r.ok) throw new Error(`healthz ${r.status}`);
  return r.json();
}

export async function listSamples(): Promise<SampleDescriptor[]> {
  const r = await fetch(`${BASE}/api/samples`, { cache: "no-store" });
  if (!r.ok) throw new Error(`samples ${r.status}`);
  const data = await r.json();
  return data.samples ?? [];
}

export async function scanSample(key: SampleKey): Promise<ScanResult> {
  const r = await fetch(`${BASE}/api/scan/sample/${key}`, { method: "POST" });
  if (!r.ok) throw new Error(`scan/sample ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export async function scanFile(file: File): Promise<ScanResult> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/api/scan`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(`scan ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export async function scanText(text: string, filename = "pasted-text.txt"): Promise<ScanResult> {
  const r = await fetch(`${BASE}/api/scan/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, filename }),
  });
  if (!r.ok) throw new Error(`scan/text ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
