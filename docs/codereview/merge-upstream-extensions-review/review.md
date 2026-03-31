# Code Review: `main` → `merge/upstream-extensions`

**Base**: `main` (a226275)  
**Head**: `merge/upstream-extensions` (fce65ce)  
**Scope**: 39 files  
**Date**: 2026-03-28

---

## Executive Summary

The generated diff bundle is accurate for `main` → `merge/upstream-extensions` at `fce65ce`, but the current worktree also contains follow-up fixes applied during this review. The critical regression was real and branch-specific: the upstream extension-session merge introduced a startup refresh/subscription race that repeatedly reopened running sessions on Windows and multiplied `pi.exe` processes.

Outside that bug, most of the merge is structurally sound. The renderer changes are consistent with the new extension-session UI model, the driver/runtime additions line up with the extended host-UI contract, and the majority of the new live tests correctly exercise the new behavior. Two Windows-facing live-test defects were also found and fixed during review: one used a macOS-only shortcut in a Windows Electron test, and one assumed the extension dock disappears entirely when unrelated runtime statuses can legitimately keep it visible.

---

## Issues Found

### ISSUE-1 [HIGH]: Startup refresh requeued itself for sessions already present in the active catalog snapshot
**File**: `apps/desktop/electron/app-store.ts`
**Diff**: [apps--desktop--electron--app-store.ts.diff](diffs/apps--desktop--electron--app-store.ts.diff)
**Problem**: `handleSessionEvent()` used `sessionFromState()` as the only test for whether a session was known. During startup, `refreshState()` subscribes running sessions before `this.state` is rebuilt, so the synthetic `sessionUpdated` emitted during subscription is treated as an event for an unknown session. That schedules another full `refreshState()` while the first refresh is still applying. With many running sessions, the app rewalks the same catalog repeatedly and keeps reopening runtime sessions, which is the branch-specific process multiplication seen on Windows.
**Root Cause**: Unknown-session recovery did not distinguish between "missing from current UI state" and "already present in the catalog snapshot currently being applied by the active refresh." The extension-session merge made that distinction necessary because subscription bootstrap events now arrive during refresh.
**Fix**: Track the session keys present in the in-flight catalog snapshot and suppress unknown-session recovery for those keys. This is now implemented in the current worktree in `app-store.ts`.

### ISSUE-2 [MEDIUM]: Session subscription bootstrap is synchronous and makes the refresh race deterministic
**File**: `packages/pi-sdk-driver/src/session-supervisor.ts`
**Diff**: [packages--pi-sdk-driver--src--session-supervisor.ts.diff](diffs/packages--pi-sdk-driver--src--session-supervisor.ts.diff)
**Problem**: `subscribe()` immediately invokes `listener(sessionUpdatedEvent(record))` and then replays extension UI state. That means the app-store receives bootstrap events before the caller has finished its own subscription bookkeeping and before a surrounding refresh has rebuilt state. This behavior is what turns the app-store recovery bug into a reproducible startup process-multiplication issue.
**Root Cause**: Subscription bootstrap reuses the normal event channel synchronously instead of exposing an explicit initial snapshot handshake or a deferred replay boundary.
**Fix**: The current fix is applied at the app-store boundary because it is the component that incorrectly reenters full refresh for catalog-known sessions. If this area changes again, consider deferring the bootstrap callback or separating initial state replay from normal event delivery.

### ISSUE-3 [MEDIUM]: Dialog live test used a macOS-only select-all shortcut and failed on Windows
**File**: `apps/desktop/tests/extensions-dialogs-live.spec.ts`
**Diff**: [apps--desktop--tests--extensions-dialogs-live.spec.ts.diff](diffs/apps--desktop--tests--extensions-dialogs-live.spec.ts.diff)
**Problem**: The editor-dialog test used `Meta+A` before `Backspace` to clear the textarea. On Windows that does not select the existing text, so the test appended to the initial content and failed with `Line Line 1\nLine 2` instead of `Line 1\nLine 2`.
**Root Cause**: The live test encoded a platform-specific keyboard shortcut in a Windows-relevant Electron suite.
**Fix**: Use `ControlOrMeta+A`. This is now implemented in the current worktree and verified by rerunning the test on Windows.

