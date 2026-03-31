Here's the full review of all **45 upstream commits** from `minghinmatthewlam/pi-gui` (since merge-base `2348a2c`):

---

## Overview

- **108 files changed** across `origin/main..upstream/main`
- **+3,624 / −6,165 lines** (net −2,541 — heavy test refactoring accounts for most deletions)
- **Fork point**: `2348a2c` ("fix: keep extension ui updates out of transcript")
- All commits by **Matthew Lam**, dated **2026-03-27 to 2026-03-30**

---

## Feature Groups (7 groups, 45 commits)

### Group 1: Test Infrastructure Overhaul (10 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 1 | `59cf198` | test: add desktop e2e lane modes | Medium |
| 2 | `fb349b4` | test: migrate remaining desktop surface specs | **High** |
| 3 | `ba0c846` | test: add current-worktree and paste coverage | Medium |
| 4 | `6cdd258` | test: avoid paste filename coupling | Low |
| 5 | `6a918ff` | docs: document e2e lane usage | Low |
| 6 | `afcdea0` | feat(skill): add repo verify workflow | Low |
| 7 | `02049dd` | chore: merge main into fix/tests | Low |
| 8 | `8d407a2` | chore: merge fix/tests into main | Low |
| 9 | `becb813` | test: make status assertions ci-safe | Low |
| 10 | `64f7a8a` | test: make model menu assertion ci-safe | Low |

**Impact**: This is the highest-conflict group. The old test harness (tests/harness.ts) and all old spec files are **deleted and replaced** with:
- New tests/helpers/electron-app.ts (327 lines, complete rewrite)
- New tests/helpers/macos-ui.ts (macOS-specific helpers)
- Tests reorganized into `core/`, `live/`, `native/` lanes
- 8 old spec files removed, 15 new spec files added

**Merge risk**: **HIGH** — Our fork has its own test files (e.g., `changes-panel.spec.ts`, `process-regression.spec.ts`, `smoke.spec.ts`). These are deleted by upstream. We'd need to either port our test logic into the new lane structure or keep our tests separately.

**CI note**: Commit `c88f12a` moves desktop CI verification to **macOS** — this conflicts with our Windows-first approach.

---

### Group 2: New Thread Model/Thinking Selector (8 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 11 | `a5f0ee4` | refactor: decouple ModelSelector from SessionRecord | Medium |
| 12 | `7e33ce5` | feat: add model/thinking fields to StartThreadInput | Low |
| 13 | `571ba7a` | feat: apply model/thinking overrides in startThread handler | Medium |
| 14 | `1374be9` | feat: add model/thinking selector to new thread page | Medium |
| 15 | `9c1747f` | fix: eagerly sync session config after model/thinking changes | Low |
| 16 | `ef79f88` | fix: prevent starting a thread without a prompt | Low |
| 17 | `6d57821` | feat: filter buildModelOptions by enabled patterns + availability | Low |
| 18 | `afbdd10` | fix: guard stale default model in new thread fallback | Low |

**Impact**: Adds the ability to select model and thinking budget on the **new thread page** before starting a conversation. Key files touched:
- src/desktop-state.ts — new `StartThreadInput.model` and `.thinking` fields
- src/new-thread-view.tsx — model/thinking selector UI
- src/model-selector.tsx — decoupled from `SessionRecord`
- src/composer-commands.ts — `buildModelOptions` filtering
- electron/app-store-worktree.ts — applies overrides
- electron/app-store-composer.ts — eager config sync

**Merge risk**: **MEDIUM** — Our fork modified `composer-commands.ts` and `App.tsx` significantly. The `ModelSelector` decoupling changes interface signatures that our code might depend on. Needs careful review of `model-selector.tsx` props.

---

### Group 3: Workspace Drag-and-Drop Reordering (10 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 19 | `a867346` | feat: add @dnd-kit dependency for workspace reordering | Low |
| 20 | `e835894` | feat: add workspace reorder persistence and IPC | Medium |
| 21 | `d8c6f7c` | feat: add drag-and-drop workspace reordering UI | **High** |
| 22 | `00b6c66` | refactor: simplify workspace reorder code per review | Low |
| 23 | `3e1827e` | fix: optimistic reorder to prevent snap-back animation | Low |
| 24 | `4c38e3a` | fix: overlay grip handle on hover, remove workspace time | Low |
| 25 | `38ec726` | fix: remove grip icon, use grab cursor on workspace row | Low |
| 26 | `2b02167` | fix: restore original workspace-row grid columns | Low |
| 27 | `8527f5b` | fix: use closestCenter collision for easier workspace reorder | Low |
| 28 | `0d07fa2` | fix: collision detection based on workspace header, not full group | Low |

**Impact**: Complete sidebar workspace reordering with `@dnd-kit`. **568 lines changed in sidebar.tsx alone** (+426/−193). Key additions:
- New dependency: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- electron/app-store-persistence.ts — persists workspace order
- electron/app-store.ts — `reorderWorkspaces` IPC
- src/sidebar.tsx — massive rewrite with `SortableContext`, `DndContext`
- src/thread-groups.ts — `applyCustomOrder()` utility

**Merge risk**: **HIGH** — src/sidebar.tsx is heavily modified in both forks. Our sidebar has collapse/expand and Windows-specific styling. The `d8c6f7c` commit essentially rewrites the sidebar component. This will require manual resolution.

---

