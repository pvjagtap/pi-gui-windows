#!/usr/bin/env python3
"""
Code Review Diff Generator

Generates per-file diffs and a review scaffold for any git branch comparison.

Usage:
    python .agents/skills/codereview-diff/codereview-diff.py [--base main] [--head HEAD]

Output:
    docs/codereview/<branch>-review/
    ├── summary.md     — stats, file table sorted by change size
    ├── review.md      — review template with per-file sections
    └── diffs/         — one .diff per changed file
"""

import argparse
import fnmatch
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def categorize(path: str) -> str:
    """Categorize by top-level directory (or 2 levels for monorepos)."""
    parts = Path(path).parts
    if len(parts) <= 1:
        return "root"
    return "/".join(parts[:2]) if len(parts) > 2 else parts[0]


def run_git(args: list[str], cwd: str) -> str:
    result = subprocess.run(
        ["git"] + args, capture_output=True, text=True, cwd=cwd, timeout=60,
    )
    if result.returncode != 0:
        print(f"git {' '.join(args)} failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def diff_filename(path: str) -> str:
    """a/b/c.ts → a--b--c.ts.diff"""
    return path.replace("/", "--") + ".diff"


def get_numstat(base: str, head: str, cwd: str) -> dict[str, tuple[int, int]]:
    raw = run_git(["diff", f"{base}...{head}", "--numstat"], cwd)
    result = {}
    for line in raw.strip().splitlines():
        parts = line.split("\t")
        if len(parts) == 3:
            try:
                result[parts[2]] = (int(parts[0]), int(parts[1]))
            except ValueError:
                result[parts[2]] = (0, 0)
    return result


def short_hash(ref: str, cwd: str) -> str:
    return run_git(["rev-parse", "--short", ref], cwd).strip()


def matches_filters(path: str, include: str | None, exclude: str | None) -> bool:
    if include and not fnmatch.fnmatch(path, include):
        return False
    if exclude and fnmatch.fnmatch(path, exclude):
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Generate code review diffs")
    parser.add_argument("--base", default="main", help="Base branch/commit (default: main)")
    parser.add_argument("--head", default="HEAD", help="Head branch/commit (default: HEAD)")
    parser.add_argument("--output", default=None, help="Output directory")
    parser.add_argument("--repo", default=".", help="Repository root (default: cwd)")
    parser.add_argument("--include", default=None, help="Glob to include (e.g. 'src/**')")
    parser.add_argument("--exclude", default=None, help="Glob to exclude (e.g. '*.test.*')")
    args = parser.parse_args()

    repo = os.path.abspath(args.repo)

    # Resolve display names
    base_display = args.base
    head_display = args.head
    if head_display == "HEAD":
        head_display = run_git(["rev-parse", "--abbrev-ref", "HEAD"], repo).strip()

    base_hash = short_hash(args.base, repo)
    head_hash = short_hash(args.head, repo)

    # Output dir
    if args.output:
        output_dir = Path(args.output)
    else:
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "-", head_display).strip("-")
        output_dir = Path(repo) / "docs" / "codereview" / f"{safe_name}-review"

    diffs_dir = output_dir / "diffs"
    diffs_dir.mkdir(parents=True, exist_ok=True)

    # ── Collect data ───────────────────────────────────────────────────────
    stat_raw = run_git(["diff", f"{args.base}...{args.head}", "--stat"], repo)
    numstat = get_numstat(args.base, args.head, repo)

    files_raw = run_git(["diff", f"{args.base}...{args.head}", "--name-only"], repo)
    all_files = [f for f in files_raw.strip().splitlines() if f.strip()]

    # Apply filters
    changed_files = [f for f in all_files if matches_filters(f, args.include, args.exclude)]

    if args.include or args.exclude:
        print(f"Filtered {len(all_files)} → {len(changed_files)} files")

    print(f"Processing {len(changed_files)} files between {base_display} ({base_hash}) and {head_display} ({head_hash})\n")

    # ── Generate per-file diffs ────────────────────────────────────────────
    for filepath in changed_files:
        diff_content = run_git(["diff", f"{args.base}...{args.head}", "--", filepath], repo)
        (diffs_dir / diff_filename(filepath)).write_text(diff_content, encoding="utf-8")
        print(f"  ✓ {diff_filename(filepath)}")

    # ── Build file list sorted by change size ──────────────────────────────
    file_entries: list[tuple[str, int, int, str, str]] = []
    for filepath in changed_files:
        added, removed = numstat.get(filepath, (0, 0))
        cat = categorize(filepath)
        dfn = diff_filename(filepath)
        file_entries.append((filepath, added, removed, cat, dfn))

    # Sort by total change size descending (biggest risk first)
    file_entries.sort(key=lambda e: e[1] + e[2], reverse=True)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # ── summary.md ─────────────────────────────────────────────────────────
    summary = [
        f"# Code Review: `{base_display}` → `{head_display}`\n",
        f"**Base**: `{base_display}` ({base_hash})  ",
        f"**Head**: `{head_display}` ({head_hash})  ",
        f"**Generated**: {now}  ",
        f"**Files**: {len(changed_files)} changed\n",
        "## Diff Stats\n",
        "```",
        stat_raw.strip(),
        "```\n",
        "## All Files (sorted by change size)\n",
        "| # | File | +Added | -Removed | Total | Category | Diff |",
        "|---|------|--------|----------|-------|----------|------|",
    ]
    for i, (fp, a, r, cat, dfn) in enumerate(file_entries, 1):
        summary.append(f"| {i} | `{fp}` | +{a} | -{r} | {a+r} | {cat} | [diff](diffs/{dfn}) |")
    summary.append("")

    (output_dir / "summary.md").write_text("\n".join(summary), encoding="utf-8")
    print(f"\n✓ summary.md")

    # ── review.md ──────────────────────────────────────────────────────────
    template = [
        f"# Code Review: `{base_display}` → `{head_display}`\n",
        f"**Base**: `{base_display}` ({base_hash})  ",
        f"**Head**: `{head_display}` ({head_hash})  ",
        f"**Scope**: {len(changed_files)} files  ",
        f"**Date**: {datetime.now().strftime('%Y-%m-%d')}\n",
        "---\n",
        "## Executive Summary\n",
        "_TODO_\n",
        "---\n",
        "## Issues Found\n",
        "_Use this template for each issue:_\n",
        "```",
        "### ISSUE-N [SEVERITY]: Title",
        "**File**: path/to/file",
        "**Diff**: [file.diff](diffs/file.diff)",
        "**Problem**: What's wrong.",
        "**Root Cause**: Why.",
        "**Fix**: What to do.",
        "```\n",
        "---\n",
        "## Per-File Review\n",
        "_Files sorted by change size (largest first)._\n",
    ]

    # Group by category, but within each category sort by size
    cats: dict[str, list[tuple[str, int, int, str]]] = {}
    for fp, a, r, cat, dfn in file_entries:
        cats.setdefault(cat, []).append((fp, a, r, dfn))

    for cat in sorted(cats.keys()):
        template.append(f"### {cat}\n")
        for fp, a, r, dfn in cats[cat]:
            template.append(f"#### `{fp}` (+{a}/-{r})\n")
            template.append(f"[View diff](diffs/{dfn})\n")
            template.append("| Aspect | Finding | Risk |")
            template.append("|--------|---------|------|")
            template.append("| Correctness | _TODO_ | _TODO_ |")
            template.append("| Error handling | _TODO_ | _TODO_ |")
            template.append("| Edge cases | _TODO_ | _TODO_ |")
            template.append("| API contract | _TODO_ | _TODO_ |\n")

    template.extend([
        "---\n",
        "## Fix Summary\n",
        "| # | Severity | Issue | File | Status |",
        "|---|----------|-------|------|--------|",
        "| 1 | _TODO_ | _TODO_ | _TODO_ | _TODO_ |\n",
    ])

    review_path = output_dir / "review.md"
    if not review_path.exists():
        review_path.write_text("\n".join(template), encoding="utf-8")
        print(f"✓ review.md")
    else:
        (output_dir / "review-template.md").write_text("\n".join(template), encoding="utf-8")
        print(f"✓ review-template.md (review.md exists, not overwritten)")

    print(f"\n{'='*50}")
    print(f"Ready: {output_dir}")
    print(f"  {len(changed_files)} diffs  |  summary.md  |  review.md")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
