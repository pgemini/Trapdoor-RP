"""Smoke test: generate every demo sample, scan it, print a one-line summary.

Run from backend/ with venv activated:

    python test_scan.py
"""
from __future__ import annotations

from app.samples import SAMPLE_KEYS, get_sample_bytes, prebuild_all
from app.scanner import scan_bytes


def main() -> int:
    prebuild_all()
    failures = 0
    print(f"{'sample':<10}  {'verdict':<6}  {'risk':>5}  {'findings':>8}  filename")
    print("-" * 78)
    for key in SAMPLE_KEYS:
        data, name = get_sample_bytes(key)
        result = scan_bytes(data, name)
        top = ", ".join(sorted({f.category for f in result.findings}))[:60] or "—"
        print(f"{key:<10}  {result.verdict:<6}  {result.risk_score:>5.2f}  "
              f"{len(result.findings):>8}  {name}")
        print(f"           categories: {top}")
        # Every demo sample is malicious — anything other than 'block' or 'review' is a regression.
        if result.verdict == "pass":
            print(f"           x unexpected PASS verdict")
            failures += 1
    print("-" * 78)
    if failures:
        print(f"FAILED ({failures})")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
