# `pi.exe` Spawn Paths — Full Audit

Where and how the desktop app spawns `pi.exe` child processes, and why a
fresh-install open spawns multiple processes immediately.

**Audited**: 2026-03-28 (second pass)  
**Branch**: `merge/upstream-extensions`

---

## 1. The actual spawn point (2 sites)

All `pi.exe` processes originate from `createAgentSession()` (imported from
`@mariozechner/pi-coding-agent`).  The SDK driver wraps it in
`this.createAgentSessionImpl(...)` inside **`SessionSupervisor`**:

| # | Spawn site | File | Line | Trigger |
|---|---|---|---|---|
| S1 | `createSession()` | `packages/pi-sdk-driver/src/session-supervisor.ts` | ~310 | Brand-new session (user clicks "New Session" or `createSession` IPC) |
| S2 | `openRecord()` | `packages/pi-sdk-driver/src/session-supervisor.ts` | ~610 | Re-opening an existing session from disk (via `ensureRecord()`) |

`openRecord()` is only reachable through `ensureRecord()`, which checks for a
live in-memory record first and coalesces concurrent opens for the same key
via `pendingOpen`.

---

## 2. Methods that call `ensureRecord()` → `openRecord()` → spawn (9 call sites)

All in `packages/pi-sdk-driver/src/session-supervisor.ts`:

| # | Line | Method | When it fires |
|---|------|--------|---------------|
| E1 | 280 | `getTranscript()` | Loading transcript for a session not yet in memory — **can spawn** |
| E2 | 297 | `respondToHostUiRequest()` | Responding to an extension UI prompt |
| E3 | 340 | `openSession()` | App-store subscribes or selects a session — **main cold-start vector** |
| E4 | 361 | `updateArchivedState()` | Archiving / unarchiving a session |
| E5 | 426 | `sendUserMessage()` | User sends a prompt |
| E6 | 440 | `setSessionModel()` | User changes the model |
| E7 | 451 | `setSessionThinkingLevel()` | User changes thinking level |
| E8 | 467 | `renameSession()` | User renames a session |
| E9 | 483 | `compactSession()` | User compacts context |

---

## 3. Desktop app-store paths that reach the spawn points

### 3a. Cold-start initialization — the path that fires on every app open

`apps/desktop/electron/main.ts` → `app.whenReady()` → `store.initialize()`:

```
main.ts:154  →  store = new DesktopAppStore(...)
main.ts:157  →  await store.initialize()
```

Inside `app-store.ts` `initializeInternal()`:

```
Line ~420:  persisted = readPersistedUiState()        // reads ui-state.json
Line ~427:  migrateLegacyPersistence(persisted)
Line ~435:  driver.syncWorkspace(...)                  // for each known workspace
Line ~439:  driver.resetRunningStatuses()              // resets "running" → "idle"
Line ~442:  refreshState({ selectedSessionId, ... })   // ← triggers the chain
```

### 3b. `refreshState()` internals (the actual spawn trigger)

`refreshStateInternal()` at line ~505:

```
Line ~510:  [workspaces, sessions] = listWorkspaces() + listSessions()
Line ~517:  ensureSubscriptionsForSessions(sessions)
              → for each session with status === "running": ensureSessionReady()
Line ~534:  ensureSessionReady(selectedSession)        // ← ALWAYS runs for selected session
```

**`ensureSessionReady()`** at line ~613:

```
Line ~614:  ensureTranscriptLoaded(sessionRef)
              → if no cached transcript → driver.getTranscript()
                → SessionSupervisor.getTranscript()
                  → ensureRecord() → openRecord() → SPAWN [E1]
Line ~616:  driver.openSession(sessionRef)             // ← SPAWN [E3]
              → SessionSupervisor.openSession()
                → ensureRecord() → openRecord() → createAgentSessionImpl()
Line ~619:  ensureSessionSubscribed(sessionRef)
              → driver.subscribe() → fires bootstrap sessionUpdated event
Line ~620:  refreshSessionCommands(sessionRef)
```

