# Upstream 45-Commit Review — `minghinmatthewlam/pi-gui` → `pvjagtap/pi-desktop`

**Date**: 2026-03-30  
**Fork point**: `2348a2c` ("fix: keep extension ui updates out of transcript")  
**Upstream remote**: `https://github.com/minghinmatthewlam/pi-gui.git`  
**Commit range**: `origin/main..upstream/main` (45 commits)

---

## Overview

| Metric | Value |
|--------|-------|
| Total commits | 45 |
| Files changed | 108 |
| Lines added | +3,624 |
| Lines removed | −6,165 |
| Net change | −2,541 (heavy test refactoring accounts for most deletions) |
| Author | Matthew Lam |
| Date range | 2026-03-27 to 2026-03-30 |

---

## Feature Groups

### Group 1: Test Infrastructure Overhaul (10 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 1 | `59cf198` | test: add desktop e2e lane modes | Medium |
| 2 | `fb349b4` | test: migrate remaining desktop surface specs | **High** |
| 3 | `ba0c846` | test(desktop): add current-worktree and paste coverage | Medium |
| 4 | `6cdd258` | test(desktop): avoid paste filename coupling | Low |
| 5 | `6a918ff` | docs(desktop): document e2e lane usage | Low |
| 6 | `afcdea0` | feat(skill): add repo verify workflow | Low |
| 7 | `02049dd` | chore: merge main into fix/tests | Low |
| 8 | `8d407a2` | chore: merge fix/tests into main | Low |
| 9 | `becb813` | test: make status assertions ci-safe | Low |
| 10 | `64f7a8a` | test: make model menu assertion ci-safe | Low |

**What changed:**

- Old test harness (`tests/harness.ts`) and all old spec files are **deleted and replaced**
- New `tests/helpers/electron-app.ts` (327 lines, complete rewrite)
- New `tests/helpers/macos-ui.ts` (macOS-specific helpers)
- Tests reorganized into `core/`, `live/`, `native/` lanes
- 8 old spec files removed, 15 new spec files added

**Key files:**

| File | Change |
|------|--------|
| `apps/desktop/tests/helpers/electron-app.ts` | +327 (new shared test harness) |
| `apps/desktop/tests/helpers/macos-ui.ts` | +66 (new macOS helpers) |
| `apps/desktop/tests/core/smoke.spec.ts` | +32 (replaces old smoke.spec.ts) |
| `apps/desktop/tests/core/archive.spec.ts` | renamed from archive-live.spec.ts |
| `apps/desktop/tests/core/composer-controls.spec.ts` | +96 (new) |
| `apps/desktop/tests/core/mentions-diff.spec.ts` | +100 (new) |
| `apps/desktop/tests/core/navigation.spec.ts` | +104 (new) |
| `apps/desktop/tests/core/persistence.spec.ts` | +129 (new) |
| `apps/desktop/tests/core/skills-settings.spec.ts` | renamed from skills-settings-live.spec.ts |
| `apps/desktop/tests/core/workspace-menu.spec.ts` | renamed |
| `apps/desktop/tests/core/worktrees.spec.ts` | renamed |
| `apps/desktop/tests/live/notifications.spec.ts` | +64 (replaces notifications-live.spec.ts) |
| `apps/desktop/tests/live/parallel-runs.spec.ts` | +134 (replaces parallel-live.spec.ts) |
| `apps/desktop/tests/live/submit-run.spec.ts` | +31 (new) |
| `apps/desktop/tests/live/tool-calls.spec.ts` | +46 (new) |
| `apps/desktop/tests/native/attach-image.spec.ts` | +41 (new) |
| `apps/desktop/tests/native/open-folder.spec.ts` | +32 (new) |
| `apps/desktop/tests/native/paste.spec.ts` | +40 (new) |
| `apps/desktop/tests/AGENTS.md` | +16 (lane documentation) |

**Deleted files:**

