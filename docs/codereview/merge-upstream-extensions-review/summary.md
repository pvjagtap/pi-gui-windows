# Code Review: `main` → `merge/upstream-extensions`

**Base**: `main` (a226275)  
**Head**: `merge/upstream-extensions` (fce65ce)  
**Generated**: 2026-03-28 20:34 UTC  
**Files**: 39 changed

## Diff Stats

```
apps/desktop/electron/app-store-composer.ts        |  12 +-
 apps/desktop/electron/app-store-internals.ts       |   4 +
 apps/desktop/electron/app-store-timeline.ts        |  38 +-
 apps/desktop/electron/app-store-workspace.ts       |  12 +
 apps/desktop/electron/app-store.ts                 | 285 ++++++++-
 apps/desktop/electron/main.ts                      |  13 +
 apps/desktop/electron/preload.ts                   |   7 +
 apps/desktop/electron/session-state-map.ts         |  35 +-
 apps/desktop/src/App.tsx                           | 146 ++++-
 apps/desktop/src/composer-commands.ts              | 219 +++++--
 apps/desktop/src/composer-panel.tsx                | 288 ++++-----
 apps/desktop/src/desktop-state.ts                  |  34 +-
 apps/desktop/src/extension-session-ui.tsx          | 254 ++++++++
 apps/desktop/src/extensions-view.tsx               | 253 ++++++++
 apps/desktop/src/hooks/use-slash-menu.tsx          |   6 +-
 apps/desktop/src/icons.tsx                         |  15 +
 apps/desktop/src/ipc.ts                            |  13 +
 apps/desktop/src/sidebar.tsx                       |  12 +-
 apps/desktop/src/styles/main.css                   | 169 +++++-
 apps/desktop/src/timeline-item.tsx                 |  67 +--
 apps/desktop/src/timeline-types.ts                 |  10 +-
 apps/desktop/src/topbar.tsx                        |   4 +-
 apps/desktop/tests/extension-dock-live.spec.ts     | 215 +++++++
 .../tests/extension-dock-reload-live.spec.ts       | 123 ++++
 apps/desktop/tests/extensions-dialogs-live.spec.ts | 101 ++++
 apps/desktop/tests/extensions-live.spec.ts         | 114 ++++
 .../extensions-session-isolation-live.spec.ts      |  64 ++
 apps/desktop/tests/harness.ts                      |  12 +
 apps/desktop/tests/skills-settings-live.spec.ts    |  15 +-
 packages/pi-sdk-driver/src/extension-ui-state.ts   |  66 +++
 packages/pi-sdk-driver/src/index.ts                |   6 +
 packages/pi-sdk-driver/src/pi-sdk-driver.ts        |   9 +
 .../pi-sdk-driver/src/runtime-command-utils.ts     |  11 +
 packages/pi-sdk-driver/src/runtime-supervisor.ts   | 156 ++++-
 packages/pi-sdk-driver/src/session-supervisor.ts   | 642 +++++++++++++++++++--
 .../pi-sdk-driver/src/vendor/session-driver.d.ts   | 197 ++++++-
 packages/session-driver/src/index.ts               |   8 +
 packages/session-driver/src/runtime-types.ts       |  54 ++
 packages/session-driver/src/types.ts               |  29 +
 39 files changed, 3324 insertions(+), 394 deletions(-)
```

## All Files (sorted by change size)

