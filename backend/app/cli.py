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
    def __init__(self, enabled: bool) -> None:
        if enabled:
            self.reset = "\033[0m"
            self.dim = "\033[2m"
            self.bold = "\033[1m"
            self.red = "\033[31m"
            self.yellow = "\033[33m"
            self.green = "\033[32m"
            self.blue = "\033[34m"
            self.cyan = "\033[36m"
        else:
            self.reset = self.dim = self.bold = ""
            self.red = self.yellow = self.green = self.blue = self.cyan = ""


def _verdict_badge(verdict: str, c: Colors) -> str:
    if verdict == "block":
        return f"{c.bold}{c.red}BLOCK {c.reset}"
    if verdict == "review":
        return f"{c.bold}{c.yellow}REVIEW{c.reset}"
    return f"{c.green}PASS  {c.reset}"


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


# --- formatting --------------------------------------------------------------

def _format_line(rel: str, rep: FileReport, c: Colors) -> str:
    if rep.error:
        return f"{c.dim}SKIP  {c.reset} {rel}  {c.dim}{rep.error}{c.reset}"

    r = rep.result
    assert r is not None
    cats = sorted({f.category for f in r.findings})
    cats_str = ", ".join(cats[:3]) + (f" +{len(cats)-3}" if len(cats) > 3 else "")
    risk = f"{r.risk_score:0.2f}"
    n = len(r.findings)
    suffix = f"{n} finding{'s' if n != 1 else ''}"
    if cats_str:
        suffix += f": {cats_str}"
    return (
        f"{_verdict_badge(r.verdict, c)} "
        f"{c.bold}{rel}{c.reset}  "
        f"{c.dim}risk={c.reset}{risk}  "
        f"{c.dim}{suffix}{c.reset}  "
        f"{c.dim}({r.duration_ms}ms){c.reset}"
    )


def _print_findings(rep: FileReport, c: Colors, min_sev: int) -> None:
    if not rep.result:
        return
    for f in rep.result.findings:
        if SEVERITY_ORDER[f.severity] < min_sev:
            continue
        sev_color = {
            "critical": c.red, "high": c.red, "med": c.yellow,
            "low": c.blue, "info": c.dim,
        }[f.severity]
        evidence = (f.evidence or "").replace("\n", " ")
        if len(evidence) > 120:
            evidence = evidence[:117] + "..."
        print(
            f"    {sev_color}{f.severity:<8}{c.reset} "
            f"{c.dim}{f.detector:<14}{c.reset} "
            f"{f.category:<22} "
            f"{c.dim}conf={c.reset}{f.confidence:.2f}  "
            f"{c.dim}→{c.reset} {evidence}"
        )


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
                   help="Show findings under each flagged file. -vv shows info-level findings.")
    p.add_argument("--block-only", action="store_true",
                   help="Only print blocked files (suppress pass/review).")
    p.add_argument("--json", action="store_true",
                   help="Emit one JSON object per file (NDJSON) on stdout. Disables colored output.")
    p.add_argument("--no-color", action="store_true",
                   help="Disable ANSI color even on a TTY.")
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
    if not args.json and not args.quiet:
        kind = "files" if args.all else "supported files"
        print(f"{c.dim}Found {len(files)} {kind} to scan.{c.reset}")

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
                print(_format_line(rel, rep, c))
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
        print(_format_line(rel, rep, c))
        if args.verbose and r.findings:
            _print_findings(rep, c, min_sev_print)

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
        print(
            f"\n{c.bold}{total} files{c.reset} scanned in {elapsed:.1f}s  ·  "
            f"{c.red}{counts['block']} block{c.reset}  ·  "
            f"{c.yellow}{counts['review']} review{c.reset}  ·  "
            f"{c.green}{counts['pass']} pass{c.reset}  ·  "
            f"{c.dim}{counts['skip']} skipped{c.reset}"
        )

    return 1 if counts["block"] else 0


if __name__ == "__main__":
    sys.exit(main())
