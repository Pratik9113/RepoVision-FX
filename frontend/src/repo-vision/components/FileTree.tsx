import React, { useState } from "react";
import { Badge } from "./Badge";
import type { FileTreeNode, File } from "../types";

interface FileTreeProps {
  tree: FileTreeNode[];
  onFileClick: (file: File) => void;
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  onFileClick: (file: File) => void;
}

function TreeNode({ node, depth, onFileClick }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.type === "dir";

  const toggle = () => {
    if (isDir) setIsOpen(!isOpen);
  };

  const handleClick = () => {
    if (!isDir) {
      onFileClick({
        path: node.path,
        name: node.name,
        language: node.language,
        icon: node.icon
      });
    } else {
      toggle();
    }
  };

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 1.2}rem` }}
        className={`group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200 ${isDir ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-indigo-300"
          } hover:bg-white/5`}
      >
        <span className="w-5 flex items-center justify-center text-sm">
          {isDir ? (
            <span className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
              ▶
            </span>
          ) : (
            <span>{node.icon || "📄"}</span>
          )}
        </span>

        {isDir && (
          <span className="text-xl">
            {isOpen ? "📂" : "📁"}
          </span>
        )}

        <span className="text-sm font-medium truncate flex-1">{node.name}</span>

        {!isDir && node.language && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="default" className="text-[10px] scale-90 origin-right">
              {node.language}
            </Badge>
          </div>
        )}
      </div>

      {isDir && isOpen && node.children && (
        <div className="mt-0.5">
          {node.children.map((child, i) => (
            <TreeNode
              key={`${child.path}-${i}`}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ tree, onFileClick }: FileTreeProps) {
  if (!tree || tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <span className="text-4xl mb-4">📂</span>
        <p className="text-sm">No files found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node, i) => (
        <TreeNode
          key={`${node.path}-${i}`}
          node={node}
          depth={0}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
