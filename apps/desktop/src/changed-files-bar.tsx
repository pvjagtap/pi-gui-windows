import { useState } from "react";
import type { ChangedFile } from "./use-changed-files";
import { shortenPath } from "./use-changed-files";
import { ChevronRightIcon, RefreshIcon } from "./icons";

interface ChangedFilesBarProps {
  readonly files: readonly ChangedFile[];
  readonly hasGit: boolean;
  readonly loading: boolean;
  readonly onRefresh: () => void;
  readonly onOpenFile: (filePath: string) => void;
  readonly onStage: (filePath: string) => void;
  readonly onDiscard: (filePath: string) => void;
}

export function ChangedFilesBar({
  files,
  hasGit,
  loading,
  onRefresh,
  onOpenFile,
  onStage,
  onDiscard,
}: ChangedFilesBarProps) {
  const [open, setOpen] = useState(false);

  if (files.length === 0) return null;

  return (
    <div className={`changed-files-bar ${open ? "changed-files-bar--open" : ""}`}>
      {open ? (
        <div className="changed-files-bar__list">
          {files.map((file) => (
            <div className="changed-files-bar__file" key={file.path}>
              <button
                className="changed-files-bar__file-name"
                type="button"
                onClick={() => onOpenFile(file.path)}
              >
                <span className={`diff-panel__status-dot diff-panel__status-dot--${file.status}`} />
                <span>{shortenPath(file.path)}</span>
              </button>
              {hasGit ? (
                <span className="changed-files-bar__file-actions">
                  <button
                    className="diff-action-sm diff-action-sm--accept"
                    type="button"
                    title="Accept"
                    onClick={() => onStage(file.path)}
                  >✓</button>
                  <button
                    className="diff-action-sm diff-action-sm--reject"
                    type="button"
                    title="Reject"
                    onClick={() => onDiscard(file.path)}
                  >✗</button>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <button
        className="changed-files-bar__toggle"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`changed-files-bar__chevron ${open ? "changed-files-bar__chevron--open" : ""}`}>
          <ChevronRightIcon />
        </span>
        <span className="changed-files-bar__label">
          {files.length} file{files.length !== 1 ? "s" : ""} changed
        </span>
        <button
          className="icon-button changed-files-bar__refresh"
          type="button"
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          aria-label="Refresh"
          disabled={loading}
        >
          <RefreshIcon />
        </button>
      </button>
    </div>
  );
}
