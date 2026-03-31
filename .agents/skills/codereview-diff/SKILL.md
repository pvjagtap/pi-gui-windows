---
name: codereview-diff
description: Generate per-file git diffs and a structured review scaffold for any branch comparison. Use when asked to code review, diff review, or compare branches.
---

# Code Review Diff

Systematic branch code review. Generates per-file diffs, then reviews them with escalating scope.

## Workflow

### 1. Generate diffs

```bash
python .agents/skills/codereview-diff/codereview-diff.py --base main --head HEAD
```

| Flag | Default | Description |
|------|---------|-------------|
| `--base` | `main` | Base branch/commit |
| `--head` | `HEAD` | Head branch/commit |
| `--output` | auto | Output dir (default: `docs/codereview/<branch>-review/`) |
| `--repo` | `.` | Repo root |
| `--include` | all | Glob pattern to include (e.g. `src/**`) |
| `--exclude` | none | Glob pattern to exclude (e.g. `*.test.*`) |

Creates:
```
<output>/
├── summary.md     — stats, file table with links, sorted by change size
├── review.md      — review template (skipped if exists)
└── diffs/         — one .diff per changed file
```

### 2. Review the diffs

Read `summary.md` to get the file list sorted by risk (largest changes first). For each file:

1. Read the `.diff` file from `diffs/`
2. Apply the standard checklist: correctness, error handling, edge cases, API compatibility, naming
3. Log issues in `review.md` using the issue template
4. Fill in the per-file risk table

**Standard checklist** (always check):
- Correctness — logic errors, wrong conditions, off-by-one
- Error handling — caught, propagated, or silently swallowed?
- Edge cases — null, empty, boundary values, concurrent access
- API contract — signature/return type changes, backward compatibility
- Naming — clear, consistent with codebase

**Issue severity**:
| Level | Meaning |
|-------|---------|
| CRITICAL | Data loss, crashes, security holes, resource leaks |
| HIGH | Bugs under normal usage |
| MEDIUM | Edge-case issues or maintainability risk |
| LOW | Style, naming, minor improvement |

**Issue template**:
```
### ISSUE-N [SEVERITY]: Title
**File**: `path/to/file`
**Diff**: [file.diff](diffs/file.diff)
**Problem**: What's wrong.
**Root Cause**: Why.
**Fix**: What to do.
```

### 3. Expand scope (on request only)

After the standard review, ask the user:
> "Standard review complete — N issues found. Want me to expand into any area?"

Expanded areas (see [references/review-methodology.md](references/review-methodology.md) for details):
- **Concurrency** — races, missing guards, fire-and-forget
- **Resource lifecycle** — leaks, unclosed handles, process accumulation
- **Event cascades** — handler → emit → handler loops, async replay
- **Security** — injection, auth, SSRF, path traversal
- **Performance** — O(N²), unbounded growth, hot-path I/O
- **Cross-file tracing** — caller chains, event flows, circular deps
