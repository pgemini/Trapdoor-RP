"""Audio / video speech-to-text via OpenAI Whisper.

Trapdoor's audio + video extractors only see metadata by default. With this
module enabled they also feed the spoken / visible-audio content through the
detector chain. Two modes:

  * Azure OpenAI — set AZURE_OPENAI_* + AZURE_WHISPER_DEPLOYMENT
  * OpenAI direct — set OPENAI_API_KEY  (uses the `whisper-1` model)

If neither is configured the transcriber is disabled and `transcribe()` is
a no-op returning None, so the rest of Trapdoor still works.
"""
from __future__ import annotations

import io
import logging
from typing import Optional

from .config import settings

log = logging.getLogger("trapdoor.transcriber")


# Whisper API hard limit (per the docs).
_MAX_BYTES = 25 * 1024 * 1024


class WhisperTranscriber:
    def __init__(self) -> None:
        self._client = None
        self._model = ""
        self._mode = ""  # "azure" | "openai"

        if settings.azure_whisper_deployment and settings.ai_foundry_enabled:
            try:
                from openai import AzureOpenAI  # type: ignore

                self._client = AzureOpenAI(
                    api_key=settings.azure_openai_api_key,
                    azure_endpoint=settings.azure_openai_endpoint,
                    api_version=settings.azure_openai_api_version,
                )
                self._model = settings.azure_whisper_deployment
                self._mode = "azure"
            except Exception as e:
                log.warning("Azure Whisper init failed: %s", e)
                self._client = None

        elif settings.openai_api_key:
            try:
                from openai import OpenAI  # type: ignore

                self._client = OpenAI(api_key=settings.openai_api_key)
                self._model = "whisper-1"
                self._mode = "openai"
            except Exception as e:
                log.warning("OpenAI Whisper init failed: %s", e)
                self._client = None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    @property
    def mode(self) -> str:
        return self._mode

    def transcribe(self, data: bytes, filename: str) -> Optional[str]:
        """Return spoken text, or None when disabled / failed / too large."""
        if not self._client:
            return None
        if len(data) > _MAX_BYTES:
            log.warning("Skipping transcription: %s is %d bytes (limit %d).",
                        filename, len(data), _MAX_BYTES)
            return None
        try:
            buf = io.BytesIO(data)
            buf.name = filename  # OpenAI SDK uses this to sniff the format
            result = self._client.audio.transcriptions.create(
                file=buf,
                model=self._model,
                response_format="text",
            )
            text = str(result).strip() if result else ""
            return text or None
        except Exception as e:
            log.warning("Whisper transcription failed for %s: %s", filename, e)
            return None


transcriber = WhisperTranscriber()