| # | File | +Added | -Removed | Total | Category | Diff |
|---|------|--------|----------|-------|----------|------|
| 1 | `packages/pi-sdk-driver/src/session-supervisor.ts` | +600 | -42 | 642 | packages/pi-sdk-driver | [diff](diffs/packages--pi-sdk-driver--src--session-supervisor.ts.diff) |
| 2 | `apps/desktop/src/composer-panel.tsx` | +146 | -142 | 288 | apps/desktop | [diff](diffs/apps--desktop--src--composer-panel.tsx.diff) |
| 3 | `apps/desktop/electron/app-store.ts` | +275 | -10 | 285 | apps/desktop | [diff](diffs/apps--desktop--electron--app-store.ts.diff) |
| 4 | `apps/desktop/src/extension-session-ui.tsx` | +254 | -0 | 254 | apps/desktop | [diff](diffs/apps--desktop--src--extension-session-ui.tsx.diff) |
| 5 | `apps/desktop/src/extensions-view.tsx` | +253 | -0 | 253 | apps/desktop | [diff](diffs/apps--desktop--src--extensions-view.tsx.diff) |
| 6 | `apps/desktop/src/composer-commands.ts` | +161 | -58 | 219 | apps/desktop | [diff](diffs/apps--desktop--src--composer-commands.ts.diff) |
| 7 | `apps/desktop/tests/extension-dock-live.spec.ts` | +215 | -0 | 215 | apps/desktop | [diff](diffs/apps--desktop--tests--extension-dock-live.spec.ts.diff) |
| 8 | `packages/pi-sdk-driver/src/vendor/session-driver.d.ts` | +196 | -1 | 197 | packages/pi-sdk-driver | [diff](diffs/packages--pi-sdk-driver--src--vendor--session-driver.d.ts.diff) |
| 9 | `apps/desktop/src/styles/main.css` | +168 | -1 | 169 | apps/desktop | [diff](diffs/apps--desktop--src--styles--main.css.diff) |
| 10 | `packages/pi-sdk-driver/src/runtime-supervisor.ts` | +139 | -17 | 156 | packages/pi-sdk-driver | [diff](diffs/packages--pi-sdk-driver--src--runtime-supervisor.ts.diff) |
| 11 | `apps/desktop/src/App.tsx` | +141 | -5 | 146 | apps/desktop | [diff](diffs/apps--desktop--src--App.tsx.diff) |
| 12 | `apps/desktop/tests/extension-dock-reload-live.spec.ts` | +123 | -0 | 123 | apps/desktop | [diff](diffs/apps--desktop--tests--extension-dock-reload-live.spec.ts.diff) |
| 13 | `apps/desktop/tests/extensions-live.spec.ts` | +114 | -0 | 114 | apps/desktop | [diff](diffs/apps--desktop--tests--extensions-live.spec.ts.diff) |
| 14 | `apps/desktop/tests/extensions-dialogs-live.spec.ts` | +101 | -0 | 101 | apps/desktop | [diff](diffs/apps--desktop--tests--extensions-dialogs-live.spec.ts.diff) |
| 15 | `apps/desktop/src/timeline-item.tsx` | +1 | -66 | 67 | apps/desktop | [diff](diffs/apps--desktop--src--timeline-item.tsx.diff) |
| 16 | `packages/pi-sdk-driver/src/extension-ui-state.ts` | +66 | -0 | 66 | packages/pi-sdk-driver | [diff](diffs/packages--pi-sdk-driver--src--extension-ui-state.ts.diff) |
| 17 | `apps/desktop/tests/extensions-session-isolation-live.spec.ts` | +64 | -0 | 64 | apps/desktop | [diff](diffs/apps--desktop--tests--extensions-session-isolation-live.spec.ts.diff) |
| 18 | `packages/session-driver/src/runtime-types.ts` | +54 | -0 | 54 | packages/session-driver | [diff](diffs/packages--session-driver--src--runtime-types.ts.diff) |
| 19 | `apps/desktop/electron/app-store-timeline.ts` | +7 | -31 | 38 | apps/desktop | [diff](diffs/apps--desktop--electron--app-store-timeline.ts.diff) |
| 20 | `apps/desktop/electron/session-state-map.ts` | +34 | -1 | 35 | apps/desktop | [diff](diffs/apps--desktop--electron--session-state-map.ts.diff) |
| 21 | `apps/desktop/src/desktop-state.ts` | +31 | -3 | 34 | apps/desktop | [diff](diffs/apps--desktop--src--desktop-state.ts.diff) |
| 22 | `packages/session-driver/src/types.ts` | +29 | -0 | 29 | packages/session-driver | [diff](diffs/packages--session-driver--src--types.ts.diff) |
| 23 | `apps/desktop/src/icons.tsx` | +15 | -0 | 15 | apps/desktop | [diff](diffs/apps--desktop--src--icons.tsx.diff) |
| 24 | `apps/desktop/tests/skills-settings-live.spec.ts` | +12 | -3 | 15 | apps/desktop | [diff](diffs/apps--desktop--tests--skills-settings-live.spec.ts.diff) |
| 25 | `apps/desktop/electron/main.ts` | +13 | -0 | 13 | apps/desktop | [diff](diffs/apps--desktop--electron--main.ts.diff) |
| 26 | `apps/desktop/src/ipc.ts` | +13 | -0 | 13 | apps/desktop | [diff](diffs/apps--desktop--src--ipc.ts.diff) |
| 27 | `apps/desktop/electron/app-store-composer.ts` | +11 | -1 | 12 | apps/desktop | [diff](diffs/apps--desktop--electron--app-store-composer.ts.diff) |
| 28 | `apps/desktop/electron/app-store-workspace.ts` | +12 | -0 | 12 | apps/desktop | [diff](diffs/apps--desktop--electron--app-store-workspace.ts.diff) |
| 29 | `apps/desktop/src/sidebar.tsx` | +11 | -1 | 12 | apps/desktop | [diff](diffs/apps--desktop--src--sidebar.tsx.diff) |
| 30 | `apps/desktop/tests/harness.ts` | +12 | -0 | 12 | apps/desktop | [diff](diffs/apps--desktop--tests--harness.ts.diff) |
| 31 | `packages/pi-sdk-driver/src/runtime-command-utils.ts` | +11 | -0 | 11 | packages/pi-sdk-driver | [diff](diffs/packages--pi-sdk-driver--src--runtime-command-utils.ts.diff) |
| 32 | `apps/desktop/src/timeline-types.ts` | +1 | -9 | 10 | apps/desktop | [diff](diffs/apps--desktop--src--timeline-types.ts.diff) |
| 33 | `packages/pi-sdk-driver/src/pi-sdk-driver.ts` | +9 | -0 | 9 | packages/pi-sdk-driver | [diff](diffs/packages--pi-sdk-driver--src--pi-sdk-driver.ts.diff) |
| 34 | `packages/session-driver/src/index.ts` | +8 | -0 | 8 | packages/session-driver | [diff](diffs/packages--session-driver--src--index.ts.diff) |
| 35 | `apps/desktop/electron/preload.ts` | +7 | -0 | 7 | apps/desktop | [diff](diffs/apps--desktop--electron--preload.ts.diff) |
| 36 | `apps/desktop/src/hooks/use-slash-menu.tsx` | +4 | -2 | 6 | apps/desktop | [diff](diffs/apps--desktop--src--hooks--use-slash-menu.tsx.diff) |
| 37 | `packages/pi-sdk-driver/src/index.ts` | +6 | -0 | 6 | packages/pi-sdk-driver | [diff](diffs/packages--pi-sdk-driver--src--index.ts.diff) |
| 38 | `apps/desktop/electron/app-store-internals.ts` | +4 | -0 | 4 | apps/desktop | [diff](diffs/apps--desktop--electron--app-store-internals.ts.diff) |
| 39 | `apps/desktop/src/topbar.tsx` | +3 | -1 | 4 | apps/desktop | [diff](diffs/apps--desktop--src--topbar.tsx.diff) |
