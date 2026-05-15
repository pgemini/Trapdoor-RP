from __future__ import annotations

import os
import tempfile

from ..schemas import ExtractedContent, ExtractedFragment
from ..transcriber import transcriber
from .base import Extractor

try:
    import cv2  # type: ignore
    _HAS_CV2 = True
except Exception:
    _HAS_CV2 = False

try:
    import pytesseract  # type: ignore
    from PIL import Image
    _HAS_TESSERACT = True
except Exception:
    _HAS_TESSERACT = False

try:
    import mutagen  # type: ignore
    _HAS_MUTAGEN = True
except Exception:
    _HAS_MUTAGEN = False


def _mime_for(name: str) -> str:
    ext = name.lower().rsplit(".", 1)[-1]
    return {
        "mp4":  "video/mp4",
        "m4v":  "video/x-m4v",
        "mov":  "video/quicktime",
        "webm": "video/webm",
        "mkv":  "video/x-matroska",
        "avi":  "video/x-msvideo",
    }.get(ext, "video/mp4")


def _pull_container_tags(data: bytes) -> list[tuple[str, str]]:
    """Extract container-level tags via mutagen if installed (MP4/MKV/etc.)."""
    if not _HAS_MUTAGEN:
        return []
    import io as _io
    out: list[tuple[str, str]] = []
    try:
        f = mutagen.File(_io.BytesIO(data))
        if f is None or getattr(f, "tags", None) is None:
            return []
        for key, value in f.tags.items():
            if isinstance(value, (list, tuple)):
                text = " · ".join(str(v) for v in value)
            else:
                text = str(value)
            text = text.strip()
            if text:
                out.append((str(key), text))
    except Exception:
        pass
    return out


class VideoExtractor(Extractor):
    modality = "video"

    def extract(self, data: bytes, filename: str) -> ExtractedContent:
        fragments: list[ExtractedFragment] = []
        notes: list[str] = []
        raw: dict = {}

        # Container metadata — always available regardless of OpenCV.
        for key, value in _pull_container_tags(data):
            fragments.append(ExtractedFragment(
                source=f"container.{key}",
                kind="metadata",
                text=value,
            ))

        # Transcribe the audio track: Whisper → Foundry realtime WebSocket.
        transcript = None
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
            notes.append(f"Video audio track transcribed via {engine}.")
        else:
            notes.append(
                "No transcription engine available — video audio track not scanned. "
                "Configure AZURE_WHISPER_DEPLOYMENT, AZURE_REALTIME_DEPLOYMENT, or OPENAI_API_KEY."
            )

        if not _HAS_CV2:
            notes.append("OpenCV not installed — frame OCR skipped, metadata-only scan.")
            return ExtractedContent(
                modality=self.modality,
                mime=_mime_for(filename),
                fragments=fragments,
                raw_metadata=raw,
                notes=notes,
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1] or ".mp4") as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        try:
            cap = cv2.VideoCapture(tmp_path)
            fps   = cap.get(cv2.CAP_PROP_FPS) or 0.0
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            w     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)  or 0)
            h     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
            duration = (total / fps) if fps > 0 else 0.0
            raw = {"fps": fps, "frame_count": total, "width": w, "height": h, "duration_s": round(duration, 2)}

            if not _HAS_TESSERACT:
                notes.append("Tesseract not installed — frame OCR skipped.")
                cap.release()
                return ExtractedContent(
                    modality=self.modality, mime=_mime_for(filename),
                    fragments=fragments, raw_metadata=raw, notes=notes,
                )

            step = max(1, int(fps))  # 1 fps sampling
            frame_idx = 0
            sampled = 0
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if frame_idx % step == 0:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil = Image.fromarray(rgb)
                    try:
                        text = pytesseract.image_to_string(pil).strip()
                    except Exception:
                        text = ""
                    if text:
                        ts = frame_idx / fps if fps > 0 else float(frame_idx)
                        fragments.append(ExtractedFragment(
                            source=f"frame-{frame_idx}",
                            kind="ocr",
                            text=text,
                            attrs={"timestamp_s": round(ts, 2)},
                        ))
                    sampled += 1
                frame_idx += 1
            cap.release()
            notes.append(f"Decoded {total} frames, sampled {sampled} via OCR.")
        finally:
            try: os.unlink(tmp_path)
            except OSError: pass

        return ExtractedContent(
            modality=self.modality,
            mime=_mime_for(filename),
            fragments=fragments,
            raw_metadata=raw,
            notes=notes,
        )
