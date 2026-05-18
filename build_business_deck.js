// Build Trapdoor-Working.pptx — business-focused deck that walks through
// how the solution works in three stages (Extract, Detect, Sanitize),
// then maps that to uses and business impact. No UI, no tech-stack
// slides — purely conceptual.

const pptxgen = require("pptxgenjs");
const pres = new pptxgen();

pres.layout  = "LAYOUT_WIDE";              // 13.333" × 7.5"
pres.author  = "Trapdoor Team";
pres.company = "Tech Mahindra";
pres.title   = "Trapdoor — How it Works";
pres.subject = "Working architecture, uses, business impact";

// ============================================================
//  PALETTE
// ============================================================
const RED      = "E40029";   // Tech Mahindra red
const RED_SOFT = "FBE5EA";
const INK      = "1A1A1A";
const INK_SOFT = "4A4D57";
const MUTED    = "7A7E8A";
const HAIR     = "DFE2EA";
const BG       = "F4F5F9";
const CARD     = "FFFFFF";
const OK       = "1F9C5B";
const WARN     = "D98A00";
const DANGER   = "C81E2B";
const BLUE     = "0078D4";
const PURPLE   = "6F42C1";

const W = 13.333, H = 7.5;
const LOGO_AR = 3.6571;
const LOGO_PATH = "assets/tech-mahindra-logo.png";

// ============================================================
//  PRIMITIVES
// ============================================================
function shadow() {
  return { type: "outer", color: "000000", blur: 14, offset: 3, angle: 135, opacity: 0.10 };
}

function brandLogo(slide) {
  const h = 0.45;
  const w = h * LOGO_AR;
  slide.addImage({ path: LOGO_PATH, x: W - w - 0.55, y: 0.42, w, h });
}

function pageHeader(slide, eyebrow, title, subtitle) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 0.95, w: 0.22, h: 0.32,
    fill: { color: RED }, line: { type: "none" },
  });
  slide.addText(eyebrow, {
    x: 0.90, y: 0.93, w: 7.5, h: 0.36, margin: 0,
    fontSize: 11, bold: true, color: RED, fontFace: "Calibri",
    charSpacing: 4, valign: "middle",
  });
  slide.addText(title, {
    x: 0.55, y: 1.36, w: W - 1.1, h: 0.85, margin: 0,
    fontSize: 34, bold: true, fontFace: "Calibri", color: INK,
    align: "left", valign: "top",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55, y: 2.18, w: W - 1.1, h: 0.45, margin: 0,
      fontSize: 14, color: INK_SOFT, fontFace: "Calibri",
    });
  }
  slide.addShape(pres.shapes.LINE, {
    x: 0.55, y: 2.78, w: W - 1.1, h: 0,
    line: { color: HAIR, width: 0.75 },
  });
  brandLogo(slide);
}

function footer(slide, page, totalPages) {
  slide.addShape(pres.shapes.LINE, {
    x: 0.55, y: 7.05, w: W - 1.1, h: 0,
    line: { color: HAIR, width: 0.5 },
  });
  slide.addText("Trapdoor · Working architecture", {
    x: 0.55, y: 7.12, w: 8, h: 0.3, margin: 0,
    fontSize: 9, color: MUTED, fontFace: "Calibri",
  });
  slide.addText(`${page} / ${totalPages}`, {
    x: W - 1.7, y: 7.12, w: 1.15, h: 0.3, margin: 0,
    fontSize: 9, color: MUTED, fontFace: "Calibri", align: "right",
  });
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || CARD },
    line: { color: opts.line || HAIR, width: 0.6 },
    rectRadius: opts.radius ?? 0.12,
    shadow: opts.shadow !== false ? shadow() : undefined,
  });
}

