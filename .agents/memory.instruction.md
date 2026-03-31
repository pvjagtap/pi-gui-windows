---
applyTo: '**'
---

# Coding Preferences
- Verify review artifacts against current code before trusting generated diffs; this repo often has local mitigation work in the tree.

# Project Architecture
- `apps/desktop/electron/app-store.ts` owns refresh/subscription orchestration for live sessions.
- `packages/pi-sdk-driver/src/session-supervisor.ts` is the only local path that reopens persisted sessions and binds extension runtime behavior.

# Solutions Repository
- Process-multiplication regression after the upstream extensions merge was caused by `handleSessionEvent()` reentering `refreshState()` for sessions already present in the active catalog snapshot during startup bootstrap.
- Fix pattern: track catalog session keys for the in-flight refresh and suppress unknown-session recovery for those keys; keep normal recovery for truly new sessions.