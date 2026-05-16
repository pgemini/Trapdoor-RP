"""Trapdoor recursive folder scanner.

Walk a directory, run every supported file through `scan_bytes`, and print a
per-file verdict + risk score. Exits non-zero if any file is BLOCK.

Usage:
    python -m app.cli PATH [PATH ...] [options]

From the repo root, use the wrapper:
    ./scan.sh PATH                # macOS / Linux
    .\\scan.ps1 PATH               # Windows
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .extractors.registry import _BY_EXT
from .scanner import scan_bytes
from .schemas import ScanResult, Severity


SUPPORTED_EXTS = set(_BY_EXT.keys())

DEFAULT_EXCLUDES = (
    ".git", ".hg", ".svn", "__pycache__", ".venv", "venv", "env",
    "node_modules", ".idea", ".vscode", ".mypy_cache", ".pytest_cache",
    ".next", ".cache", "dist", "build",
)

SEVERITY_ORDER: dict[Severity, int] = {
    "info": 0, "low": 1, "med": 2, "high": 3, "critical": 4,
}


# --- terminal output ---------------------------------------------------------

class Colors:
    """ANSI palette. Use `c.<name>` for SGR codes; empty strings when disabled."""

    def __init__(self, enabled: bool) -> None:
        def _(seq: str) -> str: return seq if enabled else ""
        self.reset   = _("\033[0m")
        self.dim     = _("\033[2m")
        self.bold    = _("\033[1m")
        self.italic  = _("\033[3m")
        self.under   = _("\033[4m")
        # 8-bit ANSI core
        self.red     = _("\033[31m");  self.green   = _("\033[32m")
        self.yellow  = _("\033[33m");  self.blue    = _("\033[34m")
        self.magenta = _("\033[35m");  self.cyan    = _("\033[36m")
        self.white   = _("\033[37m");  self.grey    = _("\033[90m")
        self.bred    = _("\033[91m");  self.bgreen  = _("\033[92m")
        self.byellow = _("\033[93m");  self.bblue   = _("\033[94m")
        self.bmag    = _("\033[95m");  self.bcyan   = _("\033[96m")
        # accent — Trapdoor brand blue (256-color)
        self.accent  = _("\033[38;5;39m")
        self.danger  = _("\033[38;5;203m")
        self.warn    = _("\033[38;5;215m")
        self.ok      = _("\033[38;5;77m")
        self.muted   = _("\033[38;5;244m")


class Glyphs:
    """Unicode glyphs with an ASCII fallback when `unicode=False`."""

    def __init__(self, unicode: bool = True) -> None:
        if unicode:
            # box drawing
            self.tl, self.tr, self.bl, self.br = "╭", "╮", "╰", "╯"
            self.h, self.v = "─", "│"
            self.t_left, self.t_right = "├", "┤"
            # verdict glyphs
            self.g_block, self.g_review, self.g_pass, self.g_skip = "✗", "⚠", "✓", "·"
            # meter cells
            self.cell_full, self.cell_empty = "▰", "▱"
            # tree
            self.t_branch, self.t_last, self.t_pipe = "├─", "╰─", "│ "
            self.arrow = "→"
        else:
            self.tl = self.tr = self.bl = self.br = "+"
            self.h, self.v = "-", "|"
            self.t_left = self.t_right = "+"
            self.g_block, self.g_review, self.g_pass, self.g_skip = "x", "!", "v", "."
            self.cell_full, self.cell_empty = "#", "."
            self.t_branch, self.t_last, self.t_pipe = "+-", "`-", "| "
            self.arrow = "->"


SEVERITY_COLOR_NAMES = {
    "critical": "danger", "high": "danger", "med": "warn",
    "low": "blue", "info": "muted",
}


def _term_width(default: int = 100) -> int:
    try:
        w = shutil.get_terminal_size((default, 24)).columns
        # Don't go crazy wide — 110 is comfortable for the layout.
        return max(60, min(w, 110))
    except Exception:
        return default


def _strip_ansi(s: str) -> str:
    return _ANSI_RE.sub("", s)


_ANSI_RE = re.compile(r"\x1B\[[0-9;]*[A-Za-z]")


def _visible_len(s: str) -> int:
    return len(_strip_ansi(s))


def _pad_right(s: str, width: int) -> str:
    """Pad to *visible* width (ANSI-aware)."""
    pad = max(0, width - _visible_len(s))
    return s + " " * pad


def _risk_meter(risk: float, c: Colors, g: Glyphs, cells: int = 10) -> str:
    """ten-cell bar.  green → yellow → red gradient by overall risk band."""
    filled = max(0, min(cells, round(risk * cells)))
    if risk >= 0.85:
        color = c.danger
    elif risk >= 0.35:
        color = c.warn
    else:
        color = c.ok if filled else c.muted
    bar = color + (g.cell_full * filled) + c.muted + (g.cell_empty * (cells - filled)) + c.reset
    return bar


def _verdict_badge(verdict: str, c: Colors, g: Glyphs) -> tuple[str, str]:
    """Return (glyph_only, glyph+word) — both pre-coloured."""
    if verdict == "block":
        return (f"{c.bold}{c.danger}{g.g_block}{c.reset}",
                f"{c.bold}{c.danger}{g.g_block} BLOCK {c.reset}")
    if verdict == "review":
        return (f"{c.bold}{c.warn}{g.g_review}{c.reset}",
                f"{c.bold}{c.warn}{g.g_review} REVIEW{c.reset}")
    if verdict == "pass":
        return (f"{c.ok}{g.g_pass}{c.reset}",
                f"{c.ok}{g.g_pass} PASS  {c.reset}")
    return (f"{c.muted}{g.g_skip}{c.reset}",
            f"{c.muted}{g.g_skip} SKIP  {c.reset}")


def _hr(g: Glyphs, c: Colors, width: int) -> str:
    return c.grey + (g.h * width) + c.reset


def print_banner(c: Colors, g: Glyphs, *, file_count: int, workers: int,
                 roots: list[str], ai_enabled: bool, w: int) -> None:
    inner = w - 4
    title = f"{c.bold}{c.accent}TRAPDOOR{c.reset}  {c.dim}prompt-injection scanner{c.reset}"
    mode = f"{c.bgreen}live · AI Foundry{c.reset}" if ai_enabled else f"{c.byellow}live · heuristic{c.reset}"
    roots_str = ", ".join(roots[:3]) + (f" +{len(roots)-3}" if len(roots) > 3 else "")
    sub = (
        f"{c.dim}scanning{c.reset} {c.bold}{file_count}{c.reset} {c.dim}files{c.reset}  "
        f"{c.grey}{g.v}{c.reset}  {c.dim}workers{c.reset} {c.bold}{workers}{c.reset}  "
        f"{c.grey}{g.v}{c.reset}  {mode}"
    )
    path_line = f"{c.dim}from{c.reset} {c.cyan}{roots_str}{c.reset}"

    print(f"{c.grey}{g.tl}{g.h * (w-2)}{g.tr}{c.reset}")
    print(f"{c.grey}{g.v}{c.reset} {_pad_right(title, inner)} {c.grey}{g.v}{c.reset}")
    print(f"{c.grey}{g.t_left}{g.h * (w-2)}{g.t_right}{c.reset}")
    print(f"{c.grey}{g.v}{c.reset} {_pad_right(sub, inner)} {c.grey}{g.v}{c.reset}")
    print(f"{c.grey}{g.v}{c.reset} {_pad_right(path_line, inner)} {c.grey}{g.v}{c.reset}")
    print(f"{c.grey}{g.bl}{g.h * (w-2)}{g.br}{c.reset}")
    print()


def _truncate_path(path: str, max_len: int) -> str:
    """Shorten a long path from the *left* so the filename stays visible."""
    if len(path) <= max_len:
        return path
    return "…" + path[-(max_len - 1):]


def _format_line(rel: str, rep: FileReport, c: Colors, g: Glyphs, *, w: int) -> str:
    """Single rich line per file: glyph + badge + meter + pct + path + stats."""
    if rep.error:
        return (
            f"  {c.muted}{g.g_skip}{c.reset} "
            f"{c.muted}SKIP  {c.reset} "
            f"{c.muted}{'·' * 10}{c.reset} {c.muted} —- {c.reset}  "
            f"{c.dim}{rel}{c.reset}  "
            f"{c.dim}{rep.error}{c.reset}"
        )

    r = rep.result
    assert r is not None
    _, badge = _verdict_badge(r.verdict, c, g)
    meter = _risk_meter(r.risk_score, c, g)
    pct = f"{int(round(r.risk_score * 100)):>3}%"
    pct_col = c.danger if r.risk_score >= 0.85 else c.warn if r.risk_score >= 0.35 else c.muted

    # File path — adapt width to remaining space
    fixed_prefix_len = 2 + 1 + 8 + 1 + 10 + 1 + 4 + 2  # badge + meter + pct + spaces
    stats_n = len(r.findings)
    stats = (f"{c.dim}·{c.reset} "
             f"{(c.danger if stats_n else c.muted)}{stats_n} hit{'s' if stats_n != 1 else ''}{c.reset} "
             f"{c.dim}·{c.reset} {c.muted}{r.duration_ms}ms{c.reset}")
    stats_len = _visible_len(stats)
    path_max = max(20, w - fixed_prefix_len - stats_len - 4)
    short = _truncate_path(rel, path_max)
    path_disp = f"{c.bold}{c.white}{short}{c.reset}"
    # right-align stats
    line_left = f"  {badge} {meter} {pct_col}{pct}{c.reset}  {path_disp}"
    pad = max(2, w - _visible_len(line_left) - stats_len - 2)
    return f"{line_left}{' ' * pad}{stats}"


def _print_findings(rep: FileReport, c: Colors, g: Glyphs, min_sev: int) -> None:
    if not rep.result:
        return
    findings = [f for f in rep.result.findings if SEVERITY_ORDER[f.severity] >= min_sev]
    if not findings:
        return
    for i, f in enumerate(findings):
        last = i == len(findings) - 1
        branch = g.t_last if last else g.t_branch
        sev_col = getattr(c, SEVERITY_COLOR_NAMES.get(f.severity, "muted"))
        evidence = (f.evidence or "").replace("\n", " ")
        if len(evidence) > 96:
            evidence = evidence[:93] + "…"
        sev_pill = f"{sev_col}{f.severity.upper():<8}{c.reset}"
        print(
            f"     {c.grey}{branch}{c.reset} {sev_pill} "
            f"{c.cyan}{f.detector:<14}{c.reset} "
            f"{c.dim}{f.category:<22}{c.reset} "
            f"{c.muted}conf{c.reset} {c.bold}{int(round(f.confidence*100))}%{c.reset}  "
            f"{c.grey}{g.arrow}{c.reset} {evidence}"
        )


def _print_fragments(rep: FileReport, c: Colors, g: Glyphs) -> None:
    if not rep.result:
        return
    fragments = rep.result.extracted_fragments or []
    if not fragments:
        print(f"     {c.grey}{g.t_last}{c.reset} {c.dim}extractor produced 0 fragments — nothing to scan{c.reset}")
        return
    for i, fr in enumerate(fragments):
        last = i == len(fragments) - 1
        branch = g.t_last if last else g.t_branch
        text = fr.text.replace("\n", " ").strip()
        if len(text) > 88:
            text = text[:85] + "…"
        attrs = ""
        if fr.attrs.get("visibility") == "invisible":
            attrs = f"  {c.warn}[invisible]{c.reset}"
        print(
            f"     {c.grey}{branch}{c.reset} "
            f"{c.dim}[{c.reset}{c.cyan}{fr.kind:<8}{c.reset}{c.dim}]{c.reset} "
            f"{c.muted}{fr.source:<22}{c.reset} {text}{attrs}"
        )


def _print_extract_notes(rep: FileReport, c: Colors, g: Glyphs) -> None:
    if not rep.result:
        return
    for stage in rep.result.stages:
        if stage.name == "extract:note" and stage.detail:
            print(f"     {c.grey}{g.t_pipe}{c.reset} {c.dim}note: {stage.detail}{c.reset}")


def print_summary(c: Colors, g: Glyphs, *, counts: dict, elapsed: float,
                  total: int, ai_enabled: bool, w: int) -> None:
    inner = w - 4
    title = f"{c.bold}Scan summary{c.reset}"
    block_rate = counts["block"] / total if total else 0.0

    # Rows: glyph + label + count
    def row(glyph: str, label_col: str, label: str, n: int, total: int) -> str:
        pct = f" {c.dim}({(n*100//total):>3}%){c.reset}" if total else ""
        return (f" {glyph}  {label_col}{label:<7}{c.reset}  "
                f"{c.bold}{n:>3}{c.reset}{pct}")

    r_block  = row(f"{c.bold}{c.danger}{g.g_block}{c.reset}", c.danger, "BLOCK",  counts["block"],  total)
    r_review = row(f"{c.bold}{c.warn}{g.g_review}{c.reset}",  c.warn,   "REVIEW", counts["review"], total)
    r_pass   = row(f"{c.ok}{g.g_pass}{c.reset}",              c.ok,     "PASS",   counts["pass"],   total)
    r_skip   = row(f"{c.muted}{g.g_skip}{c.reset}",           c.muted,  "SKIP",   counts["skip"],   total)

    rate = (total / elapsed) if elapsed > 0 else 0.0
    stat_lines = [
        f"{c.dim}elapsed   {c.reset}{c.bold}{elapsed:>6.2f}s{c.reset}",
        f"{c.dim}files     {c.reset}{c.bold}{total:>6d}{c.reset}",
        f"{c.dim}rate      {c.reset}{c.bold}{rate:>6.1f}{c.reset} {c.dim}files/s{c.reset}",
        f"{c.dim}block rate{c.reset} {c.bold}{int(round(block_rate*100)):>5d}%{c.reset}",
    ]

    # Risk-band visualization at the bottom
    if total > 0:
        cells = 24
        b = round((counts["block"] / total) * cells)
        r_ = round((counts["review"] / total) * cells)
        p_ = round((counts["pass"]   / total) * cells)
        s_ = max(0, cells - (b + r_ + p_))
        bar = (
            c.danger + g.cell_full * b +
            c.warn   + g.cell_full * r_ +
            c.ok     + g.cell_full * p_ +
            c.muted  + g.cell_full * s_ + c.reset
        )
    else:
        bar = c.muted + g.cell_empty * 24 + c.reset

    mode = f"{c.bgreen}live · AI Foundry{c.reset}" if ai_enabled else f"{c.byellow}live · heuristic{c.reset}"

    print()
    print(f"{c.grey}{g.tl}{g.h}{g.h} {title} {c.grey}{g.h * (w - 4 - _visible_len(title) - 2)}{g.tr}{c.reset}")
    print(f"{c.grey}{g.v}{c.reset} {_pad_right('', inner)} {c.grey}{g.v}{c.reset}")
    # Two columns: verdict rows | stats
    pairs = list(zip([r_block, r_review, r_pass, r_skip], stat_lines))
    col_w = max(_visible_len(left) for left, _ in pairs) + 4
    for left, right in pairs:
        left_pad = _pad_right(left, col_w)
        full = f"{left_pad}{c.grey}{g.v}{c.reset}  {right}"
        print(f"{c.grey}{g.v}{c.reset} {_pad_right(full, inner)} {c.grey}{g.v}{c.reset}")

    print(f"{c.grey}{g.v}{c.reset} {_pad_right('', inner)} {c.grey}{g.v}{c.reset}")
    print(f"{c.grey}{g.v}{c.reset} {_pad_right(f'{c.dim}distribution{c.reset}  {bar}', inner)} {c.grey}{g.v}{c.reset}")
    print(f"{c.grey}{g.v}{c.reset} {_pad_right(f'{c.dim}mode        {c.reset}  {mode}', inner)} {c.grey}{g.v}{c.reset}")
    print(f"{c.grey}{g.bl}{g.h * (w-2)}{g.br}{c.reset}")

    # Exit-code hint
    if counts["block"]:
        print(f"\n {c.danger}{g.g_block}{c.reset} {c.bold}{counts['block']} file{'s' if counts['block']!=1 else ''} blocked.{c.reset} {c.dim}exit 1{c.reset}")
    else:
        print(f"\n {c.ok}{g.g_pass}{c.reset} {c.bold}all clear.{c.reset} {c.dim}exit 0{c.reset}")


# --- walk --------------------------------------------------------------------

@dataclass
class WalkOptions:
    all_files: bool
    excludes: tuple[str, ...]
    follow_symlinks: bool
    max_bytes: int


def _is_excluded(name: str, patterns: tuple[str, ...]) -> bool:
    return any(fnmatch.fnmatch(name, p) for p in patterns)


def walk_files(roots: Iterable[Path], opts: WalkOptions) -> Iterable[Path]:
    for root in roots:
        if root.is_file():
            yield root
            continue
        for dirpath, dirnames, filenames in os.walk(root, followlinks=opts.follow_symlinks):
            # prune excluded directories in-place
            dirnames[:] = [d for d in dirnames if not _is_excluded(d, opts.excludes)]
            for fn in filenames:
                if _is_excluded(fn, opts.excludes):
                    continue
                p = Path(dirpath) / fn
                if not opts.all_files:
                    if p.suffix.lower() not in SUPPORTED_EXTS:
                        continue
                yield p


# --- scan one file -----------------------------------------------------------

@dataclass
class FileReport:
    path: Path
    result: ScanResult | None
    error: str | None
    duration_ms: int


def _scan_one(path: Path, max_bytes: int) -> FileReport:
    t0 = time.perf_counter()
    try:
        size = path.stat().st_size
        if size > max_bytes:
            return FileReport(path, None, f"skipped: {size} bytes > --max-bytes", 0)
        data = path.read_bytes()
        result = scan_bytes(data, path.name)
        return FileReport(path, result, None, int((time.perf_counter() - t0) * 1000))
    except Exception as e:
        return FileReport(path, None, f"{type(e).__name__}: {e}", int((time.perf_counter() - t0) * 1000))


# --- main --------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="trapdoor-scan",
        description="Recursively scan a folder for prompt-injection payloads.",
    )
    p.add_argument("paths", nargs="+", type=Path,
                   help="Files or directories to scan.")
    p.add_argument("--all", action="store_true",
                   help="Scan every file, not just known extensions.")
    p.add_argument("--exclude", action="append", default=[],
                   metavar="GLOB",
                   help="Glob pattern to skip (repeatable). Combined with the built-in defaults.")
    p.add_argument("--follow-symlinks", action="store_true",
                   help="Follow symlinks while walking directories.")
    p.add_argument("--max-bytes", type=int, default=50 * 1024 * 1024,
                   help="Skip files larger than this many bytes (default: 50 MiB).")
    p.add_argument("--workers", "-j", type=int, default=4,
                   help="Parallel worker threads (default: 4).")
    p.add_argument("--verbose", "-v", action="count", default=0,
                   help="Show findings under each flagged file. -vv shows info-level findings "
                        "and extractor notes (e.g. 'no transcription engine configured').")
    p.add_argument("--show-fragments", action="store_true",
                   help="After each file, print the fragments the extractor produced "
                        "(kind / source / text preview). Helps diagnose silent passes — "
                        "especially audio files with no transcription backend.")
    p.add_argument("--block-only", action="store_true",
                   help="Only print blocked files (suppress pass/review).")
    p.add_argument("--json", action="store_true",
                   help="Emit one JSON object per file (NDJSON) on stdout. Disables colored output.")
    p.add_argument("--no-color", action="store_true",
                   help="Disable ANSI color even on a TTY.")
    p.add_argument("--ascii", action="store_true",
                   help="Use ASCII fallback glyphs (for terminals without unicode support).")
    p.add_argument("--quiet", "-q", action="store_true",
                   help="Suppress per-file output; print only the final summary.")
    return p


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    use_color = (
        not args.no_color
        and not args.json
        and sys.stdout.isatty()
        and os.environ.get("NO_COLOR") is None
    )
    c = Colors(use_color)
    g = Glyphs(unicode=not args.ascii)
    w = _term_width()

    excludes = tuple(DEFAULT_EXCLUDES) + tuple(args.exclude)
    opts = WalkOptions(
        all_files=args.all,
        excludes=excludes,
        follow_symlinks=args.follow_symlinks,
        max_bytes=args.max_bytes,
    )

    # Resolve & validate inputs
    roots: list[Path] = []
    for p in args.paths:
        if not p.exists():
            print(f"error: path not found: {p}", file=sys.stderr)
            return 2
        roots.append(p)

    files = list(walk_files(roots, opts))

    # AI Foundry status, surfaced in the header + summary panel
    try:
        from .ai_foundry import classifier as _classifier
        ai_enabled = bool(_classifier.enabled)
    except Exception:
        ai_enabled = False

    if not args.json and not args.quiet:
        print_banner(
            c, g,
            file_count=len(files),
            workers=args.workers,
            roots=[str(r) for r in roots],
            ai_enabled=ai_enabled,
            w=w,
        )

    min_sev_print = 0 if args.verbose >= 2 else 1  # default skips "info"

    counts = {"pass": 0, "review": 0, "block": 0, "skip": 0}
    started = time.perf_counter()

    def _emit(rep: FileReport) -> None:
        rel = str(rep.path)
        try:
            rel = str(rep.path.relative_to(Path.cwd()))
        except ValueError:
            pass

        if rep.error:
            counts["skip"] += 1
            if not args.quiet and not args.block_only and not args.json:
                print(_format_line(rel, rep, c, g, w=w))
            elif args.json:
                print(json.dumps({"path": rel, "error": rep.error}))
            return

        r = rep.result
        assert r is not None
        counts[r.verdict] += 1

        if args.json:
            payload = {
                "path": rel,
                "verdict": r.verdict,
                "risk_score": r.risk_score,
                "size_bytes": r.size_bytes,
                "duration_ms": r.duration_ms,
                "modality": r.modality,
                "findings": [
                    {
                        "detector": f.detector,
                        "severity": f.severity,
                        "category": f.category,
                        "confidence": f.confidence,
                        "sanitize_action": f.sanitize_action,
                        "evidence": f.evidence,
                    } for f in r.findings
                ],
            }
            print(json.dumps(payload))
            return

        if args.quiet:
            return
        if args.block_only and r.verdict != "block":
            return
        print(_format_line(rel, rep, c, g, w=w))
        if args.verbose and r.findings:
            _print_findings(rep, c, g, min_sev_print)
        if args.verbose >= 2:
            _print_extract_notes(rep, c, g)
        if args.show_fragments:
            _print_fragments(rep, c, g)

    # Scan (parallel) — preserve ordering by submitting then printing as ready.
    if args.workers <= 1 or len(files) <= 1:
        for path in files:
            _emit(_scan_one(path, args.max_bytes))
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(_scan_one, p, args.max_bytes): p for p in files}
            for fut in as_completed(futures):
                _emit(fut.result())

    elapsed = time.perf_counter() - started

    if not args.json:
        total = sum(counts.values())
        print_summary(
            c, g,
            counts=counts,
            elapsed=elapsed,
            total=total,
            ai_enabled=ai_enabled,
            w=w,
        )

    return 1 if counts["block"] else 0


if __name__ == "__main__":
    sys.exit(main())
