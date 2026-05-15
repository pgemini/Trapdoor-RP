from __future__ import annotations

import io

import numpy as np
from PIL import ExifTags, Image

from ..ai_foundry import classifier
from ..schemas import ExtractedContent, ExtractedFragment
from .base import Extractor

try:
    import pytesseract  # type: ignore
    _HAS_TESSERACT = True
except Exception:
    _HAS_TESSERACT = False


def _exif_dict(img: Image.Image) -> dict:
    out: dict = {}
    try:
        raw = img.getexif()
        for tag, value in raw.items():
            name = ExifTags.TAGS.get(tag, str(tag))
            try:
                out[name] = str(value)
            except Exception:
                continue
    except Exception:
        pass
    return out


def _lsb_decode(img: Image.Image, max_chars: int = 256) -> str:
    """Pull LSB plane bytes from the R channel and decode printable ASCII runs."""
    arr = np.array(img.convert("RGB"), dtype=np.uint8)
    bits = (arr[..., 0] & 1).flatten()
    n = (bits.size // 8) * 8
    bits = bits[:n].reshape(-1, 8)
    bytes_arr = np.packbits(bits, axis=1).flatten()

    cleaned = []
    run: list[int] = []
    for b in bytes_arr[: max_chars * 8]:
        if 32 <= b < 127:
            run.append(b)
        else:
            if len(run) >= 6:
                cleaned.append(bytes(run).decode("ascii", errors="ignore"))
            run = []
    if len(run) >= 6:
        cleaned.append(bytes(run).decode("ascii", errors="ignore"))
    return " | ".join(cleaned)[:max_chars]


def _lsb_entropy(img: Image.Image) -> float:
    arr = np.array(img.convert("RGB"), dtype=np.uint8)
    bits = (arr[..., 0] & 1).flatten()
    if bits.size == 0:
        return 0.0
    p1 = float(bits.mean())
    p0 = 1.0 - p1
    if p0 == 0 or p1 == 0:
        return 0.0
    return -(p0 * np.log2(p0) + p1 * np.log2(p1))


class ImageExtractor(Extractor):
    modality = "image"

    def extract(self, data: bytes, filename: str) -> ExtractedContent:
        fragments: list[ExtractedFragment] = []
        notes: list[str] = []
        img = Image.open(io.BytesIO(data))
        mime = f"image/{(img.format or 'png').lower()}"

        tesseract_text = ""
        if _HAS_TESSERACT:
            try:
                tesseract_text = pytesseract.image_to_string(img).strip()
                if tesseract_text:
                    fragments.append(ExtractedFragment(
                        source="ocr",
                        kind="ocr",
                        text=tesseract_text,
                        attrs={"engine": "tesseract"},
                    ))
            except Exception as e:
                notes.append(f"Tesseract OCR failed: {e}")
        else:
            notes.append("Tesseract not installed.")

        # Vision fallback — when Tesseract is unavailable OR found nothing,
        # ask the AI Foundry vision model to transcribe every visible word.
        # This is what stops "OCR text overlay" attacks on systems without
        # a local OCR engine.
        if classifier.enabled and not tesseract_text:
            vision_text = classifier.vision_ocr(data, mime=mime)
            if vision_text:
                fragments.append(ExtractedFragment(
                    source="ocr",
                    kind="ocr",
                    text=vision_text,
                    attrs={"engine": "ai-foundry-vision"},
                ))
                notes.append("OCR via AI Foundry vision (no local Tesseract).")
            elif vision_text == "":
                notes.append("AI Foundry vision found no readable text.")
        elif not classifier.enabled and not _HAS_TESSERACT:
            notes.append(
                "No OCR engine available — install Tesseract OR enable AI Foundry "
                "(AZURE_OPENAI_*) to scan text inside images."
            )

        # contrast / overlay heuristic — useful even without OCR
        gray = np.array(img.convert("L"), dtype=np.uint8)
        hist, _ = np.histogram(gray, bins=32, range=(0, 256))
        contrast_pct = float(hist.max()) / max(1.0, float(gray.size))
        if contrast_pct > 0.55:
            notes.append("Highly uniform background — possible low-contrast text overlay.")

        # steganography
        try:
            entropy = _lsb_entropy(img)
            if entropy > 0.97:
                decoded = _lsb_decode(img)
                if decoded:
                    fragments.append(ExtractedFragment(
                        source="lsb-plane",
                        kind="decoded",
                        text=decoded,
                        attrs={"entropy": round(entropy, 4)},
                    ))
        except Exception as e:
            notes.append(f"LSB analysis failed: {e}")

        exif = _exif_dict(img)
        for key, value in exif.items():
            if value:
                fragments.append(ExtractedFragment(
                    source=f"exif.{key}",
                    kind="metadata",
                    text=value,
                ))

        # PNG tEXt/iTXt chunks and other image-info metadata (icc_profile,
        # comments, software, etc.) surface here. Skip binary blobs.
        info_meta: dict[str, str] = {}
        for key, value in (img.info or {}).items():
            if not isinstance(value, (str, bytes)):
                continue
            text = value.decode("utf-8", errors="replace") if isinstance(value, bytes) else value
            if not text.strip() or len(text) > 4000:
                continue
            info_meta[str(key)] = text
            fragments.append(ExtractedFragment(
                source=f"image-info.{key}",
                kind="metadata",
                text=text,
            ))

        return ExtractedContent(
            modality=self.modality,
            mime=mime,
            fragments=fragments,
            raw_metadata={"exif": exif, "info": info_meta, "size": list(img.size)},
            notes=notes,
        )
