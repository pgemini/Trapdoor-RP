"""Audio / video speech-to-text.

Supports three modes, picked in this order:

  1. Azure OpenAI Whisper deployment  (AZURE_WHISPER_DEPLOYMENT)
        POST  {resource}/openai/deployments/{deployment}/audio/transcriptions
        ?api-version=...
        - Works whether the resource is classic Azure OpenAI
          (foo.openai.azure.com) or an Azure AI Foundry resource
          (foo.services.ai.azure.com). We parse the host from
          AZURE_OPENAI_ENDPOINT or use AZURE_REALTIME_ENDPOINT directly.

  2. Direct OpenAI (OPENAI_API_KEY)
        client.audio.transcriptions.create(model="whisper-1", ...)

  3. Disabled — returns None and Trapdoor falls back to metadata-only.
"""
from __future__ import annotations

import io
import logging
from typing import Optional
from urllib.parse import urlparse

import httpx

from .config import settings

log = logging.getLogger("trapdoor.transcriber")

_MAX_BYTES = 25 * 1024 * 1024


def _resource_root() -> str:
    """Derive the resource root (scheme://host) from configured endpoints."""
    for candidate in (settings.azure_realtime_endpoint, settings.azure_openai_endpoint):
        if not candidate:
            continue
        p = urlparse(candidate)
        if p.scheme and p.netloc:
            return f"{p.scheme}://{p.netloc}"
    return ""


class WhisperTranscriber:
    def __init__(self) -> None:
        self._mode = ""  # "azure-deployment" | "openai" | ""
        self._client = None
        self._http: httpx.Client | None = None
        self._deployment = settings.azure_whisper_deployment
        self._api_key = settings.azure_openai_api_key
        self._api_version = settings.azure_openai_api_version or "2024-10-21"
        self._resource_root = _resource_root()

        if self._deployment and self._api_key and self._resource_root:
            try:
                self._http = httpx.Client(timeout=120.0)
                self._mode = "azure-deployment"
                log.info(
                    "Whisper: Azure deployment '%s' at %s",
                    self._deployment, self._resource_root,
                )
            except Exception as e:
                log.warning("Whisper httpx init failed: %s", e)
        elif settings.openai_api_key:
            try:
                from openai import OpenAI  # type: ignore

                self._client = OpenAI(api_key=settings.openai_api_key)
                self._mode = "openai"
                log.info("Whisper: direct OpenAI whisper-1 mode")
            except Exception as e:
                log.warning("OpenAI Whisper init failed: %s", e)

    @property
    def enabled(self) -> bool:
        return bool(self._http) or bool(self._client)

    @property
    def mode(self) -> str:
        return self._mode

    def transcribe(self, data: bytes, filename: str) -> Optional[str]:
        if not self.enabled or not data:
            return None
        if len(data) > _MAX_BYTES:
            log.warning("Skipping transcribe: %s is %d bytes (limit %d).",
                        filename, len(data), _MAX_BYTES)
            return None

        # --- mode 1: Azure deployment via REST (with 429 retry) ---
        if self._mode == "azure-deployment" and self._http:
            url = (
                f"{self._resource_root}/openai/deployments/{self._deployment}"
                f"/audio/transcriptions?api-version={self._api_version}"
            )
            import time as _time
            for attempt in range(3):
                try:
                    r = self._http.post(
                        url,
                        headers={"api-key": self._api_key},
                        files={"file": (filename, data, _mime_for(filename))},
                    )
                    if r.status_code == 429:
                        # honour Retry-After if present, else exponential 5/10/20s
                        wait = int(r.headers.get("retry-after", 0)) or (5 * (2 ** attempt))
                        log.warning("Whisper 429: retrying in %ds (attempt %d/3)", wait, attempt + 1)
                        _time.sleep(min(wait, 30))
                        continue
                    if r.status_code >= 400:
                        log.warning("Azure transcribe %d: %s", r.status_code, r.text[:300])
                        return None
                    payload = r.json()
                    text = (payload.get("text") or "").strip()
                    return text or None
                except Exception as e:
                    log.warning("Azure transcribe call failed: %s", e)
                    return None
            return None

        # --- mode 2: OpenAI direct ---
        if self._mode == "openai" and self._client:
            try:
                buf = io.BytesIO(data); buf.name = filename
                result = self._client.audio.transcriptions.create(
                    file=buf, model="whisper-1", response_format="text",
                )
                return str(result).strip() or None
            except Exception as e:
                log.warning("OpenAI transcribe failed: %s", e)
                return None

        return None


def _mime_for(name: str) -> str:
    ext = name.lower().rsplit(".", 1)[-1]
    return {
        "mp3":  "audio/mpeg",
        "wav":  "audio/wav",
        "flac": "audio/flac",
        "ogg":  "audio/ogg",
        "oga":  "audio/ogg",
        "opus": "audio/opus",
        "m4a":  "audio/mp4",
        "aac":  "audio/aac",
        "mp4":  "video/mp4",
        "m4v":  "video/x-m4v",
        "mov":  "video/quicktime",
        "webm": "video/webm",
        "mkv":  "video/x-matroska",
        "avi":  "video/x-msvideo",
    }.get(ext, "application/octet-stream")


transcriber = WhisperTranscriber()
