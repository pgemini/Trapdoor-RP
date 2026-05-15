from __future__ import annotations

import logging
from pathlib import Path

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .ai_foundry import classifier
from .config import settings
from .samples import (SAMPLE_DESCRIPTORS, get_sample_bytes, list_samples,
                      prebuild_all)
from .scanner import scan_bytes
from .transcriber import transcriber

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s · %(message)s")
log = logging.getLogger("trapdoor")

app = FastAPI(
    title="Trapdoor",
    version="0.1.0",
    description="Multimodal prompt-injection defender",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    log.info("AI Foundry classifier enabled: %s", classifier.enabled)
    log.info("Whisper transcription enabled: %s (mode=%s)", transcriber.enabled, transcriber.mode or "—")
    prebuild_all()
    log.info("Samples ready in %s", Path(__file__).resolve().parent.parent / "samples")


@app.get("/api/healthz")
def healthz() -> dict:
    return {
        "ok": True,
        "version": "0.1.0",
        "ai_foundry": classifier.enabled,
        "transcription": {
            "enabled": transcriber.enabled,
            "mode": transcriber.mode or None,
        },
        "max_upload_mb": settings.trapdoor_max_upload_mb,
    }


@app.get("/api/samples")
def samples() -> dict:
    return {"samples": list_samples()}


@app.post("/api/scan")
async def scan_upload(file: UploadFile = File(...)) -> JSONResponse:
    data = await file.read()
    max_bytes = settings.trapdoor_max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"file too large ({len(data)} > {max_bytes} bytes)",
        )
    result = scan_bytes(data, file.filename or "upload.bin")
    return JSONResponse(result.model_dump(mode="json"))


@app.post("/api/scan/text")
def scan_text(body: dict = Body(...)) -> JSONResponse:
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="`text` is required")
    if len(text) > settings.trapdoor_max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="text too large")
    filename = body.get("filename") or "pasted-text.txt"
    if not filename.lower().endswith((".txt", ".md", ".markdown", ".html", ".htm", ".json", ".csv")):
        filename = "pasted-text.txt"
    result = scan_bytes(text.encode("utf-8"), filename)
    return JSONResponse(result.model_dump(mode="json"))


@app.post("/api/scan/sample/{key}")
def scan_sample(key: str) -> JSONResponse:
    if key not in SAMPLE_DESCRIPTORS:
        raise HTTPException(status_code=404, detail=f"unknown sample '{key}'")
    data, name = get_sample_bytes(key)
    result = scan_bytes(data, name)
    return JSONResponse(result.model_dump(mode="json"))


@app.get("/api/samples/{key}/download")
def download_sample(key: str) -> FileResponse:
    if key not in SAMPLE_DESCRIPTORS:
        raise HTTPException(status_code=404, detail=f"unknown sample '{key}'")
    from .samples import get_sample_path
    p = get_sample_path(key)
    return FileResponse(p, filename=p.name)


# --- Root route -------------------------------------------------------------
# The UI is the Next.js app served on port 3000. Hitting the API server's root
# returns a friendly pointer so people don't get a 404 if they open :8000 by
# accident.
@app.get("/")
def root() -> dict:
    return {
        "service": "trapdoor-api",
        "ui": "http://127.0.0.1:3000",
        "docs": "/docs",
        "health": "/api/healthz",
    }