### Group 4: Sidebar Workspace Collapse/Expand + Polish (4 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 29 | `749fa46` | feat: add collapse/expand toggle to sidebar workspaces | Medium |
| 30 | `54d3739` | fix: expand workspace on new thread, don't re-select on toggle | Low |
| 31 | `a99cba5` | fix: align session time and archive icon on same vertical | Low |
| 32 | `6156685` | fix: align session archive icon with time text | Low |

**Impact**: Adds workspace collapse/expand with chevron toggle, plus sidebar alignment fixes. Files:
- src/sidebar.tsx — collapse state management
- src/hooks/use-workspace-menu.tsx — menu items for expand/collapse
- src/styles/sidebar.css — alignment fixes

**Merge risk**: **MEDIUM** — Our fork already has sidebar collapse behavior. Need to check if implementations conflict or are compatible.

---

### Group 5: Settings UI Restyle to Codex Row Layout (5 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 33 | `0bc34f3` | feat: unify settings model sections | Medium |
| 34 | `b8c681e` | refactor: add settings row layout components and CSS | Medium |
| 35 | `b9d4ee6` | feat: restyle all settings tabs to Codex row layout | **High** |
| 36 | `fc94f0d` | chore: remove old SettingsCard CSS and unused settings-stack | Low |
| 37 | `037be22` | fix: settings layout fixes | Low |

**Impact**: Complete settings UI restyle. Replaces card-based layout with Codex-style row layout across all settings sections:
- src/settings-utils.tsx — new `SettingsRow`, `SettingsGroup` components
- src/settings-models-section.tsx — major rework (−252/+169)
- src/settings-appearance-section.tsx — restyled
- src/settings-general-section.tsx — restyled
- src/settings-notifications-section.tsx — restyled
- src/settings-providers-section.tsx — restyled
- src/styles/main.css — new row layout CSS, old SettingsCard CSS removed

**Merge risk**: **HIGH** — Our fork added settings sections (prompt templates, appearance options). The upstream restyle touches every settings section. Our layout additions would need to be re-done in the new row layout style.

---

### Group 6: Extension System Fixes (2 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 38 | `8da2f3c` | fix: degrade unsupported custom ui and follow new sessions | Medium |
| 39 | `1ec731c` | test: cover extension fallback and child sessions | Low |

**Impact**: Bug fixes for the extension system that was already in the shared base:
- electron/app-store.ts — graceful degradation for unsupported custom UI types, follow new child sessions
- session-supervisor.ts — supervisor follows new sessions

**Merge risk**: **LOW-MEDIUM** — Extension system code exists in both forks. Changes are small and focused on bug fixes.

---

### Group 7: Misc Improvements (6 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 40 | `6ef4d55` | refactor: dedupe current-worktree targeting | Low |
| 41 | `ecafc5c` | refactor: simplify model selection code | Low |
| 42 | `488bd90` | fix: use relative dates in sidebar instead of absolute | Low |
| 43 | `a66c80d` | fix: remove redundant pill row from default model section | Low |
| 44 | `c88f12a` | ci: move desktop verification to macos | Medium |
| 45 | `e8dbdda` | Merge pull request #5 (merge commit) | Low |

**Merge risk**: **LOW** — Mostly independent cleanups except `c88f12a` which conflicts with our Windows CI.

---

## Conflict Summary

| Conflict Level | Files | Description |
|---|---|---|
| **CRITICAL** | src/sidebar.tsx | Both forks heavily modified. Upstream rewrites 568 lines for DnD. |
| **HIGH** | src/styles/main.css, src/styles/sidebar.css | Complete CSS rework both sides |
| **HIGH** | src/App.tsx | Both forks added significant state management |
| **HIGH** | src/settings-models-section.tsx | Upstream completely restyles |
| **HIGH** | tests/ (entire directory) | Upstream deleted all old tests, restructured into lanes |
| **MEDIUM** | electron/app-store.ts, electron/main.ts | Both added IPC handlers (additive, but large) |
| **MEDIUM** | src/composer-commands.ts, src/model-selector.tsx | Model selector interface changes |
| **MEDIUM** | ci.yml | Upstream moves to macOS; we need Windows |
| **LOW** | package.json, pnpm-lock.yaml | Dependency diffs (normal) |

## Files Upstream **Deletes** That We May Still Need

| File | Our Usage |
|---|---|
| tests/harness.ts | Our tests depend on this — must port to new helpers |
| tests/smoke.spec.ts | Replaced by `core/smoke.spec.ts` |
| tests/changes-panel.spec.ts | Our test — no upstream equivalent |
| tests/process-regression.spec.ts | Our test — no upstream equivalent |
| src/assets/pi-icon.png, pi-icon.svg | Used in our Windows titlebar |
| build/icon.ico, icon.png | Windows app icon |
| @mariozechner__pi-ai@0.63.1.patch | May still need these patches |

## Recommendations

1. **Don't blind-merge** — the sidebar and settings rewrites require manual integration
2. **Cherry-pick by group**, prioritizing:
   - **Group 2** (model selector) — highest value, medium conflict
   - **Group 6** (extension fixes) — important bug fixes, low conflict
   - **Group 7** (misc) — easy wins
3. **Defer or carefully integrate**:
   - **Group 3** (DnD reorder) — nice feature but high conflict with sidebar
   - **Group 5** (settings restyle) — requires re-implementing our settings additions
4. **Adapt Group 1** (test infra) — port our tests into the new lane structure but keep Windows CI
5. **Keep our icons and patches** — upstream deletes Windows-specific assets we still need 

Completed: *Produce comprehensive review document* (3/3)