| File | Lines removed |
|------|---------------|
| `tests/harness.ts` | −225 |
| `tests/smoke.spec.ts` | −140 |
| `tests/codex-parity-features.spec.ts` | −225 |
| `tests/controls-live.spec.ts` | −161 |
| `tests/notifications-live.spec.ts` | −81 |
| `tests/parallel-live.spec.ts` | −194 |
| `tests/persistence-live.spec.ts` | −93 |
| `tests/changes-panel.spec.ts` | −222 |
| `tests/process-regression.spec.ts` | −238 |
| `tests/extensions-live.spec.ts` | −129 |
| `tests/extensions-session-isolation-live.spec.ts` | −78 |

**Merge risk: HIGH**

- Our fork has its own test files (`changes-panel.spec.ts`, `process-regression.spec.ts`, `smoke.spec.ts`) that are deleted by upstream
- Must port our test logic into the new lane structure or keep our tests separately
- CI commit `c88f12a` moves desktop verification to **macOS** — conflicts with our Windows-first approach

---

### Group 2: New Thread Model/Thinking Selector (8 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 11 | `a5f0ee4` | refactor(desktop): decouple ModelSelector from SessionRecord | Medium |
| 12 | `7e33ce5` | feat(desktop): add model/thinking fields to StartThreadInput | Low |
| 13 | `571ba7a` | feat(desktop): apply model/thinking overrides in startThread handler | Medium |
| 14 | `1374be9` | feat(desktop): add model/thinking selector to new thread page | Medium |
| 15 | `9c1747f` | fix(desktop): eagerly sync session config after model/thinking changes | Low |
| 16 | `ef79f88` | fix(desktop): prevent starting a thread without a prompt | Low |
| 17 | `6d57821` | feat(desktop): filter buildModelOptions by enabled patterns + availability | Low |
| 18 | `afbdd10` | fix(desktop): guard stale default model in new thread fallback | Low |

**What changed:**

Adds the ability to select model and thinking budget on the **new thread page** before starting a conversation.

**Key files:**

| File | Change |
|------|--------|
| `src/desktop-state.ts` | +9 — new `StartThreadInput.model` and `.thinking` fields |
| `src/new-thread-view.tsx` | ~55 lines — model/thinking selector UI |
| `src/model-selector.tsx` | ~41 lines — decoupled from `SessionRecord`, now accepts props |
| `src/composer-commands.ts` | +12 — `buildModelOptions` filtering by enabled patterns |
| `src/App.tsx` | ~37 lines — wiring model/thinking state |
| `electron/app-store-worktree.ts` | +20 — applies model/thinking overrides in startThread |
| `electron/app-store-composer.ts` | +11 — eager config sync after changes |
| `src/composer-panel.tsx` | +6 — updated ModelSelector usage |

**Merge risk: MEDIUM**

- Our fork modified `composer-commands.ts` and `App.tsx` significantly
- The `ModelSelector` decoupling changes interface signatures (no longer takes `SessionRecord`, takes individual props instead)
- Need to adapt our `ModelSelector` usage to match new props interface

---

### Group 3: Workspace Drag-and-Drop Reordering (10 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 19 | `a867346` | feat(desktop): add @dnd-kit dependency for workspace reordering | Low |
| 20 | `e835894` | feat(desktop): add workspace reorder persistence and IPC | Medium |
| 21 | `d8c6f7c` | feat(desktop): add drag-and-drop workspace reordering UI | **High** |
| 22 | `00b6c66` | refactor(desktop): simplify workspace reorder code per review | Low |
| 23 | `3e1827e` | fix(desktop): optimistic reorder to prevent snap-back animation | Low |
| 24 | `4c38e3a` | fix(desktop): overlay grip handle on hover, remove workspace time | Low |
| 25 | `38ec726` | fix(desktop): remove grip icon, use grab cursor on workspace row | Low |
| 26 | `2b02167` | fix(desktop): restore original workspace-row grid columns | Low |
| 27 | `8527f5b` | fix(desktop): use closestCenter collision for easier workspace reorder | Low |
| 28 | `0d07fa2` | fix(desktop): collision detection based on workspace header, not full group | Low |

**What changed:**

Complete sidebar workspace reordering with `@dnd-kit`. **568 lines changed in sidebar.tsx alone** (+426/−193).

