"""Generate Trapdoor architecture flow PDF.

Run: python3 scripts/build_architecture_pdf.py
Output: assets/trapdoor-architecture-flow.pdf
"""
from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "trapdoor-architecture-flow.pdf"

INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#475569")
ACCENT = colors.HexColor("#2563eb")
ACCENT_SOFT = colors.HexColor("#dbeafe")
SURFACE = colors.HexColor("#f8fafc")
BORDER = colors.HexColor("#cbd5e1")
OK = colors.HexColor("#16a34a")
WARN = colors.HexColor("#f59e0b")
BAD = colors.HexColor("#dc2626")


def _header_footer(canv: canvas.Canvas, doc):
    canv.saveState()
    width, height = doc.pagesize
    canv.setFillColor(INK)
    canv.setFont("Helvetica-Bold", 10)
    canv.drawString(0.6 * inch, height - 0.4 * inch, "Trapdoor")
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 9)
    canv.drawRightString(
        width - 0.6 * inch,
        height - 0.4 * inch,
        "Architecture Flow",
    )
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.5)
    canv.line(0.6 * inch, height - 0.5 * inch, width - 0.6 * inch, height - 0.5 * inch)

    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 8)
    canv.drawString(
        0.6 * inch,
        0.4 * inch,
        "Prompt-injection scanner · FastAPI + browser UI",
    )
    canv.drawRightString(
        width - 0.6 * inch,
        0.4 * inch,
        f"Page {doc.page}",
    )
    canv.restoreState()


def _box(canv, x, y, w, h, title, subtitle=None, *, fill=ACCENT_SOFT, stroke=ACCENT,
         text_color=INK, title_size=10, subtitle_size=8):
    canv.setFillColor(fill)
    canv.setStrokeColor(stroke)
    canv.setLineWidth(1.1)
    canv.roundRect(x, y, w, h, 6, stroke=1, fill=1)
    canv.setFillColor(text_color)
    canv.setFont("Helvetica-Bold", title_size)
    # Center title vertically depending on whether subtitle exists
    if subtitle:
        canv.drawCentredString(x + w / 2, y + h - 16, title)
        canv.setFont("Helvetica", subtitle_size)
        canv.setFillColor(MUTED)
        # Allow simple line breaks via \n
        lines = subtitle.split("\n")
        line_h = subtitle_size + 2
        start_y = y + h - 16 - title_size - 4
        for i, line in enumerate(lines):
            canv.drawCentredString(x + w / 2, start_y - i * line_h, line)
    else:
        canv.drawCentredString(x + w / 2, y + h / 2 - title_size / 2 + 2, title)


def _arrow(canv, x1, y1, x2, y2, label=None, *, color=MUTED, dashed=False):
    canv.setStrokeColor(color)
    canv.setFillColor(color)
    canv.setLineWidth(1.2)
    if dashed:
        canv.setDash(3, 3)
    canv.line(x1, y1, x2, y2)
    canv.setDash()

    # Arrowhead
    import math

    angle = math.atan2(y2 - y1, x2 - x1)
    size = 6
    ax = x2 - size * math.cos(angle - math.pi / 7)
    ay = y2 - size * math.sin(angle - math.pi / 7)
    bx = x2 - size * math.cos(angle + math.pi / 7)
    by = y2 - size * math.sin(angle + math.pi / 7)
    p = canv.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(ax, ay)
    p.lineTo(bx, by)
    p.close()
    canv.drawPath(p, stroke=0, fill=1)

    if label:
        canv.setFillColor(MUTED)
        canv.setFont("Helvetica-Oblique", 8)
        mx = (x1 + x2) / 2
        my = (y1 + y2) / 2
        # Offset label so it doesn't sit on the line
        canv.drawCentredString(mx, my + 4, label)


