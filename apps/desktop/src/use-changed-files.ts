import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PiDesktopApi } from "./ipc";
import type { TranscriptMessage } from "./desktop-state";

export interface ChangedFile {
  readonly path: string;
  readonly status: "added" | "modified" | "deleted" | "untracked";
}

/** Tool names that indicate a file write/edit operation. */
const FILE_MUTATION_TOOLS = /^(write|edit|edit-diff|create|multiEdit|multi_edit|patch)$/i;

function extractEditedFiles(transcript: readonly TranscriptMessage[]): readonly ChangedFile[] {
  const seen = new Set<string>();
  const result: ChangedFile[] = [];
  for (const msg of transcript) {
    if (msg.kind !== "tool" || msg.status === "running") continue;
    if (!FILE_MUTATION_TOOLS.test(msg.toolName)) continue;
    const input = msg.input as Record<string, unknown> | undefined;
    const filePath =
      typeof input?.path === "string" ? input.path :
      typeof input?.filePath === "string" ? input.filePath :
      typeof input?.file_path === "string" ? input.file_path :
      undefined;
    if (!filePath || seen.has(filePath)) continue;
    seen.add(filePath);
    result.push({ path: filePath, status: "modified" });
  }
  return result;
}

export function useChangedFiles(
  api: PiDesktopApi | undefined,
  workspaceId: string | undefined,
  sessionStatus: string | undefined,
  transcript: readonly TranscriptMessage[],
) {
  const [gitFiles, setGitFiles] = useState<readonly ChangedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffText, setDiffText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGit, setHasGit] = useState(true);

  const sessionFiles = useMemo(() => extractEditedFiles(transcript), [transcript]);

  const files = useMemo(() => {
    if (gitFiles.length === 0) return sessionFiles;
    const gitByPath = new Map(gitFiles.map((gf) => [gf.path, gf]));
    return sessionFiles.map((sf) => gitByPath.get(sf.path) ?? sf);
  }, [sessionFiles, gitFiles]);

  const refresh = useCallback(() => {
    if (!workspaceId || !api) return;
    setLoading(true);
    void api.getChangedFiles(workspaceId).then((result) => {
      setGitFiles(result);
      setHasGit(true);
      setSelectedFile((current) => {
        if (current && !sessionFiles.some((f) => f.path === current)) {
          return null;
        }
        return current;
      });
      setLoading(false);
    }).catch(() => {
      setHasGit(false);
      setLoading(false);
    });
  }, [api, workspaceId, sessionFiles]);

  // Auto-refresh when session transitions from running to idle/failed
  const prevStatusRef = useRef(sessionStatus);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = sessionStatus;
    if (prev === "running" && sessionStatus !== "running") {
      refresh();
    }
  }, [sessionStatus, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [workspaceId, refresh]);

  // Fetch diff when file selected
  useEffect(() => {
    if (!selectedFile || !workspaceId || !api) {
      setDiffText("");
      return;
    }
    void api.getFileDiff(workspaceId, selectedFile).then(setDiffText).catch(() => setDiffText(""));
  }, [api, workspaceId, selectedFile]);

  const handleStage = useCallback((filePath: string) => {
    if (!workspaceId || !api) return;
    void api.stageFile(workspaceId, filePath).then(refresh);
  }, [api, workspaceId, refresh]);

  const handleDiscard = useCallback((filePath: string) => {
    if (!workspaceId || !api) return;
    void api.discardFile(workspaceId, filePath).then(() => {
      if (selectedFile === filePath) setSelectedFile(null);
      refresh();
    });
  }, [api, workspaceId, selectedFile, refresh]);

  return {
    files,
    selectedFile,
    setSelectedFile,
    diffText,
    loading,
    hasGit,
    refresh,
    handleStage,
    handleDiscard,
  };
}

export function shortenPath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : path;
}
