/**
 * Regression test for Issue #1 / #2 — process duplication & session multiplication.
 *
 * After the upstream extensions merge, toggling skills/extensions or creating
 * sessions could spawn duplicate pi processes or multiply sessions.  These
 * tests verify that session counts stay sane through create → toggle → reload
 * cycles.
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "@playwright/test";
import {
  assertExists,
  createSession,
  getDesktopState,
  launchDesktop,
  makeWorkspace,
  writeProjectExtension,
  type PiAppWindow,
} from "./harness";
import type { PiDesktopApi } from "../src/ipc";

// Minimal extension that registers a command and sets a title
const extensionSource = String.raw`
export default function regressionExtension(pi) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setTitle("Regression Test");
    ctx.ui.setStatus("regression-status", "Ready");
  });

  pi.registerCommand("noop", {
    description: "No-op command for regression testing",
    handler: async (_args, _ctx) => {},
  });
}
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return session count for a workspace, asserting the workspace exists. */
function sessionCountForWorkspace(
  state: Awaited<ReturnType<PiDesktopApi["getState"]>>,
  workspaceId: string,
): number {
  const ws = state.workspaces.find((w) => w.id === workspaceId);
  assertExists(ws, `workspace ${workspaceId} not found in state`);
  return ws.sessions.length;
}

