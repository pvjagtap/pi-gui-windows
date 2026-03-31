import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRightIcon } from "./icons";
import type { PiDesktopApi } from "./ipc";

interface TreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children: TreeNode[] | null;
  expanded: boolean;
  loading: boolean;
}

interface FileExplorerProps {
  readonly workspaceId: string;
  readonly api: PiDesktopApi;
  readonly onOpenFile: (filePath: string) => void;
}

function patchTree(
  nodes: TreeNode[],
  targetPath: string,
  patch: Partial<TreeNode>,
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) return { ...node, ...patch };
    if (node.children) return { ...node, children: patchTree(node.children, targetPath, patch) };
    return node;
  });
}

export function FileExplorer({ workspaceId, api, onOpenFile }: FileExplorerProps) {
  const [roots, setRoots] = useState<TreeNode[] | null>(null);
  const [rootLoading, setRootLoading] = useState(false);
  const rootsRef = useRef<TreeNode[] | null>(null);
  rootsRef.current = roots;

  useEffect(() => {
    setRootLoading(true);
    api.listDirectory(workspaceId).then((entries) => {
      setRoots(
        entries.map((e) => ({
          name: e.name,
          type: e.type,
          path: e.name,
          children: null,
          expanded: false,
          loading: false,
        })),
      );
      setRootLoading(false);
    }).catch(() => {
      setRootLoading(false);
    });
  }, [api, workspaceId]);

  const toggleFolder = useCallback(
    async (path: string) => {
      // Check current state via ref to determine if we need to fetch
      const currentRoots = rootsRef.current;
      const currentNode = currentRoots ? findNode(currentRoots, path) : null;
      const needsFetch = currentNode != null && !currentNode.expanded && currentNode.children === null;

      // Update UI immediately
      setRoots((prev) => {
        if (!prev) return prev;
        const node = findNode(prev, path);
        if (!node) return prev;
        if (node.expanded) return patchTree(prev, path, { expanded: false });
        if (node.children !== null) return patchTree(prev, path, { expanded: true });
        return patchTree(prev, path, { loading: true });
      });

      if (!needsFetch) return;

      try {
        const entries = await api.listDirectory(workspaceId, path);
        const children: TreeNode[] = entries.map((e) => ({
          name: e.name,
          type: e.type,
          path: `${path}/${e.name}`,
          children: null,
          expanded: false,
          loading: false,
        }));
        setRoots((prev) =>
          prev ? patchTree(prev, path, { children, expanded: true, loading: false }) : prev,
        );
      } catch {
        setRoots((prev) =>
          prev ? patchTree(prev, path, { loading: false }) : prev,
        );
      }
    },
    [api, workspaceId],
  );

  if (rootLoading && !roots) {
    return <div className="file-explorer__loading">Loading...</div>;
  }

  if (!roots || roots.length === 0) {
    return <div className="file-explorer__empty">No files</div>;
  }

  return (
    <div className="file-explorer">
      {roots.map((node) => (
        <TreeNodeRow
          key={node.path}
          node={node}
          depth={0}
          onToggle={toggleFolder}
          onOpenFile={onOpenFile}
        />
      ))}
    </div>
  );
}

function findNode(nodes: TreeNode[], path: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

function TreeNodeRow({
  node,
  depth,
  onToggle,
  onOpenFile,
}: {
  readonly node: TreeNode;
  readonly depth: number;
  readonly onToggle: (path: string) => void;
  readonly onOpenFile: (path: string) => void;
}) {
  const paddingLeft = 8 + depth * 16;

  if (node.type === "directory") {
    return (
      <>
        <button
          className="file-explorer__row file-explorer__folder"
          type="button"
          style={{ paddingLeft }}
          onClick={() => onToggle(node.path)}
        >
          <span className={`file-explorer__chevron ${node.expanded ? "file-explorer__chevron--open" : ""}`}>
            <ChevronRightIcon />
          </span>
          <span className="file-explorer__name">{node.name}</span>
          {node.loading ? <span className="file-explorer__spinner" /> : null}
        </button>
        {node.expanded && node.children
          ? node.children.map((child) => (
              <TreeNodeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                onToggle={onToggle}
                onOpenFile={onOpenFile}
              />
            ))
          : null}
      </>
    );
  }

  return (
    <button
      className="file-explorer__row file-explorer__file"
      type="button"
      style={{ paddingLeft: paddingLeft + 18 }}
      onClick={() => onOpenFile(node.path)}
      title={node.path}
    >
      <span className="file-explorer__name">{node.name}</span>
    </button>
  );
}
