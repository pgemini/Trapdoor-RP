// Landing page — backend health badge + smooth-scroll nav links.
const API_BASE = (() => {
  const host = location.host || "";
  if (host === "127.0.0.1:8000" || host === "localhost:8000") return location.origin;
  return "http://127.0.0.1:8000";
})();

const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

async function checkBackend() {
  const badge = document.querySelector("#backendStatus");
  if (!badge) return;
  try {
    const r = await fetch(`${API_BASE}/api/healthz`);
    if (!r.ok) throw new Error("non-200");
    const data = await r.json();
    badge.classList.add("live");
    badge.classList.toggle("foundry", !!data.ai_foundry);
    const parts = [];
    parts.push(data.ai_foundry ? "AI Foundry" : "heuristic");
    if (data.transcription && data.transcription.enabled) parts.push("Whisper");
    badge.querySelector(".bs-label").textContent = "live · " + parts.join(" + ");
  } catch {
    badge.classList.add("down");
    badge.querySelector(".bs-label").textContent = "backend offline";
  }
}

$$('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const el = document.querySelector(id);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });
});

checkBackend();
