# Trapdoor — Architecture

```
                        ┌───────────────────────────────────────┐
                        │              Browser                  │
                        │   index.html / styles.css / script.js │
                        └──────────────────┬────────────────────┘
                                           │  multipart upload  /  JSON
                                           ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │                      FastAPI · app.main                          │
        │   POST /api/scan            POST /api/scan/sample/{key}          │
        │   GET  /api/healthz         GET  /api/samples                    │
        └──────────────────────────────────┬───────────────────────────────┘
                                           │
                                           ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │                      app.scanner.scan_bytes                     │
        │      orchestrates: extract → detect → sanitize → score          │
        └─────────┬────────────────┬────────────────────┬──────────────────┘
                  ▼                ▼                    ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌────────────────────────┐
        │   Extractor     │ │   Detectors[]   │ │      Sanitizer          │
        │   (by MIME)     │ │   (chain of 6)  │ │  strip / quote / drop  │
        └────────┬────────┘ └────────┬────────┘ └────────────┬───────────┘
                 │                   │                       │
                 ▼                   ▼                       ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌────────────────────────┐
        │ ExtractedContent│ │   Finding[]     │ │   sanitized_context    │
        │ ├ fragments     │ │   severity      │ │   blocked_spans[]      │
        │ ├ raw_metadata  │ │   confidence    │ │                        │
        │ └ notes         │ │   evidence      │ │                        │
        └─────────────────┘ │   sanitize_act  │ └────────────────────────┘
                            └─────────────────┘
                                     │
                                     ▼
                       ┌──────────────────────────┐
                       │   AI Foundry (optional)  │
                       │   Azure OpenAI classify  │
                       │   → injection? + cat     │
                       └──────────────────────────┘
```

## Core types (`backend/app/schemas.py`)

- **`ExtractedFragment`** — a single piece of content pulled from a file (`source`, `kind`, `text`, `attrs`). `kind` is one of `text | ocr | metadata | comment | decoded`. `attrs.visibility = "invisible"` marks white-on-white PDF text.
- **`ExtractedContent`** — list of fragments + raw metadata + extractor notes.
- **`Finding`** — `detector`, `severity` (`info|low|med|high|critical`), `category`, `confidence` (0–1), `evidence`, `location`, `sanitize_action` (`none|strip|quote|discard`).
- **`Stage`** — one timed step in the pipeline (`name`, `status`, `detail`, `duration_ms`) — the frontend streams these into the **Pipeline** tab.
- **`ScanResult`** — the full envelope returned by `POST /api/scan`.

## Extractors (`backend/app/extractors/`)

Picked by file extension in `registry.pick_extractor(filename)`.

| Extractor | What it pulls | Notes |
|-----------|---------------|-------|
| `pdf_extractor.PDFExtractor` | Per-character text + color → marks invisible (≥ 0.95 RGB) fragments separately. Metadata. | Uses `pdfplumber`. CMYK is approximated to RGB. |
| `image_extractor.ImageExtractor` | OCR (if Tesseract available) · LSB-plane entropy + decoded ASCII · EXIF · histogram heuristic | `pytesseract` is optional. |
| `docx_extractor.DocxExtractor` | Body paragraphs + core properties (author/title/subject/comments/keywords) | python-docx. |
| `text_extractor.TextExtractor` | Body + every HTML comment as a `kind="comment"` fragment | UTF-8 with latin-1 fallback. |
| `video_extractor.VideoExtractor` | Frame-by-frame OCR at 1 fps | Optional (cv2 + pytesseract). |

## Detectors (`backend/app/detectors/`)

All six run on every scan. Each returns `Finding[]`.

| Detector | Strategy |
|----------|----------|
| `pattern_detector.PatternDetector` | Curated regex set (instruction-override, role-spoofing, exfiltration, jailbreak, guardrail-removal, score-manipulation). Bumps confidence when fragment is invisible / metadata / comment. |
| `unicode_detector.UnicodeDetector` | Counts ZWSP / ZWNJ / ZWJ / WJ / BOM. Detects Latin-dominant strings with foreign-script characters (confusables). |
| `invisible_text.InvisibleTextDetector` | Flags any fragment that extractors tagged `visibility=invisible`. |
| `metadata_detector.MetadataDetector` | Instruction-shaped text inside metadata fields. |
| `steganography.SteganographyDetector` | Inspects `kind="decoded"` fragments — high severity when decoded text contains exfil targets. |
| `llm_detector.LLMDetector` | Calls Azure AI Foundry to classify each substantial fragment. Skipped if no key is set. |

## Sanitizer (`backend/app/sanitizer.py`)

For each fragment:

- `visibility=invisible` → **blocked** (never reach the LLM).
- `kind=comment` → **blocked**.
- `kind=metadata` → reframed as `[metadata.x] …` (never instructional).
- Findings request `discard` → blocked entirely.
- Findings request `quote` (or kind is `ocr`/`decoded`) → wrapped in an `untrusted` fenced block.
- All passing text is unicode-normalized (NFKC) with zero-width chars stripped.

The result becomes `sanitized_context` — exactly the bytes downstream code should pass to the LLM.

## Risk score & verdict (`backend/app/scanner.py`)

Each finding is treated as an independent probability that the file is malicious. The scanner aggregates `1 − ∏(1 − severity_weight × confidence)` into a 0–1 risk score, then:

- `risk ≥ 0.85` or any `high`/`critical` finding → **block**
- `risk ≥ 0.35` → **review**
- otherwise → **pass**

## AI Foundry integration (`backend/app/ai_foundry.py`)

Single-class wrapper around `AzureOpenAI`. JSON-mode classification with a strict system prompt. The classifier exposes `enabled` and the LLM detector short-circuits when it's off. A module-level singleton avoids re-creating the SDK client per request.

## Frontend (`index.html` + `script.js`)

- Pings `/api/healthz` on load — the nav badge shows `live · heuristic` (green) or `live · AI Foundry` (blue) when reachable, `backend offline` (red) otherwise.
- File-card click → `POST /api/scan/sample/{key}`.
- Upload-card → `POST /api/scan` with the user's file.
- Animates the `stages[]` array into the Pipeline tab, then renders `findings`, `verdict`, and `sanitized_context`.

## Extension points

- **New modality**: drop a class in `backend/app/extractors/`, register it in `registry._BY_EXT`.
- **New attack pattern**: append a tuple to `pattern_detector._PATTERNS`.
- **New detector**: subclass `Detector`, return `Finding[]`, add it to `detectors.all_detectors()`.
- **New sanitize policy**: edit `sanitizer.sanitize()` — every detector already declares the action it wants.