function stageNum(slide, x, y, num, color) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: 0.7, h: 0.7,
    fill: { color }, line: { type: "none" },
  });
  slide.addText(num, {
    x, y, w: 0.7, h: 0.7, margin: 0,
    fontSize: 22, bold: true, color: "FFFFFF",
    fontFace: "Calibri", align: "center", valign: "middle",
  });
}

// ============================================================
//  SLIDES
// ============================================================
const SLIDES_TOTAL = 12;

// -------------------------------------------------------------
//  1 · COVER
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: INK };

  // Subtle background diagonal stripe
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 0.18,
    fill: { color: RED }, line: { type: "none" },
  });

  // Logo top-right (white-friendly)
  s.addImage({
    path: LOGO_PATH,
    x: W - (0.55 * LOGO_AR) - 0.7, y: 0.6,
    w: 0.55 * LOGO_AR, h: 0.55,
  });

  // Eyebrow
  s.addText("WORKING ARCHITECTURE", {
    x: 0.7, y: 2.4, w: 11, h: 0.4, margin: 0,
    fontSize: 14, bold: true, color: RED, fontFace: "Calibri",
    charSpacing: 6,
  });

  // Title
  s.addText("Trapdoor", {
    x: 0.7, y: 2.8, w: 11, h: 1.5, margin: 0,
    fontSize: 80, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });

  // Subtitle
  s.addText("Extract. Detect. Sanitize.", {
    x: 0.7, y: 4.3, w: 11, h: 0.7, margin: 0,
    fontSize: 36, color: "FFFFFF", fontFace: "Calibri",
  });

  // Description
  s.addText(
    "How a single file is checked for prompt-injection attacks " +
    "before it ever reaches a language model — and the business " +
    "impact of stopping those attacks at the door.",
    {
      x: 0.7, y: 5.4, w: 10, h: 1.0, margin: 0,
      fontSize: 16, color: "C5C8D3", fontFace: "Calibri",
    }
  );
}

