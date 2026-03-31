import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface DirectoryEntry {
  readonly name: string;
  readonly type: "file" | "directory";
}

const fileCache = new Map<string, { files: string[]; timestamp: number }>();
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 20;

export function listWorkspaceFiles(workspacePath: string): Promise<string[]> {
  const cached = fileCache.get(workspacePath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.files);
  }

  return new Promise((resolve) => {
    execFile(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { cwd: workspacePath, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        const files = stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .sort();
        if (fileCache.size >= CACHE_MAX_ENTRIES) {
          const oldest = fileCache.keys().next().value;
          if (oldest !== undefined) {
            fileCache.delete(oldest);
          }
        }
        fileCache.set(workspacePath, { files, timestamp: Date.now() });
        resolve(files);
      },
    );
  });
}

const IGNORED_NAMES = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv",
  ".next", "dist", "build", ".cache", ".turbo",
]);

export async function listDirectory(
  workspacePath: string,
  relativePath?: string,
): Promise<DirectoryEntry[]> {
  const targetDir = relativePath ? join(workspacePath, relativePath) : workspacePath;
  const entries = await readdir(targetDir, { withFileTypes: true });

  return entries
    .filter((e) => !e.name.startsWith(".") && !IGNORED_NAMES.has(e.name))
    .map((e) => ({
      name: e.name,
      type: (e.isDirectory() ? "directory" : "file") as "directory" | "file",
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}
