# Trapdoor

> **Multimodal Prompt-Injection Defender**
> Hidden prompts. Caught early. Before the model falls for it.

Trapdoor sits between user-uploaded content and your LLM. It extracts text, metadata, OCR, and decoded byte planes out of documents, images, and video, runs a chain of injection detectors against every fragment, and forwards only **sanitized** context downstream.

```
+----------+    +-----------+    +-----------+    +-----------+    +-----+
|  UPLOAD  | -> |  EXTRACT  | -> |  DETECT   | -> | SANITIZE  | -> | LLM |
| PDF/IMG/ |    | text+ocr+ |    | 6 chain'd |    | strip /   |    |     |
|  DOCX/MD |    | meta+lsb  |    | detectors |    | quote /   |    |     |
|  VIDEO   |    |           |    |  + AI FRY |    | discard   |    |     |
+----------+    +-----------+    +-----------+    +-----------+    +-----+
```

---

## Quick start (Windows)

```powershell
.\start.ps1
```

That bootstraps a venv, installs deps, and launches the FastAPI server on `http://127.0.0.1:8000`. The frontend is served at `/`, API docs at `/docs`.

## Quick start (macOS / Linux)

```bash
./start.sh
```

## AI Foundry (optional)

By default Trapdoor runs in **heuristic-only** mode (no LLM calls). To enable the AI Foundry classifier:

```powershell
copy backend\.env.example backend\.env
# edit backend\.env and set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY
```

The "AI Foundry · live" badge in the nav lights up blue when enabled.

---

## What's in the box

| Layer | Files | Purpose |
|-------|-------|---------|
| **Schemas** | `backend/app/schemas.py` | Typed `Finding`, `Stage`, `ScanResult` |
| **Extractors** | `backend/app/extractors/*` | PDF (with per-char color), image (OCR + LSB), DOCX (metadata), text, video |
| **Detectors** | `backend/app/detectors/*` | Pattern, unicode, invisible-text, metadata, steganography, AI Foundry |
| **Scanner** | `backend/app/scanner.py` | Orchestrates extract → detect → sanitize → score |
| **Sanitizer** | `backend/app/sanitizer.py` | Strip / quote / discard offending spans |
| **API** | `backend/app/main.py` | FastAPI: `/api/scan`, `/api/scan/sample/{key}`, `/api/healthz` |
| **Samples** | `backend/app/samples.py` | Generates real attack files on first run |
| **UI** | `index.html`, `styles.css`, `script.js` | Hero, demo, gallery, pipeline, sanitized view |

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design.

---

## Attack coverage

| Modality | Attacks detected |
|----------|------------------|
| **PDF** | White-on-white text · metadata-field injection · pattern matches |
| **Image** | OCR-readable overlay · low-contrast text · LSB steganography · EXIF injection |
| **DOCX** | Core-property injection (subject / comments / keywords) · body patterns |
| **Markdown / text** | HTML-comment payloads · zero-width characters · confusable scripts |
| **Video** | Single-frame OCR injection (when OpenCV + Tesseract installed) |

Every detector returns a typed `Finding` with severity, confidence, evidence, location, and a sanitize action.

---

## Demo samples

Five real attack files are generated on first server startup under `backend/samples/`. Click any one in the UI to scan it through the live pipeline:

- `resume_candidate_42.pdf` — white-on-white instruction-override
- `invoice_scan.png` — OCR-readable low-contrast overlay
- `policy_memo.docx` — metadata field injection
- `support_meme.png` — LSB-encoded exfiltration payload
- `README_external.md` — HTML comment + ZWSP

Or drop any file of your own into the **Upload your own file** card.

---

## API cheatsheet

```
GET  /api/healthz                       → { ok, ai_foundry, version }
GET  /api/samples                       → list of demo samples
POST /api/scan       (multipart file)   → ScanResult
POST /api/scan/sample/{key}             → ScanResult for a bundled sample
GET  /api/samples/{key}/download        → download the raw demo file
```

`ScanResult` shape (Pydantic-validated):

```json
{
  "scan_id": "…",
  "filename": "resume_candidate_42.pdf",
  "modality": "document/pdf",
  "verdict": "block",
  "risk_score": 0.94,
  "findings": [ { "detector":"…", "severity":"…", "category":"…",
                  "confidence":0.92, "evidence":"…", "location":"page-1",
                  "sanitize_action":"strip" } ],
  "stages":   [ { "name":"extract:document/pdf", "status":"ok", "duration_ms":42 } ],
  "sanitized_context": "…",
  "blocked_spans":     [ "…" ],
  "ai_foundry_used":   false
}
```

---

## Team

Ravi Bansal · Prateek
