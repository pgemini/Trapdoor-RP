"""Realtime WebSocket-based audio transcription for Azure AI Foundry
"gpt-realtime" deployments.

The classic /audio/transcriptions REST endpoint doesn't work with realtime
models — they require a streaming WebSocket session. This module:

  1. Decodes the input file to 24 kHz mono PCM16 (any format soundfile
     supports — MP3, WAV, FLAC, OGG, M4A, etc.).
  2. Opens a wss:// session to the realtime endpoint.
  3. Streams the audio in chunks via input_audio_buffer.append.
  4. Commits the buffer and listens for
     `conversation.item.input_audio_transcription.completed` events.

Falls back gracefully (returns None) when:
  - The deployment env var isn't set
  - soundfile can't decode the file
  - The connection / handshake fails
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
from typing import Optional
from urllib.parse import urlparse

import numpy as np
import soundfile as sf
import websockets

from .config import settings

log = logging.getLogger("trapdoor.realtime")

# Tunables
_TARGET_SR = 24_000          # Realtime expects 24 kHz mono PCM16
_CHUNK_MS  = 200             # ~200 ms per WS frame
_RESPONSE_TIMEOUT_S = 60.0
_API_VERSION = "2025-04-01-preview"


def _normalize_endpoint(endpoint: str) -> str:
    """Return the wss://… root for the realtime endpoint."""
    parsed = urlparse(endpoint)
    host = parsed.netloc or parsed.path.split("/", 1)[0]
    return f"wss://{host}"


def _decode_to_pcm16(audio_bytes: bytes) -> Optional[bytes]:
    """Decode any soundfile-supported audio to mono 16-bit PCM at _TARGET_SR."""
    try:
        data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
    except Exception as e:
        log.warning("soundfile could not decode audio: %s", e)
        return None
    # Mono
    if data.ndim > 1:
        data = data.mean(axis=1)
    # Resample to target (basic linear resampling — fine for STT input)
    if sr != _TARGET_SR:
        target_len = int(round(len(data) * _TARGET_SR / sr))
        if target_len <= 0:
            return None
        old_idx = np.linspace(0, len(data) - 1, num=target_len)
        data = np.interp(old_idx, np.arange(len(data)), data).astype("float32")
    # Clamp + convert to int16
    data = np.clip(data, -1.0, 1.0)
    pcm16 = (data * 32767.0).astype("<i2").tobytes()
    return pcm16


async def _stream_transcribe(pcm16: bytes, deployment: str, endpoint: str, api_key: str) -> Optional[str]:
    ws_url = (
        f"{_normalize_endpoint(endpoint)}/openai/realtime"
        f"?api-version={_API_VERSION}&deployment={deployment}"
    )
    headers = {"api-key": api_key}

    try:
        async with websockets.connect(ws_url, additional_headers=headers, max_size=None) as ws:
            # Configure session: PCM16 in, force transcription with whisper-1
            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "input_audio_format": "pcm16",
                    "input_audio_transcription": {"model": "whisper-1"},
                    "turn_detection": None,  # we'll commit manually
                },
            }))

            # Stream audio in chunks of CHUNK_MS
            bytes_per_chunk = (_TARGET_SR * 2 * _CHUNK_MS) // 1000  # 2 bytes per sample
            for i in range(0, len(pcm16), bytes_per_chunk):
                chunk = pcm16[i:i + bytes_per_chunk]
                if not chunk:
                    continue
                await ws.send(json.dumps({
                    "type": "input_audio_buffer.append",
                    "audio": base64.b64encode(chunk).decode("ascii"),
                }))

            await ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
            await ws.send(json.dumps({"type": "response.create", "response": {"modalities": ["text"]}}))

            transcript_parts: list[str] = []
            try:
                async with asyncio.timeout(_RESPONSE_TIMEOUT_S):
                    async for raw in ws:
                        evt = json.loads(raw)
                        t = evt.get("type", "")
                        if t == "conversation.item.input_audio_transcription.completed":
                            text = (evt.get("transcript") or "").strip()
                            if text:
                                transcript_parts.append(text)
                        elif t == "response.completed":
                            break
                        elif t == "error":
                            log.warning("Realtime error event: %s", evt.get("error"))
                            break
            except asyncio.TimeoutError:
                log.warning("Realtime transcription timed out after %s s", _RESPONSE_TIMEOUT_S)
            return "\n".join(p for p in transcript_parts if p).strip() or None
    except Exception as e:
        log.warning("Realtime WS connection failed: %s", e)
        return None


class RealtimeTranscriber:
    def __init__(self) -> None:
        self._deployment = (settings.azure_realtime_deployment or "").strip()
        self._endpoint   = (settings.azure_realtime_endpoint or
                            settings.azure_openai_endpoint or "").strip()
        self._api_key    = settings.azure_openai_api_key

    @property
    def enabled(self) -> bool:
        return bool(self._deployment and self._endpoint and self._api_key)

    def transcribe(self, audio_bytes: bytes) -> Optional[str]:
        if not self.enabled:
            return None
        if len(audio_bytes) > 60 * 1024 * 1024:
            log.warning("Skipping realtime transcribe: file is %d bytes.", len(audio_bytes))
            return None
        pcm16 = _decode_to_pcm16(audio_bytes)
        if not pcm16:
            return None
        try:
            return asyncio.run(_stream_transcribe(pcm16, self._deployment, self._endpoint, self._api_key))
        except Exception as e:
            log.warning("Realtime transcribe failed: %s", e)
            return None


realtime = RealtimeTranscriber()