def draw_flow_page(canv: canvas.Canvas, doc):
    """Page 2 — the main pipeline diagram (landscape)."""
    _header_footer(canv, doc)
    width, height = doc.pagesize

    # Title
    canv.setFillColor(INK)
    canv.setFont("Helvetica-Bold", 18)
    canv.drawString(0.7 * inch, height - 0.95 * inch, "Scan Pipeline")
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 10)
    canv.drawString(
        0.7 * inch,
        height - 1.15 * inch,
        "Browser → FastAPI → Extract → Detect → Sanitize → Score → (optional) AI Foundry",
    )

    # Layout: 7 columns of boxes across the page
    top_y = height - 2.6 * inch
    box_h = 0.95 * inch
    margin = 0.55 * inch
    usable = width - 2 * margin
    cols = 6
    gap = 0.25 * inch
    box_w = (usable - gap * (cols - 1)) / cols

    xs = [margin + i * (box_w + gap) for i in range(cols)]

    # Row 1: main flow
    _box(canv, xs[0], top_y, box_w, box_h,
         "Browser UI",
         "index.html\nstyles.css\nscript.js",
         fill=colors.HexColor("#fef3c7"),
         stroke=colors.HexColor("#d97706"))

    _box(canv, xs[1], top_y, box_w, box_h,
         "FastAPI",
         "app.main\n/api/scan\n/api/healthz",
         fill=ACCENT_SOFT, stroke=ACCENT)

    _box(canv, xs[2], top_y, box_w, box_h,
         "scan_bytes()",
         "app.scanner\norchestrator",
         fill=colors.HexColor("#ede9fe"),
         stroke=colors.HexColor("#7c3aed"))

    _box(canv, xs[3], top_y, box_w, box_h,
         "Extractor",
         "by MIME / ext\nfragments\nmetadata",
         fill=SURFACE, stroke=BORDER)

    _box(canv, xs[4], top_y, box_w, box_h,
         "Detectors × 6",
         "pattern · unicode\ninvisible · meta\nstego · LLM",
         fill=SURFACE, stroke=BORDER)

    _box(canv, xs[5], top_y, box_w, box_h,
         "Sanitizer",
         "strip · quote\ndiscard\nNFKC",
         fill=SURFACE, stroke=BORDER)

    # Arrows between row 1 boxes
    for i in range(cols - 1):
        x1 = xs[i] + box_w
        x2 = xs[i + 1]
        y = top_y + box_h / 2
        _arrow(canv, x1 + 2, y, x2 - 2, y)

    # Row 2: outputs / risk model
    mid_y = top_y - 1.7 * inch
    out_box_h = 0.9 * inch

    # ExtractedContent under Extractor
    _box(canv, xs[3], mid_y, box_w, out_box_h,
         "ExtractedContent",
         "fragments[]\nraw_metadata\nnotes",
         fill=colors.HexColor("#ecfeff"),
         stroke=colors.HexColor("#0891b2"))
    _arrow(canv, xs[3] + box_w / 2, top_y, xs[3] + box_w / 2, mid_y + out_box_h + 2)

    # Finding[] under Detectors
    _box(canv, xs[4], mid_y, box_w, out_box_h,
         "Finding[]",
         "severity · category\nconfidence\nsanitize_action",
         fill=colors.HexColor("#ecfeff"),
         stroke=colors.HexColor("#0891b2"))
    _arrow(canv, xs[4] + box_w / 2, top_y, xs[4] + box_w / 2, mid_y + out_box_h + 2)

    # sanitized_context under Sanitizer
    _box(canv, xs[5], mid_y, box_w, out_box_h,
         "sanitized_context",
         "blocked_spans[]\nLLM-safe text",
         fill=colors.HexColor("#dcfce7"),
         stroke=OK)
    _arrow(canv, xs[5] + box_w / 2, top_y, xs[5] + box_w / 2, mid_y + out_box_h + 2)

    # Risk scorer + verdict
    bottom_y = mid_y - 1.6 * inch
    score_w = box_w * 2 + gap
    score_x = xs[2] + (box_w - score_w / 2)  # roughly center

    # Place score box under cols 2-3
    score_x = xs[2]
    _box(canv, score_x, bottom_y, score_w, out_box_h,
         "Risk score · 1 − Π(1 − w·c)",
         "aggregates findings into 0–1 score",
         fill=colors.HexColor("#fef9c3"),
         stroke=colors.HexColor("#ca8a04"))

    # Arrow Finding[] -> Risk score
    _arrow(canv,
           xs[4] + box_w / 2,
           mid_y,
           score_x + score_w * 0.7,
           bottom_y + out_box_h + 2)

    # Verdict boxes (pass / review / block) — stacked vertically, taller than score box
    verdicts = [
        ("pass",   "risk < 0.35",            OK,   colors.HexColor("#dcfce7")),
        ("review", "0.35 ≤ risk < 0.85",     WARN, colors.HexColor("#fef3c7")),
        ("block",  "risk ≥ 0.85 or high+",   BAD,  colors.HexColor("#fee2e2")),
    ]
    stack_x = xs[5]
    item_h = 0.5 * inch
    gap_v = 6
    stack_total_h = item_h * 3 + gap_v * 2
    stack_bottom = bottom_y + (out_box_h - stack_total_h) / 2  # vertically centered on score
    for i, (name, sub, stroke, fill) in enumerate(verdicts):
        y = stack_bottom + (2 - i) * (item_h + gap_v)
        _box(canv, stack_x, y, box_w, item_h, name, sub,
             fill=fill, stroke=stroke, title_size=10, subtitle_size=8)

    # Arrow score -> verdict stack (points at the middle of the stack)
    stack_mid_y = stack_bottom + stack_total_h / 2
    _arrow(canv,
           score_x + score_w,
           bottom_y + out_box_h / 2,
           stack_x - 2,
           stack_mid_y)

    # AI Foundry box (optional)
    af_x = xs[0]
    af_y = bottom_y
    _box(canv, af_x, af_y, box_w * 2 + gap, out_box_h,
         "AI Foundry (optional)",
         "Azure OpenAI · JSON-mode classify\nenabled when API key is set",
         fill=colors.HexColor("#e0e7ff"),
         stroke=colors.HexColor("#4f46e5"))

    # Dashed arrow LLMDetector → AI Foundry
    _arrow(canv,
           xs[4],
           mid_y + out_box_h / 2,
           af_x + (box_w * 2 + gap),
           af_y + out_box_h / 2,
           label="LLM detector",
           dashed=True)

    # Footnote
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica-Oblique", 8)
    canv.drawString(
        0.7 * inch,
        0.7 * inch,
        "Solid arrows = always run.  Dashed = optional path (Azure OpenAI key required).",
    )


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)

    doc = BaseDocTemplate(
        str(OUT),
        pagesize=landscape(LETTER),
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.7 * inch,
        title="Trapdoor — Architecture Flow",
        author="Trapdoor",
    )

    frame_full = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="full",
    )
    cover_tpl = PageTemplate(id="cover", frames=[frame_full], onPage=_header_footer)
    flow_tpl = PageTemplate(id="flow", frames=[frame_full], onPage=draw_flow_page)
    detail_tpl = PageTemplate(id="detail", frames=[frame_full], onPage=_header_footer)
    doc.addPageTemplates([cover_tpl, flow_tpl, detail_tpl])

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "h1", parent=styles["Heading1"], fontName="Helvetica-Bold",
        fontSize=26, leading=30, textColor=INK, spaceAfter=8,
    )
    h2 = ParagraphStyle(
        "h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=14, leading=18, textColor=INK, spaceBefore=10, spaceAfter=6,
    )
    body = ParagraphStyle(
        "body", parent=styles["BodyText"], fontName="Helvetica",
        fontSize=10, leading=14, textColor=INK,
    )
    muted = ParagraphStyle(
        "muted", parent=body, fontName="Helvetica", textColor=MUTED,
    )
    code = ParagraphStyle(
        "code", parent=body, fontName="Courier", fontSize=9, leading=12,
        textColor=INK,
    )

    from reportlab.platypus import NextPageTemplate

    story = []

    # ===== Cover =====
    story.append(Spacer(1, 0.6 * inch))
    story.append(Paragraph("Trapdoor", h1))
    story.append(Paragraph(
        "Architecture Flow",
        ParagraphStyle("sub", parent=h1, fontSize=18, textColor=ACCENT, spaceAfter=20),
    ))
    story.append(Paragraph(
        "A scanner for prompt-injection payloads hidden in user-uploaded files — "
        "PDFs, images, DOCX, HTML, video. Extracts every fragment of text "
        "(including invisible PDF layers, OCR, metadata, HTML comments, and "
        "LSB-decoded image data), runs six detectors in parallel, sanitizes "
        "what survives, and returns a verdict plus the LLM-safe context.",
        body,
    ))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Pipeline at a glance", h2))

    summary = [
        ["1", "Upload", "Browser POSTs multipart/JSON to FastAPI."],
        ["2", "Extract", "MIME-routed extractor pulls fragments + metadata."],
        ["3", "Detect", "Six detectors emit Findings with severity / confidence."],
        ["4", "Sanitize", "Block, quote, or strip each fragment based on its action."],
        ["5", "Score", "Probabilistic aggregation → pass / review / block."],
        ["6", "Classify (opt.)", "Azure AI Foundry confirms suspicious fragments."],
    ]
    t = Table(summary, colWidths=[0.4 * inch, 1.4 * inch, 5.5 * inch])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
        ("FONT", (1, 0), (1, -1), "Helvetica-Bold", 10),
        ("TEXTCOLOR", (0, 0), (0, -1), ACCENT),
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 12),
        ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, BORDER),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)

    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(
        "See the next page for the full data-flow diagram, followed by "
        "component-level detail (extractors, detectors, sanitizer, scoring).",
        muted,
    ))

    # ===== Flow diagram page (drawn entirely in onPage) =====
    story.append(NextPageTemplate("flow"))
    story.append(PageBreak())
    story.append(Spacer(1, 1))

    # Switch to detail template for the rest
    story.append(NextPageTemplate("detail"))
    story.append(PageBreak())

    # ===== Components page =====
    story.append(Paragraph("Components", h1))
    story.append(Paragraph("Extractors — <font face='Courier'>backend/app/extractors/</font>", h2))

    cell = ParagraphStyle("cell", parent=body, fontSize=9, leading=12)
    cell_h = ParagraphStyle("cell_h", parent=cell, fontName="Helvetica-Bold", textColor=INK)
    cell_name = ParagraphStyle("cell_name", parent=cell, fontName="Helvetica-Bold", textColor=ACCENT)

    def P(text, style=cell):
        return Paragraph(text, style)

    ex_rows = [
        [P("Extractor", cell_h), P("Pulls", cell_h), P("Notes", cell_h)],
        [P("PDFExtractor", cell_name),
         P("Per-character text + color; marks invisible (≥0.95 RGB) fragments separately. Metadata."),
         P("pdfplumber. CMYK approximated to RGB.")],
        [P("ImageExtractor", cell_name),
         P("OCR · LSB-plane entropy + decoded ASCII · EXIF · histogram heuristic."),
         P("pytesseract optional.")],
        [P("DocxExtractor", cell_name),
         P("Body paragraphs + core properties (author / title / subject / comments / keywords)."),
         P("python-docx.")],
        [P("TextExtractor", cell_name),
         P("Body + every HTML comment as <font face='Courier'>kind=\"comment\"</font> fragment."),
         P("UTF-8 with latin-1 fallback.")],
        [P("VideoExtractor", cell_name),
         P("Frame-by-frame OCR at 1 fps."),
         P("cv2 + pytesseract optional.")],
    ]
    t = Table(ex_rows, colWidths=[1.2 * inch, 4.5 * inch, 2.4 * inch])
    table_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SURFACE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ])
    t.setStyle(table_style)
    story.append(t)

    story.append(Paragraph("Detectors — <font face='Courier'>backend/app/detectors/</font>", h2))
    det_rows = [
        [P("Detector", cell_h), P("Strategy", cell_h)],
        [P("PatternDetector", cell_name),
         P("Curated regex set (instruction-override, role-spoofing, exfiltration, jailbreak, "
           "guardrail-removal, score-manipulation). Bumps confidence when the fragment is "
           "invisible, metadata, or a comment.")],
        [P("UnicodeDetector", cell_name),
         P("Counts ZWSP / ZWNJ / ZWJ / WJ / BOM. Detects Latin-dominant strings with "
           "foreign-script characters (confusables).")],
        [P("InvisibleTextDetector", cell_name),
         P("Flags any fragment that extractors tagged <font face='Courier'>visibility=invisible</font>.")],
        [P("MetadataDetector", cell_name),
         P("Instruction-shaped text inside metadata fields.")],
        [P("SteganographyDetector", cell_name),
         P("Inspects <font face='Courier'>kind=decoded</font> fragments — high severity when decoded "
           "text contains exfiltration targets.")],
        [P("LLMDetector", cell_name),
         P("Calls Azure AI Foundry to classify each substantial fragment. Skipped when no API key is set.")],
    ]
    t = Table(det_rows, colWidths=[1.5 * inch, 6.6 * inch])
    t.setStyle(table_style)
    story.append(t)

    story.append(Paragraph("Sanitizer — <font face='Courier'>backend/app/sanitizer.py</font>", h2))
    san = (
        "Per fragment: <b>visibility=invisible</b> → blocked. "
        "<b>kind=comment</b> → blocked. "
        "<b>kind=metadata</b> → reframed as <font face='Courier'>[metadata.x] …</font>. "
        "Findings requesting <b>discard</b> → blocked. "
        "Findings requesting <b>quote</b> (or kind=ocr/decoded) → wrapped in an "
        "<font face='Courier'>untrusted</font> fenced block. "
        "All surviving text is NFKC-normalized with zero-width chars stripped. "
        "The result is <b>sanitized_context</b> — exactly what downstream code passes to the LLM."
    )
    story.append(Paragraph(san, body))

    story.append(Paragraph("Risk score — <font face='Courier'>backend/app/scanner.py</font>", h2))
    story.append(Paragraph(
        "Each finding is treated as an independent probability that the file is malicious. "
        "The scanner aggregates <font face='Courier'>1 − Π(1 − severity_weight × confidence)</font> "
        "into a 0–1 risk score:",
        body,
    ))
    verdict_rows = [
        ["block", "risk ≥ 0.85, or any high/critical finding"],
        ["review", "0.35 ≤ risk < 0.85"],
        ["pass", "risk < 0.35"],
    ]
    t = Table(verdict_rows, colWidths=[1.0 * inch, 6.3 * inch])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 10),
        ("FONT", (1, 0), (1, -1), "Helvetica", 10),
        ("TEXTCOLOR", (0, 0), (0, 0), BAD),
        ("TEXTCOLOR", (0, 1), (0, 1), WARN),
        ("TEXTCOLOR", (0, 2), (0, 2), OK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    story.append(Paragraph("Extension points", h2))
    story.append(Paragraph(
        "<b>New modality:</b> drop a class in <font face='Courier'>backend/app/extractors/</font>, "
        "register it in <font face='Courier'>registry._BY_EXT</font>.<br/>"
        "<b>New attack pattern:</b> append a tuple to "
        "<font face='Courier'>pattern_detector._PATTERNS</font>.<br/>"
        "<b>New detector:</b> subclass <font face='Courier'>Detector</font>, return "
        "<font face='Courier'>Finding[]</font>, add it to "
        "<font face='Courier'>detectors.all_detectors()</font>.<br/>"
        "<b>New sanitize policy:</b> edit <font face='Courier'>sanitizer.sanitize()</font> — every "
        "detector already declares the action it wants.",
        body,
    ))

    doc.build(story)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