### ISSUE-4 [LOW]: Session-isolation live test assumed the dock disappears entirely in Session B
**File**: `apps/desktop/tests/extensions-session-isolation-live.spec.ts`
**Diff**: [apps--desktop--tests--extensions-session-isolation-live.spec.ts.diff](diffs/apps--desktop--tests--extensions-session-isolation-live.spec.ts.diff)
**Problem**: The original assertion expected `extension-dock` to have count `0` after switching from Session A to Session B. In practice, unrelated runtime statuses can legitimately keep the dock visible, so the assertion produced a false failure and did not actually test for leaked Session A content.
**Root Cause**: The test asserted on dock presence rather than on session-specific extension content.
**Fix**: Assert that Session B does not contain Session A's marked content, then drive Session B's own `/mark-ui` flow and verify both sessions render their own state independently. This is now implemented and verified in the current worktree.

---

## Per-File Review

_Files sorted by change size (largest first)._

### apps/desktop

#### `apps/desktop/src/composer-panel.tsx` (+146/-142)

[View diff](diffs/apps--desktop--src--composer-panel.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Extension dock integration and runtime-command badges are wired correctly; the component remains presentational over App-owned state. | LOW |
| Error handling | The dock is rendered only when a model exists, so missing session-extension state does not leak into the composer surface. | LOW |
| Edge cases | Slash and mention menus still anchor inside `.composer__editor`, so the added dock does not break menu layering. | LOW |
| API contract | New dock props are narrow and consistent with App.tsx usage. | LOW |

#### `apps/desktop/electron/app-store.ts` (+275/-10)

[View diff](diffs/apps--desktop--electron--app-store.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Unknown-session recovery was reentering `refreshState()` for sessions already present in the active catalog snapshot; that reopened running session runtimes on startup and is the process-multiplication root cause. Fixed in current worktree. | HIGH |
| Error handling | Refresh serialization already existed, but it only prevented overlap; it did not prevent queued follow-on refresh passes for the same startup snapshot. | MEDIUM |
| Edge cases | Worst case is a workspace with many sessions persisted as `running`: every bootstrap `sessionUpdated` can queue another full catalog walk unless the refresh-in-flight session keys are tracked. | HIGH |
| API contract | No public API change required; this is an internal recovery-path correction. | LOW |

#### `apps/desktop/src/extension-session-ui.tsx` (+254/-0)

[View diff](diffs/apps--desktop--src--extension-session-ui.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Dock-model building, ANSI stripping, and modal dialog rendering are internally consistent and match the session-extension state shape. | LOW |
| Error handling | Dialog responses always preserve `requestId` and use the typed host-UI response shapes expected by the driver. | LOW |
| Edge cases | Summary fallback only appears when extension UI exists but all visible text is empty, which is safe and intentional. | LOW |
| API contract | `SessionExtensionDialogRecord` and `HostUiResponse` usage align cleanly across confirm, select, input, and editor flows. | LOW |

#### `apps/desktop/src/extensions-view.tsx` (+253/-0)

[View diff](diffs/apps--desktop--src--extensions-view.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Search, selection, enable/disable, and detail rendering all follow the runtime extension model correctly. | LOW |
| Error handling | Empty workspace and empty-results states are handled explicitly rather than leaving a blank panel. | LOW |
| Edge cases | Selection falls back to the first filtered extension when the previous selection disappears from the filtered set. | LOW |
| API contract | Callback surface is narrow and matches the new Electron IPC operations. | LOW |

#### `apps/desktop/src/composer-commands.ts` (+161/-58)

[View diff](diffs/apps--desktop--src--composer-commands.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Runtime command merging and deduplication are correct; session commands intentionally win over colliding host actions. | LOW |
| Error handling | Skill-command disabling is respected when reconstructing runtime commands from settings and session state. | LOW |
| Edge cases | Command IDs include source prefixes, so extension, prompt, and host commands cannot collide silently. | LOW |
| API contract | `runtimeCommand` and `sourceLabel` additions are consistent with slash-menu and composer-panel consumers. | LOW |

#### `apps/desktop/tests/extension-dock-live.spec.ts` (+215/-0)

[View diff](diffs/apps--desktop--tests--extension-dock-live.spec.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The live test correctly exercises dock rendering, ANSI stripping, placement, and transcript suppression for repeated widget updates. | LOW |
| Error handling | Assertions use polling and content checks that tolerate asynchronous extension startup without hiding failures. | LOW |
| Edge cases | Summary assertions are intentionally loose because runtime statuses can precede extension statuses. | LOW |
| API contract | The test covers the renderer’s `extension-dock-*` surfaces without overfitting to implementation details. | LOW |

#### `apps/desktop/src/styles/main.css` (+168/-1)

[View diff](diffs/apps--desktop--src--styles--main.css.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Dock, dialog, and extension-detail styles match the new renderer structure and keep the composer-first layout intact. | LOW |
| Error handling | Added selectors avoid reliance on brittle global positioning and give the new surfaces predictable containment. | LOW |
| Edge cases | Dark/light theme overrides cover the newly introduced dock and dialog surfaces. | LOW |
| API contract | Class names align with the new React components and do not broaden the styling contract. | LOW |

#### `apps/desktop/src/App.tsx` (+141/-5)

[View diff](diffs/apps--desktop--src--App.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Session-keyed lookups for commands and extension UI are correct, and extension title override falls back safely to the session title. | LOW |
| Error handling | The dialog renderer only mounts when a pending dialog exists for the selected session. | LOW |
| Edge cases | Dock expansion state cleanup removes stale entries when content disappears, preventing UI state from accumulating across sessions. | LOW |
| API contract | The new `sessionCommandsBySession` and `sessionExtensionUiBySession` dictionaries are consumed consistently. | LOW |

#### `apps/desktop/tests/extension-dock-reload-live.spec.ts` (+123/-0)

[View diff](diffs/apps--desktop--tests--extension-dock-reload-live.spec.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The test correctly verifies that `/reload` and runtime refresh reset dock expansion and rebuild extension output. | LOW |
| Error handling | The enable/disable flow is checked through the real Electron surface rather than mocked session state. | LOW |
| Edge cases | The dock is expected to come back collapsed after rebuild, which matches the intended UX. | LOW |
| API contract | Coverage matches the extension enable/disable and refresh actions exposed through the renderer. | LOW |

#### `apps/desktop/tests/extensions-live.spec.ts` (+114/-0)

[View diff](diffs/apps--desktop--tests--extensions-live.spec.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The current test correctly validates runtime-command precedence and extension enable/disable flow through the app shell. | LOW |
| Error handling | Longer timeouts and content-based assertions avoid false failures from slower extension bootstrap and built-in runtime statuses. | LOW |
| Edge cases | After disabling a user extension, the dock may remain visible for unrelated runtime statuses; the current assertions handle that correctly. | LOW |
| API contract | The test covers both the Extensions surface and the slash-menu contract for runtime vs host commands. | LOW |

#### `apps/desktop/tests/extensions-dialogs-live.spec.ts` (+101/-0)

[View diff](diffs/apps--desktop--tests--extensions-dialogs-live.spec.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Confirm, select, input, and editor dialogs all round-trip correctly between renderer and session runtime. | LOW |
| Error handling | The Windows failure caused by `Meta+A` was real and is now corrected with `ControlOrMeta+A` in the current worktree. | MEDIUM |
| Edge cases | Cancel paths remain lighter than submit paths, but the primary dialog transport is now validated cross-platform. | LOW |
| API contract | The test exercises the exact `respondToHostUiRequest` shapes used by the renderer IPC bridge. | LOW |

#### `apps/desktop/src/timeline-item.tsx` (+1/-66)

[View diff](diffs/apps--desktop--src--timeline-item.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Removing timeline host-request rendering is consistent with the new modal extension UI model. | LOW |
| Error handling | The component no longer has to interpret transient host-UI events in the transcript path. | LOW |
| Edge cases | Notify-style events still surface via timeline through the Electron store, so user-visible notifications remain covered. | LOW |
| API contract | The simplified transcript item union is consistent with `timeline-types.ts`. | LOW |

#### `apps/desktop/tests/extensions-session-isolation-live.spec.ts` (+64/-0)

[View diff](diffs/apps--desktop--tests--extensions-session-isolation-live.spec.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The strengthened test now verifies both that Session B does not show Session A’s marked content and that Session B can establish its own extension UI. | LOW |
| Error handling | The original `toHaveCount(0)` dock assertion produced a false failure when unrelated runtime statuses kept the dock visible; the current worktree fixes that. | LOW |
| Edge cases | Summary assertions are intentionally replaced with dock-body content checks because summary ordering is runtime-dependent. | LOW |
| API contract | The test now exercises per-session extension state more faithfully against the real renderer surface. | LOW |

#### `apps/desktop/electron/app-store-timeline.ts` (+7/-31)

[View diff](diffs/apps--desktop--electron--app-store-timeline.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Filtering host UI events out of the timeline except for `notify` is consistent with the move to modal/session-surface rendering. | LOW |
| Error handling | Timeline logic no longer depends on transient dialog requests that are better handled outside transcript persistence. | LOW |
| Edge cases | Repeated widget/status updates avoid transcript spam because they no longer map to timeline items. | LOW |
| API contract | Transcript event handling remains compatible with the simplified renderer item types. | LOW |

#### `apps/desktop/electron/session-state-map.ts` (+34/-1)

[View diff](diffs/apps--desktop--electron--session-state-map.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Extension UI state is stored, pruned, and serialized consistently alongside the rest of the per-session maps. | LOW |
| Error handling | `prune()` still centralizes stale-session cleanup so extension UI state cannot outlive its session entry. | LOW |
| Edge cases | Pending dialogs are session-scoped and removed with the rest of session state on deletion. | LOW |
| API contract | The mutable runtime state shape matches the serialized `desktop-state` record. | LOW |

#### `apps/desktop/src/desktop-state.ts` (+31/-3)

[View diff](diffs/apps--desktop--src--desktop-state.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | New extension-session state record types line up with both the Electron store and renderer consumers. | LOW |
| Error handling | Typed extraction of dialog-capable host UI requests reduces accidental misuse of non-dialog events. | LOW |
| Edge cases | Optional title/editorText fields preserve sparse state rather than forcing empty defaults into persistence. | LOW |
| API contract | `AppView` and per-session dictionaries were extended without breaking existing state keys. | LOW |

#### `apps/desktop/src/icons.tsx` (+15/-0)

[View diff](diffs/apps--desktop--src--icons.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The new extension icon is purely additive and used consistently in the sidebar. | LOW |
| Error handling | No runtime behavior is attached to the icon component. | LOW |
| Edge cases | SVG sizing and stroke attributes match the rest of the icon set. | LOW |
| API contract | Icon export naming follows the existing pattern. | LOW |

#### `apps/desktop/tests/skills-settings-live.spec.ts` (+12/-3)

[View diff](diffs/apps--desktop--tests--skills-settings-live.spec.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The test now validates both disabling and re-enabling skill slash commands through the real Settings surface. | LOW |
| Error handling | The current version no longer leaves the disabled state unverified. | LOW |
| Edge cases | Slash-menu visibility is asserted directly rather than inferred from runtime state. | LOW |
| API contract | Coverage matches the `setEnableSkillCommands` contract exposed through IPC. | LOW |

#### `apps/desktop/electron/main.ts` (+13/-0)

[View diff](diffs/apps--desktop--electron--main.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | New IPC handlers are wired to the correct store methods and preserve the tight preload/main boundary. | LOW |
| Error handling | Unknown extension paths and workspace IDs still throw explicit errors instead of failing silently. | LOW |
| Edge cases | The added handlers do not broaden navigation or filesystem exposure beyond the existing IPC model. | LOW |
| API contract | Main-process routes match the renderer IPC declarations. | LOW |

#### `apps/desktop/src/ipc.ts` (+13/-0)

[View diff](diffs/apps--desktop--src--ipc.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The new IPC constants and typed API methods fully cover extension enable/open/respond flows. | LOW |
| Error handling | Response unions for host UI requests are explicit and narrow, reducing accidental malformed payloads. | LOW |
| Edge cases | Theme and window APIs remain unchanged around the new extension operations. | LOW |
| API contract | Renderer declarations line up with the new handlers in `main.ts` and `preload.ts`. | LOW |

#### `apps/desktop/electron/app-store-composer.ts` (+11/-1)

[View diff](diffs/apps--desktop--electron--app-store-composer.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Runtime slash-command detection and session command refresh integrate correctly with composer submission. | LOW |
| Error handling | Commands are refreshed through the store rather than inferred from stale client state. | LOW |
| Edge cases | The new runtime-command path does not change existing host-command submission semantics. | LOW |
| API contract | Internal store calls stay narrow and session-scoped. | LOW |

#### `apps/desktop/electron/app-store-workspace.ts` (+12/-0)

[View diff](diffs/apps--desktop--electron--app-store-workspace.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Pending dialogs are cancelled on session/workspace/view transitions, preventing orphaned host UI requests. | LOW |
| Error handling | Cancellation is routed back through the same response channel used for normal dialog completion. | LOW |
| Edge cases | Active view changes now preserve correctness when leaving the threads surface mid-dialog. | LOW |
| API contract | Added workspace/session transition calls use existing store abstractions rather than exposing new state knobs. | LOW |

#### `apps/desktop/src/sidebar.tsx` (+11/-1)

[View diff](diffs/apps--desktop--src--sidebar.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The new Extensions navigation action is placed consistently with Skills and routes to the correct view. | LOW |
| Error handling | The button remains inert unless the parent supplies the appropriate callback. | LOW |
| Edge cases | No session-selection logic was entangled with the new view button. | LOW |
| API contract | Sidebar props remain simple and additive. | LOW |

#### `apps/desktop/tests/harness.ts` (+12/-0)

[View diff](diffs/apps--desktop--tests--harness.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | `writeProjectExtension()` creates the expected `.pi/extensions` layout and is used consistently by the new live tests. | LOW |
| Error handling | Existing launch and IPC helpers remain unchanged around the extension helper addition. | LOW |
| Edge cases | Extension-test setup no longer has to duplicate filesystem boilerplate. | LOW |
| API contract | The helper stays test-local and does not affect runtime code. | LOW |

#### `apps/desktop/src/timeline-types.ts` (+1/-9)

[View diff](diffs/apps--desktop--src--timeline-types.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Removing host-request timeline types matches the new modal extension UI design. | LOW |
| Error handling | Type simplification reduces the chance of stale renderer branches for host-request items. | LOW |
| Edge cases | Summary, activity, and tool-call items remain intact. | LOW |
| API contract | Type exports stay aligned with `timeline-item.tsx` and `app-store-timeline.ts`. | LOW |

#### `apps/desktop/electron/preload.ts` (+7/-0)

[View diff](diffs/apps--desktop--electron--preload.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The preload bridge forwards the new extension operations without exposing broad new process or filesystem capabilities. | LOW |
| Error handling | IPC forwarding stays consistent with the existing invoke-based error propagation. | LOW |
| Edge cases | The added APIs are session/workspace scoped rather than global. | LOW |
| API contract | Preload and renderer typings remain aligned. | LOW |

#### `apps/desktop/src/hooks/use-slash-menu.tsx` (+4/-2)

[View diff](diffs/apps--desktop--src--hooks--use-slash-menu.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Explicit `sessionCommands` input makes slash-menu reconstruction deterministic for extension-provided runtime commands. | LOW |
| Error handling | The hook continues to degrade gracefully when no runtime or no session commands are present. | LOW |
| Edge cases | Command lists rebuild correctly when the selected session changes. | LOW |
| API contract | The hook signature change is narrow and reflected in the only call sites. | LOW |

#### `apps/desktop/electron/app-store-internals.ts` (+4/-0)

[View diff](diffs/apps--desktop--electron--app-store-internals.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The internal interface additions accurately represent the new store capabilities used by workspace/composer helpers. | LOW |
| Error handling | No implementation logic was introduced here. | LOW |
| Edge cases | Interface growth remains tightly scoped to extension-session behavior. | LOW |
| API contract | New internal methods are consistent with existing naming and responsibility boundaries. | LOW |

#### `apps/desktop/src/topbar.tsx` (+3/-1)

[View diff](diffs/apps--desktop--src--topbar.tsx.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Session-title override correctly prefers extension-set titles while preserving existing fallbacks. | LOW |
| Error handling | No new branching or state mutation was added beyond display logic. | LOW |
| Edge cases | Undefined selected session titles are still handled through the existing fallback chain. | LOW |
| API contract | The new prop is additive and optional. | LOW |

### packages/pi-sdk-driver

#### `packages/pi-sdk-driver/src/session-supervisor.ts` (+600/-42)

[View diff](diffs/packages--pi-sdk-driver--src--session-supervisor.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | `subscribe()` immediately delivers `sessionUpdatedEvent(record)` and replays extension UI, which is safe only if callers do not treat those bootstrap events as proof of an unknown session. | MEDIUM |
| Error handling | No separate process leak was found here after the app-store guard; pending host UI requests and session disposal paths already clean up correctly for this bug. | LOW |
| Edge cases | Bootstrap replay arrives before the desktop store has rebuilt its state during startup refresh, which is the timing window that exposed the regression. | MEDIUM |
| API contract | No external API regression identified; the risk is in listener timing semantics, not the wire format. | LOW |

#### `packages/pi-sdk-driver/src/vendor/session-driver.d.ts` (+196/-1)

[View diff](diffs/packages--pi-sdk-driver--src--vendor--session-driver.d.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Vendored driver types reflect the new host-UI request/response shapes and session-command methods expected by the desktop app. | LOW |
| Error handling | This file is declarative only and does not add runtime failure paths. | LOW |
| Edge cases | Added unions cover dialog, widget, status, and title/editor request variants consistently. | LOW |
| API contract | The vendored declarations stay aligned with `packages/session-driver/src/types.ts`. | LOW |

#### `packages/pi-sdk-driver/src/runtime-supervisor.ts` (+139/-17)

[View diff](diffs/packages--pi-sdk-driver--src--runtime-supervisor.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Extension discovery, diagnostics, and toggle-path handling mirror the existing skill model and use verified upstream `SettingsManager` APIs. | LOW |
| Error handling | Unknown scopes and missing package sources still throw explicit errors instead of silently corrupting settings. | LOW |
| Edge cases | Relative pattern generation handles both top-level and package-scoped resources consistently. | LOW |
| API contract | Runtime snapshot additions for extensions are coherent with renderer consumers and session command collection. | LOW |

#### `packages/pi-sdk-driver/src/extension-ui-state.ts` (+66/-0)

[View diff](diffs/packages--pi-sdk-driver--src--extension-ui-state.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The reducer correctly applies status, widget, title, editor, and reset requests into extension UI state. | LOW |
| Error handling | Reset handling clears prior state deterministically instead of mutating piecemeal. | LOW |
| Edge cases | Empty widget/status payloads collapse naturally out of renderer-visible state. | LOW |
| API contract | The state model matches both the session supervisor and desktop-state serializer. | LOW |

#### `packages/pi-sdk-driver/src/runtime-command-utils.ts` (+11/-0)

[View diff](diffs/packages--pi-sdk-driver--src--runtime-command-utils.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Command-name normalization and skill command naming are small, deterministic helpers with no hidden state. | LOW |
| Error handling | Helper behavior is trivial and side-effect free. | LOW |
| Edge cases | Slash prefixes are normalized consistently across skill and extension command sources. | LOW |
| API contract | Helper exports are appropriately narrow. | LOW |

#### `packages/pi-sdk-driver/src/pi-sdk-driver.ts` (+9/-0)

[View diff](diffs/packages--pi-sdk-driver--src--pi-sdk-driver.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The driver forwards `getSessionCommands()` and `respondToHostUiRequest()` directly to the supervisor without altering semantics. | LOW |
| Error handling | No additional error handling branches were introduced in the facade layer. | LOW |
| Edge cases | Existing session-driver behavior remains unchanged around the new methods. | LOW |
| API contract | The public driver surface now fully matches the extended session-driver interface. | LOW |

#### `packages/pi-sdk-driver/src/index.ts` (+6/-0)

[View diff](diffs/packages--pi-sdk-driver--src--index.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Re-exports now expose extension UI state helpers alongside the driver, which matches downstream usage. | LOW |
| Error handling | Export changes are additive only. | LOW |
| Edge cases | No circular export risk was introduced. | LOW |
| API contract | Package entrypoints stay consistent with the new renderer/store imports. | LOW |

### packages/session-driver

#### `packages/session-driver/src/runtime-types.ts` (+54/-0)

[View diff](diffs/packages--session-driver--src--runtime-types.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Runtime extension and runtime command records contain the metadata the renderer actually uses for filtering, badges, and detail views. | LOW |
| Error handling | These are data-shape additions only. | LOW |
| Edge cases | Source metadata covers scope, origin, and optional base directories needed by both skills and extensions. | LOW |
| API contract | The additions are coherent with both `runtime-supervisor.ts` and renderer consumers. | LOW |

#### `packages/session-driver/src/types.ts` (+29/-0)

[View diff](diffs/packages--session-driver--src--types.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | Host UI request/response unions and added driver methods accurately reflect the runtime-extension flow now used by desktop. | LOW |
| Error handling | Discriminated unions prevent malformed mixed response payloads. | LOW |
| Edge cases | Optional timeout values on dialogs are represented without widening other request kinds. | LOW |
| API contract | The updated interface matches both the vendored d.ts and the driver implementation. | LOW |

#### `packages/session-driver/src/index.ts` (+8/-0)

[View diff](diffs/packages--session-driver--src--index.ts.diff)

| Aspect | Finding | Risk |
|--------|---------|------|
| Correctness | The barrel export simply exposes the updated runtime and session-driver types. | LOW |
| Error handling | No runtime logic was introduced. | LOW |
| Edge cases | Re-export ordering does not create conflicts. | LOW |
| API contract | Consumers can import the extended driver/runtime types from the existing package root. | LOW |

---

## Fix Summary

| # | Severity | Issue | File | Status |
|---|----------|-------|------|--------|
| 1 | HIGH | Startup refresh reentry reopened running session runtimes and multiplied `pi.exe` processes on Windows. | `apps/desktop/electron/app-store.ts` | Fixed in current worktree and validated with typecheck plus Electron Playwright runs. |
| 2 | MEDIUM | Synchronous subscription bootstrap makes caller ordering sensitive during refresh. | `packages/pi-sdk-driver/src/session-supervisor.ts` | Mitigated by issue #1 fix; architectural timing risk remains documented. |
| 3 | MEDIUM | Windows dialog live test used `Meta+A` and failed to clear the editor textarea. | `apps/desktop/tests/extensions-dialogs-live.spec.ts` | Fixed in current worktree (`ControlOrMeta+A`) and verified by rerunning the test. |
| 4 | LOW | Session-isolation live test assumed the dock disappears completely in Session B and missed the stronger bidirectional check. | `apps/desktop/tests/extensions-session-isolation-live.spec.ts` | Fixed in current worktree with content-specific assertions and bidirectional coverage; verified by rerunning the test. |
