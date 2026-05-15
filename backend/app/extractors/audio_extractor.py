"""Audio extractor.

Trapdoor cannot transcribe audio without an external speech-to-text service,
but the most common injection vector in audio files is **metadata** —
ID3 tags, Vorbis comments, MP4 atoms, WAV LIST/INFO chunks. We pull those
out so the rest of the detector chain can scan them.
"""
from __future__ import annotations

import io
import struct
from typing import Iterable

from ..schemas import ExtractedContent, ExtractedFragment
from ..transcriber import transcriber
from .base import Extractor

try:
    import mutagen  # type: ignore
    _HAS_MUTAGEN = True
except Exception:
    _HAS_MUTAGEN = False


# RIFF INFO chunk IDs → human-readable labels (WAV / older AVI).
_RIFF_INFO_LABELS = {
    "INAM": "title",
    "ICMT": "comment",
    "IART": "artist",
    "IPRD": "album",
    "ICRD": "date",
    "IGNR": "genre",
    "ISFT": "software",
    "ISRC": "source",
    "ITCH": "engineer",
    "ICOP": "copyright",
    "IKEY": "keywords",
}


def _parse_riff_info(data: bytes) -> dict[str, str]:
    """Pull LIST/INFO sub-chunks from a RIFF (WAV) container without mutagen."""
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        return {}
    info: dict[str, str] = {}
    i = 12
    while i + 8 <= len(data):
        chunk_id = data[i:i + 4]
        chunk_size = int.from_bytes(data[i + 4:i + 8], "little", signed=False)
        body = data[i + 8:i + 8 + chunk_size]
        if chunk_id == b"LIST" and body[:4] == b"INFO":
            j = 4
            while j + 8 <= len(body):
                sub_id = body[j:j + 4]
                sub_size = int.from_bytes(body[j + 4:j + 8], "little", signed=False)
                sub_body = body[j + 8:j + 8 + sub_size]
                try:
                    label = _RIFF_INFO_LABELS.get(sub_id.decode("ascii", "ignore"), sub_id.decode("ascii", "ignore"))
                    value = sub_body.rstrip(b"\x00").decode("utf-8", errors="replace")
                    if value:
                        info[label] = value
                except Exception:
                    pass
                j += 8 + sub_size + (sub_size % 2)
        i += 8 + chunk_size + (chunk_size % 2)
    return info


def _stringify(value: object) -> str:
    """mutagen returns lists / Frame objects — coerce to a plain string."""
    if isinstance(value, (list, tuple)):
        return " · ".join(_stringify(v) for v in value)
    return str(value)


def _iter_mutagen_tags(audio) -> Iterable[tuple[str, str]]:
    if audio is None:
        return
    if getattr(audio, "tags", None) is None:
        return
    for key, value in audio.tags.items():
        text = _stringify(value).strip()
        if text:
            yield str(key), text


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
    }.get(ext, "audio/octet-stream")


class AudioExtractor(Extractor):
    modality = "audio"

    def extract(self, data: bytes, filename: str) -> ExtractedContent:
        fragments: list[ExtractedFragment] = []
        notes: list[str] = []
        raw: dict = {}

        if _HAS_MUTAGEN:
            try:
                audio = mutagen.File(io.BytesIO(data))
                if audio is not None:
                    if hasattr(audio, "info"):
                        info = audio.info
                        for attr in ("length", "bitrate", "sample_rate", "channels", "codec"):
                            if hasattr(info, attr):
                                raw[attr] = getattr(info, attr)
                    for key, value in _iter_mutagen_tags(audio):
                        fragments.append(ExtractedFragment(
                            source=f"tag.{key}",
                            kind="metadata",
                            text=value,
                        ))
                else:
                    notes.append("mutagen could not identify the audio container.")
            except Exception as e:
                notes.append(f"mutagen failed: {e}")
        else:
            notes.append("mutagen not installed — only WAV RIFF metadata will be parsed.")

        # WAV INFO chunks are commonly missed by mutagen; parse directly.
        if data[:4] == b"RIFF":
            info = _parse_riff_info(data)
            for label, value in info.items():
                already = any(
                    f.source.lower().endswith(label.lower()) for f in fragments
                )
                if not already:
                    fragments.append(ExtractedFragment(
                        source=f"riff.info.{label}",
                        kind="metadata",
                        text=value,
                    ))

        # Speech-to-text — try in this order:
        #   1. Dedicated Whisper deployment (REST audio/transcriptions)
        #   2. Foundry realtime WebSocket (gpt-realtime-*)
        #   3. give up gracefully
        transcript: str | None = None
        engine = ""
        if transcriber.enabled:
            transcript = transcriber.transcribe(data, filename)
            engine = f"whisper:{transcriber.mode}"
        if not transcript:
            from ..realtime_transcriber import realtime as _rt
            if _rt.enabled:
                transcript = _rt.transcribe(data)
                if transcript:
                    engine = "azure-realtime-ws"
        if transcript:
            fragments.append(ExtractedFragment(
                source="transcript",
                kind="text",
                text=transcript,
                attrs={"engine": engine},
            ))
            notes.append(f"Audio transcribed via {engine}.")
        else:
            notes.append(
                "No transcription engine available — only metadata scanned. "
                "Configure AZURE_WHISPER_DEPLOYMENT, AZURE_REALTIME_DEPLOYMENT, or OPENAI_API_KEY."
            )

        return ExtractedContent(
            modality=self.modality,
            mime=_mime_for(filename),
            fragments=fragments,
            raw_metadata=raw,
            notes=notes,
        )