**Key files:**

| File | Change |
|------|--------|
| `package.json` | +3 — `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| `pnpm-lock.yaml` | +98 — dependency resolution |
| `src/sidebar.tsx` | +426/−193 — massive rewrite with `SortableContext`, `DndContext` |
| `src/styles/sidebar.css` | +38 — drag handle and sortable styles |
| `src/thread-groups.ts` | +13 — `applyCustomOrder()` utility |
| `src/icons.tsx` | +13 — grip handle icon |
| `electron/app-store-persistence.ts` | +2 — persists workspace order |
| `electron/app-store.ts` | +17 — `reorderWorkspaces` IPC handler |
| `electron/main.ts` | +1 — IPC registration |
| `electron/preload.ts` | +2 — preload bridge |
| `src/App.tsx` | +21 — reorder state wiring |
| `src/desktop-state.ts` | +2 — reorder state types |
| `src/ipc.ts` | +2 — IPC type |

**Merge risk: HIGH**

- `src/sidebar.tsx` is heavily modified in both forks
- Our sidebar has collapse/expand and Windows-specific styling
- The `d8c6f7c` commit essentially rewrites the sidebar component
- Will require manual three-way merge resolution

---

### Group 4: Sidebar Workspace Collapse/Expand + Polish (4 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 29 | `749fa46` | feat(desktop): add collapse/expand toggle to sidebar workspaces | Medium |
| 30 | `54d3739` | fix(desktop): expand workspace on new thread, don't re-select on toggle | Low |
| 31 | `a99cba5` | fix(desktop): align session time and archive icon on same vertical | Low |
| 32 | `6156685` | fix(desktop): align session archive icon with time text | Low |

**What changed:**

Adds workspace collapse/expand with chevron toggle, plus sidebar alignment fixes.

**Key files:**

| File | Change |
|------|--------|
| `src/sidebar.tsx` | +131/−61 — collapse state management, chevron toggle |
| `src/hooks/use-workspace-menu.tsx` | +9 — expand/collapse all menu items |
| `src/styles/sidebar.css` | +29 — chevron and alignment styles |
| `src/App.tsx` | +1 — collapse state initialization |

**Merge risk: MEDIUM**

- Our fork already has sidebar collapse behavior — need to check if implementations conflict or are compatible
- May be able to take upstream's implementation directly if ours is less complete

---

### Group 5: Settings UI Restyle to Codex Row Layout (5 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 33 | `0bc34f3` | feat(desktop): unify settings model sections | Medium |
| 34 | `b8c681e` | refactor(desktop): add settings row layout components and CSS | Medium |
| 35 | `b9d4ee6` | feat(desktop): restyle all settings tabs to Codex row layout | **High** |
| 36 | `fc94f0d` | chore(desktop): remove old SettingsCard CSS and unused settings-stack | Low |
| 37 | `037be22` | fix(desktop): settings layout fixes | Low |

**What changed:**

Complete settings UI restyle. Replaces card-based layout with Codex-style row layout across **all** settings sections.

**Key files:**

| File | Change |
|------|--------|
| `src/settings-utils.tsx` | +77/−34 — new `SettingsRow`, `SettingsGroup` components |
| `src/settings-models-section.tsx` | +199/−252 — major rework |
| `src/settings-appearance-section.tsx` | +34 lines changed — restyled |
| `src/settings-general-section.tsx` | +67/−71 — restyled |
| `src/settings-notifications-section.tsx` | +58 lines changed — restyled |
| `src/settings-providers-section.tsx` | +63 lines changed — restyled |
| `src/settings-view.tsx` | −1 — minor |
| `src/styles/main.css` | +86/−63 — new row layout CSS, old SettingsCard CSS removed |

**Merge risk: HIGH**

- Our fork added settings sections (prompt templates, appearance options)
- The upstream restyle touches every settings section
- Our layout additions would need to be re-implemented using the new `SettingsRow`/`SettingsGroup` components

---

### Group 6: Extension System Fixes (2 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 38 | `8da2f3c` | fix(desktop): degrade unsupported custom ui and follow new sessions | Medium |
| 39 | `1ec731c` | test(desktop): cover extension fallback and child sessions | Low |

**What changed:**

Bug fixes for the extension system (already in the shared base).

**Key files:**

| File | Change |
|------|--------|
| `electron/app-store.ts` | +34/−7 — graceful degradation for unsupported custom UI types |
| `packages/pi-sdk-driver/src/session-supervisor.ts` | +5 — supervisor follows new child sessions |
| `tests/live/extensions.spec.ts` | +115/−8 — fallback and child session test coverage |
| `tests/helpers/electron-app.ts` | +2/−1 — helper update |

**Merge risk: LOW-MEDIUM**

- Extension system code exists in both forks from the shared base
- Changes are small and focused on bug fixes
- Cherry-pick friendly

---

### Group 7: Miscellaneous Improvements (6 commits)

| # | Hash | Message | Risk |
|---|------|---------|------|
| 40 | `6ef4d55` | refactor(desktop): dedupe current-worktree targeting | Low |
| 41 | `ecafc5c` | refactor(desktop): simplify model selection code | Low |
| 42 | `488bd90` | fix(desktop): use relative dates in sidebar instead of absolute | Low |
| 43 | `a66c80d` | fix(desktop): remove redundant pill row from default model section | Low |
| 44 | `c88f12a` | ci: move desktop verification to macos | Medium |
| 45 | `e8dbdda` | Merge pull request #5 (merge commit, no diff) | Low |

**Key files:**

| File | Change |
|------|--------|
| `src/App.tsx` | +24/−20 — deduplicated worktree targeting |
| `src/composer-commands.ts` | +5/−2 — simplified |
| `src/model-selector.tsx` | +18/−11 — simplified |
| `src/settings-models-section.tsx` | −15 — redundant pill row removed |
| `src/string-utils.ts` | +6/−1 — relative date formatting |
| `.github/workflows/ci.yml` | +22/−3 — macOS CI |
| `apps/desktop/AGENTS.md` | +1 |
| `apps/desktop/README.md` | +8 |
| `apps/desktop/package.json` | +1 |

**Merge risk: LOW** (except `c88f12a` which conflicts with our Windows CI)

---

## Conflict Analysis

### Critical Conflicts (must resolve manually)

| File | Lines Changed | Issue |
|------|---------------|-------|
| `src/sidebar.tsx` | +652/−652 | Both forks heavily modified. Upstream rewrites 568 lines for DnD + collapse. |
| `src/styles/main.css` | +423/−423 | Complete CSS rework on both sides |
| `src/styles/sidebar.css` | +263/−263 | Both forks added sidebar styles |
| `src/App.tsx` | +333/−333 | Both forks added significant state management |
| `src/settings-models-section.tsx` | +305/−305 | Upstream completely restyles to row layout |
| `tests/` (entire directory) | ~2000 lines | Upstream deleted all old tests, restructured into lanes |

### Additive Conflicts (both sides added, take both)

| File | Our Additions | Upstream Additions |
|------|---------------|-------------------|
| `electron/app-store.ts` | prompt templates, token usage, Windows userData fix | extension management, workspace reorder, custom UI degradation |
| `electron/main.ts` | Windows titlebar, security handlers, zoom, prompt template IPC | extension IPC, workspace reorder IPC |
| `electron/preload.ts` | Windows-specific preload additions | extension + reorder preload bridges |
| `electron/session-state-map.ts` | `tokenUsageBySession` | `extensionUiBySession` |
| `src/ipc.ts` | Our IPC types | Extension + reorder IPC types |
| `src/desktop-state.ts` | Token usage, prompt template types | Model/thinking, reorder, extension types |

### Files Upstream Deletes That We May Still Need

| File | Our Usage | Action Needed |
|------|-----------|---------------|
| `tests/harness.ts` | Our tests depend on this | Port to new `helpers/electron-app.ts` |
| `tests/smoke.spec.ts` | Our smoke tests | Port to `core/smoke.spec.ts` |
| `tests/changes-panel.spec.ts` | Our test, no upstream equivalent | Keep or port to `core/` |
| `tests/process-regression.spec.ts` | Our test, no upstream equivalent | Keep or port to `core/` |
| `src/assets/pi-icon.png` | Used in our Windows titlebar | Keep — Windows-specific |
| `src/assets/pi-icon.svg` | Used in our Windows titlebar | Keep — Windows-specific |
| `build/icon.ico` | Windows app icon | Keep — Windows-specific |
| `build/icon.png` | Windows app icon | Keep — Windows-specific |
| `patches/@mariozechner__pi-ai@0.63.1.patch` | May still need | Check if superseded |
| `patches/@mariozechner__pi-ai@0.64.0.patch` | May still need | Check if superseded |

### Upstream Removes From Our Fork

| File/Section | What's Removed |
|--------------|----------------|
| `.gitignore` | −3 lines (upstream trims) |
| `apps/desktop/.gitignore` | −2 lines |
| `CHANGELOG.md` | −48 lines (upstream has no Windows changelog) |
| `apps/desktop/index.html` | −4 lines |
| `src/main.tsx` | −5 lines |
| `src/hooks/use-slash-menu.tsx` | −12 lines |

---

## New Dependencies Added by Upstream

| Package | Version | Purpose |
|---------|---------|---------|
| `@dnd-kit/core` | latest | Drag-and-drop primitives |
| `@dnd-kit/sortable` | latest | Sortable list utilities |
| `@dnd-kit/utilities` | latest | DnD CSS utilities |

---

## Recommendations

### Priority 1: Cherry-pick first (low conflict, high value)

| Group | Commits | Rationale |
|-------|---------|-----------|
| Group 6: Extension Fixes | `8da2f3c`, `1ec731c` | Important bug fixes, small diff, cherry-pick friendly |
| Group 7: Misc (selective) | `488bd90`, `6ef4d55` | Relative dates + worktree dedup, clean picks |
| Group 2: Model Selector | `a5f0ee4`..`afbdd10` | Highest product value, medium conflict |

### Priority 2: Integrate carefully

| Group | Approach |
|-------|----------|
| Group 1: Test Infra | Port our 2 unique tests (`changes-panel`, `process-regression`) into new lane structure; keep Windows CI |
| Group 4: Sidebar Collapse | Compare with our implementation — take upstream's if more complete, otherwise reconcile |

### Priority 3: Defer or plan dedicated merge session

| Group | Reason |
|-------|--------|
| Group 3: DnD Reorder | Nice feature but 568-line sidebar rewrite requires careful manual merge |
| Group 5: Settings Restyle | Requires re-implementing all our settings additions in new row layout |

### CI Strategy

- Upstream commit `c88f12a` moves CI to macOS — we need to **keep Windows CI** and potentially add macOS as well
- Don't take this commit as-is; adapt our CI workflow to support both platforms

### Icon/Asset Strategy

- Upstream deletes `build/icon.ico`, `build/icon.png`, `src/assets/pi-icon.png`, `src/assets/pi-icon.svg`
- We **must keep these** for Windows packaging
- Add them back or exclude from merge

---

## Full Commit List (chronological from fork point)

| # | Hash | Date | Message |
|---|------|------|---------|
| 1 | `59cf198` | 2026-03-27 | test: add desktop e2e lane modes |
| 2 | `fb349b4` | 2026-03-27 | test: migrate remaining desktop surface specs |
| 3 | `ba0c846` | 2026-03-27 | test(desktop): add current-worktree and paste coverage |
| 4 | `6ef4d55` | 2026-03-27 | refactor(desktop): dedupe current-worktree targeting |
| 5 | `6cdd258` | 2026-03-27 | test(desktop): avoid paste filename coupling |
| 6 | `6a918ff` | 2026-03-27 | docs(desktop): document e2e lane usage |
| 7 | `afcdea0` | 2026-03-27 | feat(skill): add repo verify workflow |
| 8 | `02049dd` | 2026-03-30 | chore: merge main into fix/tests |
| 9 | `8d407a2` | 2026-03-30 | chore: merge fix/tests into main |
| 10 | `a5f0ee4` | 2026-03-30 | refactor(desktop): decouple ModelSelector from SessionRecord |
| 11 | `7e33ce5` | 2026-03-30 | feat(desktop): add model/thinking fields to StartThreadInput |
| 12 | `571ba7a` | 2026-03-30 | feat(desktop): apply model/thinking overrides in startThread handler |
| 13 | `1374be9` | 2026-03-30 | feat(desktop): add model/thinking selector to new thread page |
| 14 | `9c1747f` | 2026-03-30 | fix(desktop): eagerly sync session config after model/thinking changes |
| 15 | `ef79f88` | 2026-03-30 | fix(desktop): prevent starting a thread without a prompt |
| 16 | `488bd90` | 2026-03-30 | fix(desktop): use relative dates in sidebar instead of absolute dates |
| 17 | `6d57821` | 2026-03-30 | feat(desktop): filter buildModelOptions by enabled patterns + availability |
| 18 | `a867346` | 2026-03-30 | feat(desktop): add @dnd-kit dependency for workspace reordering |
| 19 | `0bc34f3` | 2026-03-30 | feat(desktop): unify settings model sections |
| 20 | `e835894` | 2026-03-30 | feat(desktop): add workspace reorder persistence and IPC |
| 21 | `afbdd10` | 2026-03-30 | fix(desktop): guard stale default model in new thread fallback |
| 22 | `d8c6f7c` | 2026-03-30 | feat(desktop): add drag-and-drop workspace reordering UI |
| 23 | `c88f12a` | 2026-03-30 | ci: move desktop verification to macos |
| 24 | `00b6c66` | 2026-03-30 | refactor(desktop): simplify workspace reorder code per review |
| 25 | `ecafc5c` | 2026-03-30 | refactor(desktop): simplify model selection code |
| 26 | `8da2f3c` | 2026-03-30 | fix(desktop): degrade unsupported custom ui and follow new sessions |
| 27 | `1ec731c` | 2026-03-30 | test(desktop): cover extension fallback and child sessions |
| 28 | `becb813` | 2026-03-30 | test: make status assertions ci-safe |
| 29 | `64f7a8a` | 2026-03-30 | test: make model menu assertion ci-safe |
| 30 | `4c38e3a` | 2026-03-30 | fix(desktop): overlay grip handle on hover, remove workspace time |
| 31 | `38ec726` | 2026-03-30 | fix(desktop): remove grip icon, use grab cursor on workspace row instead |
| 32 | `2b02167` | 2026-03-30 | fix(desktop): restore original workspace-row grid columns |
| 33 | `749fa46` | 2026-03-30 | feat(desktop): add collapse/expand toggle to sidebar workspaces |
| 34 | `54d3739` | 2026-03-30 | fix(desktop): expand workspace on new thread, don't re-select on toggle |
| 35 | `a66c80d` | 2026-03-30 | fix(desktop): remove redundant pill row from default model section |
| 36 | `a99cba5` | 2026-03-30 | fix(desktop): align session time and archive icon on same vertical |
| 37 | `6156685` | 2026-03-30 | fix(desktop): align session archive icon with time text |
| 38 | `3e1827e` | 2026-03-30 | fix(desktop): optimistic reorder to prevent snap-back animation |
| 39 | `b8c681e` | 2026-03-30 | refactor(desktop): add settings row layout components and CSS |
| 40 | `b9d4ee6` | 2026-03-30 | feat(desktop): restyle all settings tabs to Codex row layout |
| 41 | `fc94f0d` | 2026-03-30 | chore(desktop): remove old SettingsCard CSS and unused settings-stack |
| 42 | `8527f5b` | 2026-03-30 | fix(desktop): use closestCenter collision for easier workspace reorder |
| 43 | `0d07fa2` | 2026-03-30 | fix(desktop): collision detection based on workspace header, not full group |
| 44 | `037be22` | 2026-03-30 | fix(desktop): settings layout fixes |
| 45 | `e8dbdda` | 2026-03-30 | Merge pull request #5 from minghinmatthewlam/feature/new-thread-model-selector |