### 3c. Spawn path 1: Selected session on cold start

Even on a **fresh install with zero sessions**, the first time you create a
session it gets persisted as `selectedSessionId`.  On the next app open:

1. `resetRunningStatuses()` marks everything "idle" ✓
2. `refreshState({ selectedSessionId })` runs
3. `ensureSubscriptionsForSessions()` skips (nothing is "running") ✓
4. But `ensureSessionReady(selectedSession)` **always** runs for the selected
   session — this calls `driver.openSession()` → **spawns `pi.exe`** [S2]

**This is legitimate** — one spawn for the selected session. But it means
there is always at least 1 spawn on every cold start when you have any
session history.

### 3d. Spawn path 2: Transcript loading can spawn a second process

Inside `ensureSessionReady()`, `ensureTranscriptLoaded()` runs **before**
`openSession()`.  If there's no cached transcript file on disk:

```
cachedTranscript = transcriptStore.read(key)  // null on fresh transcript store
transcript = driver.getTranscript(sessionRef) // ← calls ensureRecord → SPAWN [E1]
```

This spawns `pi.exe` **just to read messages** from the session file.  Then
`openSession()` runs — which calls `ensureRecord()` again, but since the
first spawn is still in `pendingOpen`, it coalesces.  So this doesn't double-
spawn for the **same** session, but it does invoke the spawn machinery early.

### 3e. Spawn path 3: The reentry regression (now fixed)

