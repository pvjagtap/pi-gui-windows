#!/usr/bin/env python3
"""
Code Review Diff Generator

Generates per-file diffs and a summary document for a git branch comparison.
Works with any git repository regardless of language or framework.

Usage:
    python .agents/skills/codereview-diff/codereview-diff.py [--base main] [--head HEAD] [--output docs/codereview/<name>]

This creates:
    <output>/
    ├── summary.md        — diff stats, categorized file table with links
    ├── review.md         — review template with per-file sections
    └── diffs/            — one .diff file per changed file
"""

import argparse
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def categorize(path: str) -> str:
    """Categorize a file by its top-level directory."""
    parts = Path(path).parts
    if len(parts) <= 1:
        return "root"
    return "/".join(parts[:2]) if len(parts) > 2 else parts[0]


def run_git(args: list[str], cwd: str) -> str:
    result = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
        cwd=cwd,
        timeout=60,
    )
    if result.returncode != 0:
        print(f"git {' '.join(args)} failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def diff_filename(path: str) -> str:
    """Convert file path to a safe diff filename: a/b/c.ts → a--b--c.ts.diff"""
    return path.replace("/", "--") + ".diff"


def get_numstat(base: str, head: str, cwd: str) -> dict[str, tuple[int, int]]:
    """Get precise +/- counts per file via --numstat."""
    raw = run_git(["diff", f"{base}...{head}", "--numstat"], cwd)
    result = {}
    for line in raw.strip().splitlines():
        parts = line.split("\t")
        if len(parts) == 3:
            added, removed, path = parts
            try:
                result[path] = (int(added), int(removed))
            except ValueError:
                result[path] = (0, 0)  # binary files
    return result


def main():
    parser = argparse.ArgumentParser(description="Generate code review diffs")
    parser.add_argument("--base", default="main", help="Base branch/commit (default: main)")
    parser.add_argument("--head", default="HEAD", help="Head branch/commit (default: HEAD)")
    parser.add_argument("--output", default=None, help="Output directory (default: auto-generated under docs/codereview/)")
    parser.add_argument("--repo", default=".", help="Repository root (default: cwd)")
    args = parser.parse_args()

    repo = os.path.abspath(args.repo)

    # Resolve branch names for display
    base_display = args.base
    head_display = args.head
    if head_display == "HEAD":
        head_display = run_git(["rev-parse", "--abbrev-ref", "HEAD"], repo).strip()

    # Auto-generate output dir name from head branch
    if args.output:
        output_dir = Path(args.output)
    else:
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "-", head_display).strip("-")
        output_dir = Path(repo) / "docs" / "codereview" / f"{safe_name}-review"

    diffs_dir = output_dir / "diffs"
    diffs_dir.mkdir(parents=True, exist_ok=True)

    # ── Get diff stat ──────────────────────────────────────────────────────
    stat_raw = run_git(["diff", f"{args.base}...{args.head}", "--stat"], repo)
    numstat = get_numstat(args.base, args.head, repo)

    # Get list of changed files
    files_raw = run_git(
        ["diff", f"{args.base}...{args.head}", "--name-only"], repo
    )
    changed_files = [f for f in files_raw.strip().splitlines() if f.strip()]

    print(f"Found {len(changed_files)} changed files between {base_display} and {head_display}")

    # ── Generate per-file diffs ────────────────────────────────────────────
    for filepath in changed_files:
        diff_content = run_git(
            ["diff", f"{args.base}...{args.head}", "--", filepath], repo
        )
        diff_file = diffs_dir / diff_filename(filepath)
        diff_file.write_text(diff_content, encoding="utf-8")
        print(f"  ✓ {diff_file.name}")

    # ── Build summary.md ───────────────────────────────────────────────────
    categorized: dict[str, list[tuple[str, int, int, str]]] = {}
    for filepath in changed_files:
        cat = categorize(filepath)
        added, removed = numstat.get(filepath, (0, 0))
        dfn = diff_filename(filepath)
        categorized.setdefault(cat, []).append((filepath, added, removed, dfn))

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    summary_lines = [
        f"# Code Review: `{base_display}` → `{head_display}`\n",
        f"Generated: {now}\n",
        "## Diff Stats\n",
        "```",
        stat_raw.strip(),
        "```\n",
        "## Files by Category\n",
    ]

    for cat in sorted(categorized.keys()):
        files = categorized[cat]
        summary_lines.append(f"### {cat}\n")
        summary_lines.append("| Status | File | +/- | Diff |")
        summary_lines.append("|--------|------|-----|------|")
        for filepath, added, removed, dfn in sorted(files):
            status = "Added" if removed == 0 and added > 0 else "Modified"
            summary_lines.append(
                f"| {status} | `{filepath}` | +{added}/-{removed} "
                f"| [diffs\\{dfn}](diffs/{dfn}) |"
            )
        summary_lines.append("")

    (output_dir / "summary.md").write_text("\n".join(summary_lines), encoding="utf-8")
    print(f"\n✓ summary.md written")

    # ── Build review-template.md ───────────────────────────────────────────
    template_lines = [
        f"# Code Review: `{base_display}` → `{head_display}`\n",
        f"**Branch**: `{head_display}`  ",
        f"**Base**: `{base_display}`  ",
        f"**Scope**: {len(changed_files)} files changed  ",
        f"**Date**: {datetime.now().strftime('%Y-%m-%d')}  \n",
        "---\n",
        "## Executive Summary\n",
        "_TODO: High-level summary of the merge and its risks._\n",
        "---\n",
        "## Review Focus Areas\n",
        "- [ ] Correctness — logic errors, off-by-one, wrong conditions",
        "- [ ] Concurrency / race conditions",
        "- [ ] Error handling and edge cases",
        "- [ ] Resource management (memory, handles, connections, processes)",
        "- [ ] Security (injection, auth, input validation, SSRF)",
        "- [ ] Performance and scalability",
        "- [ ] API contract / backward compatibility\n",
        "---\n",
        "## Issues Found\n",
        "_Document each issue with the template below:_\n",
        "### ISSUE-N [SEVERITY]: Title\n",
        "**File**: `path/to/file`  ",
        "**Diff**: [file.diff](diffs/file.diff)\n",
        "**Problem**: _Description._\n",
        "**Root Cause**: _Why this happens._\n",
        "**Fix**: _What was done or needs to be done._\n",
        "```",
        "// Before / After code snippets",
        "```\n",
        "---\n",
        "## Per-File Review\n",
    ]

    for cat in sorted(categorized.keys()):
        files = categorized[cat]
        template_lines.append(f"### Category: {cat}\n")
        for filepath, added, removed, dfn in sorted(files):
            template_lines.append(f"#### `{filepath}` (+{added}/-{removed})\n")
            template_lines.append(f"**Diff**: [diffs/{dfn}](diffs/{dfn})\n")
            template_lines.append("| Change | Risk | Status |")
            template_lines.append("|--------|------|--------|")
            template_lines.append("| _TODO_ | _TODO_ | _TODO_ |\n")
            template_lines.append("")

    template_lines.extend([
        "---\n",
        "## Summary of Fixes\n",
        "| # | Severity | Issue | File | Fix |",
        "|---|----------|-------|------|-----|",
        "| 1 | _TODO_ | _TODO_ | _TODO_ | _TODO_ |\n",
    ])

    # Only write template if review.md doesn't already exist (don't overwrite actual review)
    review_path = output_dir / "review.md"
    template_path = output_dir / "review-template.md"
    if not review_path.exists():
        review_path.write_text("\n".join(template_lines), encoding="utf-8")
        print(f"✓ review.md template written")
    else:
        template_path.write_text("\n".join(template_lines), encoding="utf-8")
        print(f"✓ review-template.md written (review.md already exists, not overwriting)")

    print(f"\n{'='*60}")
    print(f"Code review scaffold ready at: {output_dir}")
    print(f"  {len(changed_files)} diff files in diffs/")
    print(f"  summary.md — file index with categories")
    print(f"  review.md  — review document" if not template_path.exists() else f"  review-template.md — blank template")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