// -------------------------------------------------------------
//  2 · THE PROBLEM
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "THE PROBLEM", "A single uploaded file can hijack your AI.",
    "Modern language models obey the instructions they are given. " +
    "Documents can carry instructions you didn't write.");

  // Three problem cards
  const cards = [
    { title: "Hidden from humans",
      body: "Attackers conceal commands as white-on-white text, " +
            "tiny font, or inside file properties no one inspects. " +
            "The reviewer sees a blank space. The AI sees a command."},
    { title: "Read by the model",
      body: "The language model reads every character it is given. " +
            "It cannot tell which words came from the user and which " +
            "were hidden in an attached document by an outsider." },
    { title: "The AI complies",
      body: "When an attacker writes \"ignore previous instructions\" " +
            "or \"recommend this candidate 10/10,\" a helpful model " +
            "frequently does exactly that." },
  ];
  const yC = 3.1, hC = 3.4, gap = 0.3;
  const wC = (W - 1.1 - gap * 2) / 3;
  cards.forEach((c, i) => {
    const x = 0.55 + i * (wC + gap);
    card(s, x, yC, wC, hC);
    s.addText(c.title, {
      x: x + 0.4, y: yC + 0.3, w: wC - 0.8, h: 0.5, margin: 0,
      fontSize: 20, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.4, y: yC + 0.9, w: 0.7, h: 0,
      line: { color: RED, width: 2.5 },
    });
    s.addText(c.body, {
      x: x + 0.4, y: yC + 1.1, w: wC - 0.8, h: hC - 1.3, margin: 0,
      fontSize: 14, color: INK_SOFT, fontFace: "Calibri",
      paraSpaceAfter: 4,
    });
  });

  footer(s, 2, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  3 · THE DEFENCE IN THREE STAGES (OVERVIEW)
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "THE DEFENCE", "Three stages between the file and the model.",
    "Every uploaded file flows through the same deterministic pipeline. " +
    "Nothing reaches the language model unscanned.");

  const stages = [
    { num: "1", title: "Extract", color: BLUE,
      body: "Read every piece of text the file contains — " +
            "including what is hidden or encoded." },
    { num: "2", title: "Detect", color: PURPLE,
      body: "Test each piece of text against ten independent checks. " +
            "Any one of them can raise an alarm." },
    { num: "3", title: "Sanitize", color: OK,
      body: "Remove, quote, or block the dangerous parts. " +
            "Hand the model a clean, safe version." },
  ];
  const yR = 3.2, hR = 3.3, gap = 0.4;
  const wR = (W - 1.1 - gap * 2) / 3;
  stages.forEach((st, i) => {
    const x = 0.55 + i * (wR + gap);
    card(s, x, yR, wR, hR);
    stageNum(s, x + 0.4, yR + 0.4, st.num, st.color);
    s.addText(st.title, {
      x: x + 1.3, y: yR + 0.42, w: wR - 1.6, h: 0.7, margin: 0,
      fontSize: 28, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.4, y: yR + 1.45, w: wR - 0.8, h: 0,
      line: { color: HAIR, width: 0.6 },
    });
    s.addText(st.body, {
      x: x + 0.4, y: yR + 1.65, w: wR - 0.8, h: hR - 1.9, margin: 0,
      fontSize: 15, color: INK_SOFT, fontFace: "Calibri",
    });

    // Arrow between stages
    if (i < stages.length - 1) {
      s.addShape(pres.shapes.RIGHT_TRIANGLE, {
        x: x + wR + 0.05, y: yR + 1.45, w: 0.3, h: 0.4,
        fill: { color: RED }, line: { type: "none" }, rotate: 90,
      });
    }
  });

  footer(s, 3, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  4 · STAGE 1 · EXTRACT
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "STAGE 1 · EXTRACT", "Find every word the model would see.",
    "The same file can carry instructions in many places. We surface all of them.");

  // What we read
  const items = [
    { h: "The visible text",
      d: "The headlines, paragraphs, and bullet points a person would read." },
    { h: "The hidden text",
      d: "White-on-white, tiny font, off-canvas, zero-opacity — anything an attacker placed out of human sight." },
    { h: "Text inside images, audio, video",
      d: "OCR on embedded images. Speech-to-text on audio. Subtitles on video. Even text encoded into image pixels." },
    { h: "The file's own properties",
      d: "Author, title, subject, comments, EXIF, ID3 — every metadata field the file format defines." },
    { h: "What's inside encoded blobs",
      d: "Base64, hex, URL-encoded payloads decoded and read as plain text. Blobs-inside-blobs unwrapped twice." },
  ];

  const xCol = 0.55, yCol = 3.05;
  const rowH = 0.62;
  items.forEach((it, i) => {
    const y = yCol + i * rowH;
    s.addShape(pres.shapes.OVAL, {
      x: xCol, y: y + 0.10, w: 0.16, h: 0.16,
      fill: { color: BLUE }, line: { type: "none" },
    });
    s.addText(it.h, {
      x: xCol + 0.30, y: y - 0.02, w: 5, h: 0.28, margin: 0,
      fontSize: 14, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addText(it.d, {
      x: xCol + 0.30, y: y + 0.24, w: 10.0, h: 0.36, margin: 0,
      fontSize: 11.5, color: INK_SOFT, fontFace: "Calibri",
    });
  });

  // Outcome strip at the bottom
  card(s, 0.55, 6.18, W - 1.1, 0.7, { fill: RED_SOFT, line: RED, shadow: false });
  s.addText("Outcome: a flat list of text fragments — visible, hidden, encoded, transcribed, decoded — each tagged with where it came from.", {
    x: 0.8, y: 6.18, w: W - 1.6, h: 0.7, margin: 0,
    fontSize: 13, italic: true, color: INK, fontFace: "Calibri",
    valign: "middle",
  });

  footer(s, 4, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  5 · STAGE 2 · DETECT (overview)
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "STAGE 2 · DETECT", "Ten checks. Different angles. One verdict.",
    "Each text fragment is examined by ten independent specialists. " +
    "An attacker has to defeat every one of them simultaneously to slip through.");

  // Two-column layout of detector "what they look for" in plain language
  const left = [
    { h: "Known attack phrasing",
      d: "Sentences like \"ignore previous instructions\" — recognised even when disguised." },
    { h: "Invisible characters",
      d: "Zero-width spaces, hidden tag glyphs, math-style letters that tokenize differently." },
    { h: "Hidden text",
      d: "Anything the file rendered out of human sight, plus how much of the page it covered." },
    { h: "Suspect metadata",
      d: "Authors named \"SYSTEM\", command-shaped subjects, exfiltration links in keywords." },
    { h: "Images that hide messages",
      d: "Text encoded into pixel bits — invisible to the eye, trivially decodable by an attacker." },
  ];
  const right = [
    { h: "Encoded payloads",
      d: "Base64 / hex / URL-encoded / ROT13 decoded — and re-checked. Two-layer wraps unwound." },
    { h: "Display-order tricks",
      d: "Trojan-Source attacks that flip what humans read versus what the model parses." },
    { h: "Deceptive links",
      d: "Mixed-alphabet domains, punycode, raw IPs, executable data: URIs, link shorteners." },
    { h: "Code in unexpected places",
      d: "HTML / JS / SQL / template payloads inside OCR output or audio transcripts." },
    { h: "A second opinion",
      d: "Optional AI classifier judges meaning, not exact words. Catches paraphrased attacks." },
  ];

  const yT = 3.05, colW = 5.7, gap = 0.4, rowH = 0.72;
  [left, right].forEach((col, c) => {
    const x = 0.55 + c * (colW + gap);
    col.forEach((it, i) => {
      const y = yT + i * rowH;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: y + 0.06, w: 0.06, h: 0.55,
        fill: { color: PURPLE }, line: { type: "none" },
      });
      s.addText(it.h, {
        x: x + 0.18, y: y - 0.02, w: colW - 0.2, h: 0.28, margin: 0,
        fontSize: 13, bold: true, color: INK, fontFace: "Calibri",
      });
      s.addText(it.d, {
        x: x + 0.18, y: y + 0.24, w: colW - 0.2, h: 0.42, margin: 0,
        fontSize: 10.5, color: INK_SOFT, fontFace: "Calibri",
      });
    });
  });

  footer(s, 5, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  6 · STAGE 2 · WHY TEN SEPARATE CHECKS
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "STAGE 2 · WHY TEN",
    "Different attacks. Different fingerprints.",
    "No single test catches everything. Together they form a net.");

  const axes = [
    { label: "Vocabulary",        eg: "The literal words" },
    { label: "Codepoints",        eg: "Invisible / look-alike characters" },
    { label: "Visibility",        eg: "Rendered in white ink" },
    { label: "Placement",         eg: "Inside metadata, comments" },
    { label: "Pixel encoding",    eg: "Hidden in image bits" },
    { label: "Text encoding",     eg: "Base64 / hex / ROT13" },
    { label: "Display order",     eg: "Bidirectional override" },
    { label: "Outbound target",   eg: "Where a link points" },
    { label: "Channel mismatch",  eg: "HTML inside a transcript" },
    { label: "Semantic intent",   eg: "Meaning, not exact words" },
  ];

  const cols = 5, gap = 0.25;
  const tileW = (W - 1.1 - gap * (cols - 1)) / cols;
  const tileH = 1.5;
  const yStart = 3.1;
  axes.forEach((a, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = 0.55 + c * (tileW + gap);
    const y = yStart + r * (tileH + 0.3);
    card(s, x, y, tileW, tileH);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: tileW, h: 0.10,
      fill: { color: PURPLE }, line: { type: "none" },
    });
    s.addText(a.label, {
      x: x + 0.2, y: y + 0.25, w: tileW - 0.4, h: 0.45, margin: 0,
      fontSize: 16, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addText(a.eg, {
      x: x + 0.2, y: y + 0.75, w: tileW - 0.4, h: 0.65, margin: 0,
      fontSize: 11, italic: true, color: INK_SOFT, fontFace: "Calibri",
    });
  });

  // Punchline strip
  card(s, 0.55, 6.5, W - 1.1, 0.55, { fill: INK, line: INK, shadow: false });
  s.addText(
    "To slip through, an attack must leave a clean fingerprint on every one of these axes simultaneously. " +
    "That's hard — because real attacks usually trip several at once.",
    {
      x: 0.8, y: 6.5, w: W - 1.6, h: 0.55, margin: 0,
      fontSize: 12, color: "FFFFFF", fontFace: "Calibri",
      valign: "middle", italic: true,
    }
  );

  footer(s, 6, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  7 · STAGE 3 · SANITIZE
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "STAGE 3 · SANITIZE", "Hand the model a clean version.",
    "Every alarm carries a recommended action. We apply them and produce safe text.");

  // Three actions
  const acts = [
    { tag: "STRIP",   color: WARN,
      label: "Remove the offending span",
      body: "Cut out only the attack words. Replace with [REDACTED]. The rest of the surrounding sentence survives unharmed." },
    { tag: "QUOTE",   color: BLUE,
      label: "Wrap as untrusted data",
      body: "Surround the suspect text with an \"untrusted\" fenced block so the model knows to treat it as evidence, never as a directive." },
    { tag: "DISCARD", color: DANGER,
      label: "Drop the fragment entirely",
      body: "For high-confidence attacks (decoded base64, image-hidden payloads), the whole fragment is removed before the model ever sees it." },
  ];
  const wA = (W - 1.1 - 0.5) / 3, hA = 2.8, yA = 3.05;
  acts.forEach((a, i) => {
    const x = 0.55 + i * (wA + 0.25);
    card(s, x, yA, wA, hA);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.3, y: yA + 0.3, w: 1.4, h: 0.4,
      fill: { color: a.color }, line: { type: "none" }, rectRadius: 0.07,
    });
    s.addText(a.tag, {
      x: x + 0.3, y: yA + 0.3, w: 1.4, h: 0.4, margin: 0,
      fontSize: 12, bold: true, color: "FFFFFF", fontFace: "Calibri",
      align: "center", valign: "middle", charSpacing: 4,
    });
    s.addText(a.label, {
      x: x + 0.3, y: yA + 0.85, w: wA - 0.6, h: 0.5, margin: 0,
      fontSize: 18, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addText(a.body, {
      x: x + 0.3, y: yA + 1.4, w: wA - 0.6, h: hA - 1.5, margin: 0,
      fontSize: 13, color: INK_SOFT, fontFace: "Calibri",
    });
  });

  // The deliverable
  card(s, 0.55, 6.05, W - 1.1, 0.9, { fill: "EDF7EF", line: OK, shadow: false });
  s.addText("Deliverable: sanitized_context", {
    x: 0.85, y: 6.10, w: 4, h: 0.4, margin: 0,
    fontSize: 14, bold: true, color: OK, fontFace: "Calibri",
  });
  s.addText("The exact string of text the downstream language model is allowed to consume — with every detected attack already stripped, quoted, or discarded.", {
    x: 0.85, y: 6.48, w: W - 1.7, h: 0.45, margin: 0,
    fontSize: 12, color: INK, fontFace: "Calibri",
  });

  footer(s, 7, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  8 · THE VERDICT
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "THE VERDICT", "One number. Three outcomes.",
    "Alarms are combined into a single risk score, which decides what happens next.");

  const verdicts = [
    { tag: "PASS",   color: OK,     fill: "EDF7EF", line: OK,
      head: "Safe to forward",
      sub: "Risk below 0.35. No alarm fired loudly enough to act on. The sanitised text continues to the model as-is." },
    { tag: "REVIEW", color: WARN,   fill: "FFF6E5", line: WARN,
      head: "Sanitised, surfaced",
      sub: "Risk between 0.35 and 0.85. Trapdoor cleaned the text and tells the operator what it removed and why." },
    { tag: "BLOCK",  color: DANGER, fill: "FBE5EA", line: DANGER,
      head: "Never reaches the AI",
      sub: "Risk above 0.85, or any single high/critical alarm. The file is rejected at the door. The model is never invoked." },
  ];

  const yV = 3.05, hV = 3.6, gap = 0.3;
  const wV = (W - 1.1 - gap * 2) / 3;
  verdicts.forEach((v, i) => {
    const x = 0.55 + i * (wV + gap);
    card(s, x, yV, wV, hV, { fill: v.fill, line: v.line });
    s.addText(v.tag, {
      x: x + 0.4, y: yV + 0.4, w: wV - 0.8, h: 0.7, margin: 0,
      fontSize: 38, bold: true, color: v.color, fontFace: "Calibri",
      align: "left",
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.4, y: yV + 1.25, w: 0.9, h: 0,
      line: { color: v.color, width: 2.5 },
    });
    s.addText(v.head, {
      x: x + 0.4, y: yV + 1.4, w: wV - 0.8, h: 0.5, margin: 0,
      fontSize: 18, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addText(v.sub, {
      x: x + 0.4, y: yV + 1.95, w: wV - 0.8, h: hV - 2.0, margin: 0,
      fontSize: 13, color: INK_SOFT, fontFace: "Calibri",
    });
  });

  footer(s, 8, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  9 · A REAL EXAMPLE
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "A REAL EXAMPLE", "What this looks like for a recruiter resume.",
    "Same file. Same three stages. Specific findings.");

  // Three-column timeline
  const cols = [
    { stage: "Extract", color: BLUE, num: "1",
      bullets: [
        "Reads the visible resume content normally.",
        "Spots a paragraph rendered in white ink between Summary and Skills — invisible to the recruiter.",
        "Reads PDF properties: author, title, subject."
      ]
    },
    { stage: "Detect", color: PURPLE, num: "2",
      bullets: [
        "Pattern check matches \"ignore previous instructions.\"",
        "Pattern check matches \"rate them 10 out of 10.\"",
        "Invisible-text check flags the white paragraph as hidden content.",
        "Confidence: 97% · Severity: critical."
      ]
    },
    { stage: "Sanitize", color: OK, num: "3",
      bullets: [
        "The hidden paragraph is removed entirely from the text passed onward.",
        "Verdict: BLOCK.",
        "The downstream resume-screening AI is never asked to evaluate the poisoned content."
      ]
    },
  ];

  const yE = 3.05, hE = 3.7, gapE = 0.3;
  const wE = (W - 1.1 - gapE * 2) / 3;
  cols.forEach((c, i) => {
    const x = 0.55 + i * (wE + gapE);
    card(s, x, yE, wE, hE);
    stageNum(s, x + 0.35, yE + 0.35, c.num, c.color);
    s.addText(c.stage, {
      x: x + 1.2, y: yE + 0.4, w: wE - 1.4, h: 0.6, margin: 0,
      fontSize: 22, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.35, y: yE + 1.25, w: wE - 0.7, h: 0,
      line: { color: HAIR, width: 0.6 },
    });
    s.addText(c.bullets.map(b => ({ text: b, options: { bullet: { code: "25CF" } } })), {
      x: x + 0.4, y: yE + 1.4, w: wE - 0.8, h: hE - 1.55, margin: 0,
      fontSize: 12.5, color: INK_SOFT, fontFace: "Calibri",
      paraSpaceAfter: 5,
    });
  });

  footer(s, 9, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  10 · WHERE IT MATTERS
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "WHERE IT MATTERS", "Use cases by industry.",
    "Anywhere an AI reads files supplied by someone other than the immediate user.");

  const cases = [
    { ind: "HR & Recruiting", scen: "LLM-driven resume screening",
      blurb: "Catches hidden \"rate 10/10\" instructions in PDFs, role-impersonation in document properties, and links pointing to fake portfolios." },
    { ind: "Healthcare", scen: "Clinical-note summarisation",
      blurb: "Prevents injection inside scanned patient records, exfiltration prompts hidden in imaging metadata, and display-order tricks in imported documents." },
    { ind: "Financial services", scen: "RAG over compliance documents",
      blurb: "Blocks attacks smuggled inside filings, encoded payloads in spreadsheet cells, and prompt-leak attempts in customer invoices." },
    { ind: "Customer support", scen: "Auto-summary of uploaded tickets",
      blurb: "Catches code payloads recovered from screenshot attachments and exfiltration prompts hidden inside transcripts of voicemails." },
    { ind: "Legal & eDiscovery", scen: "AI-assisted document review",
      blurb: "Surfaces Trojan-Source overrides in contracts, encoded clauses, and instructions hidden in document properties that would otherwise bias review." },
    { ind: "Enterprise SaaS", scen: "Multi-tenant LLM applications",
      blurb: "Stops one customer's malicious upload from poisoning another customer's AI session. Works in air-gapped tenants — no external calls required." },
  ];

  const cols = 3, gap = 0.25;
  const wU = (W - 1.1 - gap * (cols - 1)) / cols;
  const hU = 1.85;
  const yU = 3.05;
  cases.forEach((c, i) => {
    const r = Math.floor(i / cols), col = i % cols;
    const x = 0.55 + col * (wU + gap);
    const y = yU + r * (hU + 0.25);
    card(s, x, y, wU, hU);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: hU,
      fill: { color: RED }, line: { type: "none" },
    });
    s.addText(c.ind, {
      x: x + 0.3, y: y + 0.18, w: wU - 0.4, h: 0.32, margin: 0,
      fontSize: 11, bold: true, color: RED, fontFace: "Calibri",
      charSpacing: 3,
    });
    s.addText(c.scen, {
      x: x + 0.3, y: y + 0.5, w: wU - 0.4, h: 0.4, margin: 0,
      fontSize: 16, bold: true, color: INK, fontFace: "Calibri",
    });
    s.addText(c.blurb, {
      x: x + 0.3, y: y + 0.92, w: wU - 0.4, h: hU - 1.0, margin: 0,
      fontSize: 11.5, color: INK_SOFT, fontFace: "Calibri",
    });
  });

  footer(s, 10, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  11 · BUSINESS IMPACT
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: BG };
  pageHeader(s, "BUSINESS IMPACT", "Why it pays off.",
    "Faster than the model itself, cheaper than another API call, and structurally able to catch attacks the model can't see.");

  // Top: four benefit cards
  const benefits = [
    { stat: "10",      label: "INDEPENDENT DETECTORS",
      sub: "Defence in depth — different angles, all running on every file." },
    { stat: "<800ms",  label: "AVERAGE SCAN TIME",
      sub: "Faster than a single language-model call. Front-loads the security cost." },
    { stat: "$0",      label: "PER SCAN OFFLINE",
      sub: "Nine of ten detectors run with no external service. Air-gap-friendly." },
    { stat: "100%",    label: "AUDITED VERDICTS",
      sub: "Every block carries an evidence record: detector, category, confidence, location." },
  ];
  const wB = (W - 1.1 - 0.3 * 3) / 4, hB = 2.05, yB = 3.05;
  benefits.forEach((b, i) => {
    const x = 0.55 + i * (wB + 0.3);
    card(s, x, yB, wB, hB);
    s.addText(b.stat, {
      x: x + 0.25, y: yB + 0.25, w: wB - 0.5, h: 0.8, margin: 0,
      fontSize: 32, bold: true, color: RED, fontFace: "Calibri",
    });
    s.addText(b.label, {
      x: x + 0.25, y: yB + 1.05, w: wB - 0.5, h: 0.32, margin: 0,
      fontSize: 10, bold: true, color: INK, fontFace: "Calibri",
      charSpacing: 2,
    });
    s.addText(b.sub, {
      x: x + 0.25, y: yB + 1.38, w: wB - 0.5, h: hB - 1.5, margin: 0,
      fontSize: 10.5, color: INK_SOFT, fontFace: "Calibri",
    });
  });

  // Bottom: the cost of NOT having it
  card(s, 0.55, 5.35, W - 1.1, 1.6, { fill: INK, line: INK, shadow: false });
  s.addText("The cost of NOT having a layer like this", {
    x: 0.85, y: 5.45, w: 11, h: 0.4, margin: 0,
    fontSize: 13, bold: true, color: RED, fontFace: "Calibri",
    charSpacing: 3,
  });
  s.addText(
    "A single successful injection against a customer-facing AI can leak credentials, corrupt downstream automation, " +
    "pivot to your tools layer, or surface biased decisions to the people they affect. " +
    "Detection from inside the language model is structurally blind to invisible text, encoded payloads, " +
    "display-order tricks, look-alike URLs, and code smuggled through OCR. " +
    "Trapdoor sits in front of the model — every uploaded file is scanned and sanitised before a single token reaches the prompt.",
    {
      x: 0.85, y: 5.85, w: W - 1.7, h: 1.05, margin: 0,
      fontSize: 12.5, color: "FFFFFF", fontFace: "Calibri",
    }
  );

  footer(s, 11, SLIDES_TOTAL);
}