After `openSession()`, `ensureSessionSubscribed()` fires.
`supervisor.subscribe()` immediately invokes the listener with a bootstrap
`sessionUpdated` event.  `handleSessionEvent()` sees `!knownSession` (because
`refreshState` hasn't rebuilt `this.state` yet) and triggers another full
`refreshState()`.  That re-walks the catalog, re-opens sessions, and spawns
more processes.

**Fix applied**: `refreshCatalogSessionKeys` tracks sessions in the current
refresh so `handleSessionEvent()` skips recovery for them.

### 3f. Spawn path 4: Multiple sessions across workspaces

If the user has N workspaces each with sessions that were "running" at last
close:
- `resetRunningStatuses()` should catch them all
- But `ensureSessionReady(selectedSession)` still opens the selected one
- On workspace switches, `selectWorkspace()` → `refreshState()` → opens the
  selected session in the new workspace → another spawn

### 3g. All `refreshState()` call sites (each re-enters 3b)

| File | Lines | Trigger |
|------|-------|---------|
| `app-store.ts` | 294, 384 | IPC retry / generic refresh |
| `app-store.ts` | 442 | Cold-start init |
| `app-store-composer.ts` | 131, 413 | Composer submit / response |
| `app-store-worktree.ts` | 37, 65, 103, 115, 117 | Worktree create / switch / delete |
| `app-store-workspace.ts` | 44, 67, 80, 116, 133, 193, 221, 234, 257 | Workspace CRUD, archiving, navigation |

### 3h. Direct `createSession()` IPC (bypasses `ensureRecord`)

`apps/desktop/electron/main.ts` line 254–255:

```
ipcMain.handle(desktopIpc.createSession, (_event, input) =>
  store.createSession(input),
);
```

→ `SessionSupervisor.createSession()` → `createAgentSessionImpl()` [S1]

---

## 4. Guards against duplicate spawns

| # | Guard | Location | What it does |
|---|-------|----------|-------------|
| G1 | `pendingOpen` map | `session-supervisor.ts` ~128 | Coalesces concurrent `ensureRecord()` calls for the **same** session key |
| G2 | `refreshStatePromise` serialisation | `app-store.ts` ~485 | Serialises overlapping `refreshState()` calls (while-loop) |
| G3 | `resetRunningStatuses()` | `app-store.ts` ~439 | On cold start, resets "running" → "idle" so `ensureSubscriptionsForSessions` doesn't mass-open |
| G4 | `refreshCatalogSessionKeys` | `app-store.ts` ~83 | Suppresses unknown-session recovery for sessions in the in-flight catalog snapshot |
| G5 | `getSessionCommands()` early return | `session-supervisor.ts` ~285 | Returns `[]` for sessions not already open, avoiding a spawn just to read commands |
| G6 | `ensureRecord()` existing check | `session-supervisor.ts` ~569 | Returns immediately if record exists, has a session, and is not closed |

### Guard gaps

- **G1 only protects same-key concurrency.** Different sessions open in
  parallel will each spawn.
- **G3 only runs once at init.** If a session gets marked "running" later
  (via event during refresh), subsequent refreshes re-open it.
- **G4 was missing before the upstream merge fix.** Without it, bootstrap
  events during refresh triggered cascading refreshState → cascading spawns.
- **No guard on `ensureSessionReady` for the selected session.** Even when
  `ensureSubscriptionsForSessions` correctly skips (all idle), the selected
  session is always opened.

---

## 5. Why a fresh-install open spawns `pi.exe` processes

### Scenario: First launch after installation (no session history)

No sessions → no spawns on the first launch. The first `pi.exe` spawns when
the user creates a session (via "New Session" → `createSession` IPC → S1).

### Scenario: Second launch (one session exists)

1. `initializeInternal()` reads `ui-state.json` with `selectedSessionId`
2. `resetRunningStatuses()` runs (session is likely "idle" anyway)
3. `refreshState({ selectedSessionId })` runs
4. `ensureSubscriptionsForSessions()` skips (session is "idle") ✓
5. `ensureSessionReady(selectedSession)` runs:
   - `ensureTranscriptLoaded()` → has cached transcript → no spawn ✓
   - `driver.openSession()` → `ensureRecord()` → no existing record →
     `openRecord()` → **spawns 1 `pi.exe`**
6. Total: **1 `pi.exe` process** (legitimate)

### Scenario: Launch with session left "running" + reentry bug (pre-fix)

1. Session was "running" when app was last closed
2. `resetRunningStatuses()` marks it "idle"
3. `refreshState()` runs → `ensureSessionReady(selectedSession)` →
   `openSession()` → spawn #1
4. `ensureSessionSubscribed()` → `subscribe()` fires bootstrap event
5. `handleSessionEvent()` sees unknown session → triggers `refreshState()` #2
6. `refreshState()` #2 finishes, rebuilds state
7. But subscriber events from spawn #1 are still flowing — more events for
   "unknown" sessions → more `refreshState()` → more spawns
8. **Result: 3–6+ `pi.exe` processes**

### Scenario: Launch with multiple workspaces, each with sessions

Each workspace's selected session gets opened on workspace selection.
If the user switches workspaces rapidly: N spawns (one per selected session).
Previously-opened sessions remain alive; they are only closed on prune.

---

## 6. Non-`pi.exe` child processes (not relevant to the bug)

These spawn git / explorer / ffmpeg — **not** `pi.exe`:

| File | Binary | Purpose |
|------|--------|---------|
| `app-store-files.ts` | `explorer` | Open file in OS file explorer |
| `app-store-diff.ts` | `git` | Git diff operations (5 call sites) |
| `worktree-manager.ts` | `git` | Git worktree operations |
| `scripts/capture-showcase.mts` | `ffmpeg` | Video capture tooling |
| `scripts/readme-demo.mts` | `ffmpeg` | Demo video generation |

---

## 7. Summary of spawn sources on cold start

| What | Spawns `pi.exe`? | When |
|------|-----------------|------|
| Selected session open | **Yes (1)** | Always, if a selectedSessionId exists in persisted state |
| "Running" sessions subscription | **Yes (N)** | Only if `resetRunningStatuses()` fails or sessions re-marked running |
| Transcript load (no cache) | **Coalesced** | Merges with the openSession spawn via `pendingOpen` |
| Bootstrap event reentry | **Yes (unbounded)** | Pre-fix only; now blocked by `refreshCatalogSessionKeys` guard |
| Non-selected idle sessions | **No** | Only opened on user interaction |
| `createSession()` IPC | **Yes (1)** | Only on explicit user action |
