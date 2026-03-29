import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test, type Page } from "@playwright/test";
import { assertExists, createSession, getDesktopState, launchDesktop, makeWorkspace, writeProjectExtension } from "./harness";

const extensionSource = String.raw`
export default function demoExtension(pi) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setTitle("Extension Surface");
    ctx.ui.setStatus("demo-status", "Demo ready");
    ctx.ui.setWidget("demo-widget", ["Demo widget line"]);
    ctx.ui.setWidget("demo-widget-below", ["Below widget line"], { placement: "belowEditor" });
  });

  pi.registerCommand("settings", {
    description: "Runtime settings command",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Runtime settings command", "info");
    },
  });

  pi.registerCommand("prefill-demo", {
    description: "Prefill the composer",
    handler: async (_args, ctx) => {
      ctx.ui.setEditorText("Prefilled from extension");
      ctx.ui.notify("Composer prefilled", "info");
    },
  });
}
`;

async function expandDock(window: Page) {
  const toggle = window.getByTestId("extension-dock-toggle");
  await toggle.click();
  return window.getByTestId("extension-dock-body");
}

test("manages extensions and prefers runtime commands over colliding host actions", async () => {
  test.setTimeout(60_000);
  const userDataDir = await mkdtemp(join(tmpdir(), "pi-gui-user-data-"));
  const workspacePath = await makeWorkspace("extensions-workspace");
  await writeProjectExtension(workspacePath, "demo-extension.ts", extensionSource);

  const harness = await launchDesktop(userDataDir, [workspacePath]);

  try {
    const window = await harness.firstWindow();
    const state = await getDesktopState(window);
    const workspace = state.workspaces[0];
    assertExists(workspace, "Expected workspace");
    await createSession(window, workspace.id, "Extension session");

    // Extension lifecycle: load → compile → session_start → setTitle/setStatus → IPC → render.
    // On slower machines this chain can exceed the default 5 s assertion timeout.
    await expect(window.locator(".topbar__session")).toHaveText("Extension Surface", { timeout: 15_000 });
    await expect(window.getByTestId("extension-dock")).toBeVisible({ timeout: 15_000 });

    // The dock summary shows the first status by insertion order.  The pi
    // runtime may inject its own statuses (e.g. "companion", "watchdog")
    // before the user extension's session_start handler fires, so the
    // summary text is non-deterministic.  Verify the dock is present and
    // then assert the user-extension status in the expanded body instead.
    await expect(window.getByTestId("extension-dock-summary")).not.toHaveText("", { timeout: 15_000 });
    await expect(window.getByTestId("extension-status-strip")).toHaveCount(0);
    await expect(window.getByTestId("extension-widget-rail")).toHaveCount(0);
    const dockBody = await expandDock(window);
    await expect(dockBody).toContainText("demo-status: Demo ready");
    await expect(dockBody).toContainText("demo-widget:");
    await expect(dockBody).toContainText("Demo widget line");
    await expect(dockBody).toContainText("demo-widget-below:");
    await expect(dockBody).toContainText("Below widget line");

    await window.getByRole("button", { name: "Extensions", exact: true }).click();
    await expect(window.getByTestId("extensions-surface")).toBeVisible();
    const extensionsList = window.getByTestId("extensions-list");
    const extensionCard = extensionsList.getByRole("button", { name: /demo-extension/i });
    await expect(extensionCard).toBeVisible();
    await extensionCard.click();
    await expect(window.locator(".skill-detail")).toContainText("settings");
    await expect(window.locator(".skill-detail")).toContainText("prefill-demo");

    await window.getByRole("button", { name: "Disable", exact: true }).click();
    await expect(window.locator(".skill-detail__status")).toHaveText("Disabled");
    await window.getByRole("button", { name: "Back to app", exact: true }).click();
    await expect(window.locator(".topbar__session")).toHaveText("Extension session");
    // After disabling the user extension, its statuses/widgets are removed.
    // The pi runtime may keep its own built-in statuses ("companion",
    // "watchdog") alive, so the dock can remain visible.  Verify the
    // user-extension content ("Demo ready") is no longer displayed.
    const dockAfterDisable = window.getByTestId("extension-dock");
    if (await dockAfterDisable.count() > 0) {
      await expect(dockAfterDisable).not.toContainText("Demo ready", { timeout: 10_000 });
    }
    const composer = window.getByTestId("composer");
    await composer.fill("/settings");
    const disabledSlashMenu = window.getByTestId("slash-menu");
    await expect(disabledSlashMenu).toContainText("Host Actions");
    await disabledSlashMenu.getByRole("button", { name: /settings/i }).click();
    await expect(window.getByTestId("settings-surface")).toBeVisible();
    await window.getByRole("button", { name: "Back to app", exact: true }).click();

    await window.getByRole("button", { name: "Extensions", exact: true }).click();
    await extensionCard.click();
    await window.getByRole("button", { name: "Enable", exact: true }).click();
    await expect(window.locator(".skill-detail__status")).toHaveText("Enabled");
    await window.getByRole("button", { name: "Back to app", exact: true }).click();
    await expect(window.locator(".topbar__session")).toHaveText("Extension Surface", { timeout: 15_000 });
    await expect(window.getByTestId("extension-dock-summary")).not.toHaveText("", { timeout: 15_000 });
    await expect(window.getByTestId("extension-dock-body")).toHaveCount(0);

    await composer.fill("/settings");
    const slashMenu = window.getByTestId("slash-menu");
    await expect(slashMenu).toContainText("Runtime Commands");
    await expect(slashMenu).toContainText("Host Actions");

    await composer.fill("/settings ");
    await composer.press("Enter");
    await expect(window.getByTestId("settings-surface")).toHaveCount(0);
    await expect(window.locator(".timeline")).toContainText("Runtime settings command");

    await composer.fill("/prefill-demo ");
    await composer.press("Enter");
    await expect(composer).toHaveValue("Prefilled from extension");
    await expect(window.locator(".timeline")).toContainText("Composer prefilled");
  } finally {
    await harness.close();
  }
});