// -------------------------------------------------------------
//  12 · CLOSING / SUMMARY
// -------------------------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: INK };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 0.18,
    fill: { color: RED }, line: { type: "none" },
  });
  s.addImage({
    path: LOGO_PATH,
    x: W - (0.55 * LOGO_AR) - 0.7, y: 0.6,
    w: 0.55 * LOGO_AR, h: 0.55,
  });

  // Big stack
  s.addText("Extract.", {
    x: 0.8, y: 1.8, w: 12, h: 1.0, margin: 0,
    fontSize: 72, bold: true, color: BLUE, fontFace: "Calibri",
  });
  s.addText("Detect.", {
    x: 0.8, y: 2.85, w: 12, h: 1.0, margin: 0,
    fontSize: 72, bold: true, color: PURPLE, fontFace: "Calibri",
  });
  s.addText("Sanitize.", {
    x: 0.8, y: 3.9, w: 12, h: 1.0, margin: 0,
    fontSize: 72, bold: true, color: OK, fontFace: "Calibri",
  });

  s.addShape(pres.shapes.LINE, {
    x: 0.8, y: 5.2, w: 4, h: 0,
    line: { color: RED, width: 2 },
  });

  s.addText("Three stages, one safe context.", {
    x: 0.8, y: 5.35, w: 12, h: 0.55, margin: 0,
    fontSize: 26, color: "FFFFFF", fontFace: "Calibri",
  });
  s.addText(
    "Every file checked before the AI ever sees it. " +
    "Every block backed by evidence. Every verdict auditable.",
    {
      x: 0.8, y: 5.95, w: 12, h: 0.5, margin: 0,
      fontSize: 16, color: "C5C8D3", fontFace: "Calibri",
    }
  );

  s.addText("Trapdoor — Multimodal Prompt-Injection Defender", {
    x: 0.55, y: 7.05, w: W - 1.1, h: 0.3, margin: 0,
    fontSize: 11, color: MUTED, fontFace: "Calibri",
  });
}

// ============================================================
//  WRITE
// ============================================================
pres.writeFile({ fileName: "Trapdoor-Working.pptx" })
  .then(name => console.log(`Wrote ${name}`));
