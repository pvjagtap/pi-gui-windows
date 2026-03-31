# Review Methodology — Expanded Scope

Detailed checklists for expanded review areas. Load this file only when the user requests deeper analysis beyond the standard review.

## Concurrency & Race Conditions

Look for:
- **Shared mutable state** accessed from multiple async paths without synchronization
- **`Promise.all` / parallel loops** that modify the same data structure or trigger side effects
- **Fire-and-forget** patterns (`void somePromise()`) where the detached operation can interleave with subsequent calls
- **Missing serialization** — async methods called concurrently that should be queued (e.g. state refresh, session open)
- **Check-then-act** — reading a value, making a decision, then writing back without atomicity

Red flags in diffs:
```
+ void someAsyncOperation();          // fire-and-forget — who handles errors? what if called again?
+ await Promise.all(items.map(...))   // are the items independent? do they share state?
+ if (!this.cache.has(key)) {         // another caller might be between this check and the set
+   this.cache.set(key, await load())
+ }
```

Fix patterns:
- Coalescing map: `if (inflight.has(key)) return inflight.get(key)` — share in-flight promises
- Serialization: queue concurrent calls so each waits for the prior one to finish
- Mutex/lock: guard critical sections (language-dependent)

## Resource Lifecycle

Look for:
- **Created but never closed** — processes, file handles, DB connections, subscriptions, timers
- **Error paths that skip cleanup** — `try` without `finally`, early returns before `.close()`
- **Accumulation** — resources added to a Map/Set/Array that never gets pruned or evicted
- **Orphaned references** — old entry removed from a lookup but underlying resource still running

Red flags in diffs:
```
+ this.records.set(key, await openSession())  // is there a delete path? does it call closeSession?
+ const handle = fs.open(path)                // where is handle.close()?
+ setInterval(fn, 1000)                       // where is clearInterval?
```

Fix patterns:
- Pair every create with a destroy in a `finally` block or cleanup method
- Prune stale entries on a lifecycle boundary (workspace switch, session end)
- Use disposable/using patterns where the language supports them

## Event Cascades & Infinite Loops

Look for:
- **Handler → emit → handler** — event handler that emits another event caught by the same or related handler
- **Recovery triggers** — error/unknown-state handler that triggers a refresh, which triggers the same condition
- **Async replay** — replaying saved state fires events that arrive at handlers before the replay is finished
- **Unbounded retry** — retry loops without backoff, max attempts, or circuit breaker

Red flags in diffs:
```
+ this.emit("updated")                                    // who handles "updated"? does it emit again?
+ void Promise.resolve(listener(event)).catch(() => {})   // async event replay — arrives out of order
+ if (!knownSession) { await this.refreshState() }        // refresh might trigger more unknown events
```

Fix patterns:
- Exclude replay/recovery events from handlers that trigger more recovery
- Add re-entry guards (`if (this.isRefreshing) return`)
- Serialize state refreshes so they don't cascade

## Security

Look for:
- **Injection** — user input concatenated into SQL, shell commands, HTML, templates, file paths
- **Input validation** — new endpoints or IPC channels that accept external data without validation
- **Auth/authz** — new operations that bypass existing access control checks
- **Path traversal** — file operations using user-supplied paths without sanitization
- **SSRF** — server-side HTTP requests using user-supplied URLs
- **Secrets in logs** — tokens, passwords, keys logged to console or files
- **Deserialization** — JSON.parse or equivalent on untrusted input without schema validation

## Performance & Scalability

Look for:
- **O(N²) or worse** — nested loops over collections, repeated linear scans, full-state rebuilds per item
- **Unbounded growth** — Maps, arrays, caches that grow without limit or eviction
- **Hot-path I/O** — disk reads, network calls, or DB queries on every keystroke/event/render
- **Blocking the main thread** — synchronous I/O or heavy computation in event loop / UI thread
- **Redundant work** — same computation repeated on every call when result could be cached or memoized

## Cross-File Interaction Tracing

When to do this:
- A change in file A calls a function in file B that emits an event handled in file C
- Multiple files modify the same shared state (store, cache, database)
- New event types introduced that connect previously independent modules

How to trace:
1. Start from the changed function in the diff
2. Find all callers (grep for the function name across the codebase)
3. Find all callees (what does the function call? do those emit events?)
4. Map the full chain: trigger → handler → side effect → downstream handler
5. Look for cycles or unexpected paths in the chain
6. Check if guards/serialization exist at each boundary

Document traces as:
```
User clicks confirm
  → renderer: handleRespondToExtensionDialog()
    → IPC: api.respondToHostUiRequest()
      → main: DesktopAppStore.respondToHostUiRequest()
        → driver: SessionSupervisor.respondToHostUiRequest()
        → app-store: syncDerivedSessionState() + emit()
```