/** Collect all session IDs for a workspace. */
function sessionIdsForWorkspace(
  state: Awaited<ReturnType<PiDesktopApi["getState"]>>,
  workspaceId: string,
): string[] {
  const ws = state.workspaces.find((w) => w.id === workspaceId);
  assertExists(ws, `workspace ${workspaceId} not found in state`);
  return ws.sessions.map((s) => s.id);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test("creating a session does not produce duplicate sessions", async () => {
  test.setTimeout(60_000);
  const userDataDir = await mkdtemp(join(tmpdir(), "pi-gui-regression-"));
  const workspacePath = await makeWorkspace("regression-create");
  const harness = await launchDesktop(userDataDir, [workspacePath]);

  try {
    const window = await harness.firstWindow();
    const state0 = await getDesktopState(window);
    const ws = state0.workspaces[0];
    assertExists(ws, "Expected workspace");
    expect(ws.sessions.length).toBe(0);

    // Create first session
    await createSession(window, ws.id, "Session A");
    const state1 = await getDesktopState(window);
    expect(sessionCountForWorkspace(state1, ws.id)).toBe(1);

    // Create second session
    await createSession(window, ws.id, "Session B");
    const state2 = await getDesktopState(window);
    expect(sessionCountForWorkspace(state2, ws.id)).toBe(2);

    // Verify no duplicate IDs
    const ids = sessionIdsForWorkspace(state2, ws.id);
    expect(new Set(ids).size).toBe(ids.length);
  } finally {
    await harness.close();
  }
});

test("toggling extension enabled/disabled does not multiply sessions", async () => {
  test.setTimeout(60_000);
  const userDataDir = await mkdtemp(join(tmpdir(), "pi-gui-regression-"));
  const workspacePath = await makeWorkspace("regression-toggle");
  const extPath = await writeProjectExtension(workspacePath, "regression-ext.ts", extensionSource);
  const harness = await launchDesktop(userDataDir, [workspacePath]);

  try {
    const window = await harness.firstWindow();
    const state0 = await getDesktopState(window);
    const ws = state0.workspaces[0];
    assertExists(ws, "Expected workspace");

    // Create a session (extension binds on session_start)
    await createSession(window, ws.id, "Toggle test");
    const state1 = await getDesktopState(window);
    const countBefore = sessionCountForWorkspace(state1, ws.id);
    expect(countBefore).toBe(1);
    const idsBefore = sessionIdsForWorkspace(state1, ws.id);

    // Toggle extension OFF then ON via IPC
    const relPath = extPath.replace(workspacePath, "").replace(/\\/g, "/").replace(/^\//, "");
    await window.evaluate(
      async ({ workspaceId, filePath }) => {
        const app = (window as PiAppWindow).piApp!;
        await app.setExtensionEnabled(workspaceId, filePath, false);
      },
      { workspaceId: ws.id, filePath: relPath },
    );

    const stateDisabled = await getDesktopState(window);
    expect(sessionCountForWorkspace(stateDisabled, ws.id)).toBe(countBefore);

    await window.evaluate(
      async ({ workspaceId, filePath }) => {
        const app = (window as PiAppWindow).piApp!;
        await app.setExtensionEnabled(workspaceId, filePath, true);
      },
      { workspaceId: ws.id, filePath: relPath },
    );

    const stateEnabled = await getDesktopState(window);
    expect(sessionCountForWorkspace(stateEnabled, ws.id)).toBe(countBefore);

    // Session IDs must be stable across toggle
    const idsAfter = sessionIdsForWorkspace(stateEnabled, ws.id);
    expect(idsAfter).toEqual(idsBefore);
  } finally {
    await harness.close();
  }
});

test("toggling skill commands does not multiply sessions", async () => {
  test.setTimeout(60_000);
  const userDataDir = await mkdtemp(join(tmpdir(), "pi-gui-regression-"));
  const workspacePath = await makeWorkspace("regression-skill-toggle");

  // Write a minimal skill
  await mkdir(join(workspacePath, ".agents", "skills", "demo-skill"), { recursive: true });
  await writeFile(
    join(workspacePath, ".agents", "skills", "demo-skill", "SKILL.md"),
    "# Demo Skill\n\nUse this skill for demo.\n",
    "utf8",
  );

  const harness = await launchDesktop(userDataDir, [workspacePath]);

  try {
    const window = await harness.firstWindow();
    const state0 = await getDesktopState(window);
    const ws = state0.workspaces[0];
    assertExists(ws, "Expected workspace");

    await createSession(window, ws.id, "Skill toggle test");
    const state1 = await getDesktopState(window);
    const countBefore = sessionCountForWorkspace(state1, ws.id);
    expect(countBefore).toBe(1);
    const idsBefore = sessionIdsForWorkspace(state1, ws.id);

    // Toggle skill commands OFF then ON via IPC
    await window.evaluate(
      async (wid) => {
        const app = (window as PiAppWindow).piApp!;
        await app.setEnableSkillCommands(wid, false);
      },
      ws.id,
    );

    const stateOff = await getDesktopState(window);
    expect(sessionCountForWorkspace(stateOff, ws.id)).toBe(countBefore);

    await window.evaluate(
      async (wid) => {
        const app = (window as PiAppWindow).piApp!;
        await app.setEnableSkillCommands(wid, true);
      },
      ws.id,
    );

    const stateOn = await getDesktopState(window);
    expect(sessionCountForWorkspace(stateOn, ws.id)).toBe(countBefore);
    expect(sessionIdsForWorkspace(stateOn, ws.id)).toEqual(idsBefore);
  } finally {
    await harness.close();
  }
});

test("refreshRuntime does not duplicate sessions", async () => {
  test.setTimeout(60_000);
  const userDataDir = await mkdtemp(join(tmpdir(), "pi-gui-regression-"));
  const workspacePath = await makeWorkspace("regression-refresh");
  await writeProjectExtension(workspacePath, "regression-ext.ts", extensionSource);
  const harness = await launchDesktop(userDataDir, [workspacePath]);

  try {
    const window = await harness.firstWindow();
    const state0 = await getDesktopState(window);
    const ws = state0.workspaces[0];
    assertExists(ws, "Expected workspace");

    // Create two sessions to verify multi-session stability
    await createSession(window, ws.id, "Refresh A");
    await createSession(window, ws.id, "Refresh B");
    const state1 = await getDesktopState(window);
    expect(sessionCountForWorkspace(state1, ws.id)).toBe(2);
    const idsBefore = sessionIdsForWorkspace(state1, ws.id);

    // Trigger refreshRuntime multiple times
    for (let i = 0; i < 3; i++) {
      await window.evaluate(
        async (wid) => {
          const app = (window as PiAppWindow).piApp!;
          await app.refreshRuntime(wid);
        },
        ws.id,
      );
    }

    const stateAfter = await getDesktopState(window);
    expect(sessionCountForWorkspace(stateAfter, ws.id)).toBe(2);
    expect(sessionIdsForWorkspace(stateAfter, ws.id)).toEqual(idsBefore);
  } finally {
    await harness.close();
  }
});
