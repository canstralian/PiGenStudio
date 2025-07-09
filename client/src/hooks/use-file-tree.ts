import { useState, useEffect } from "react";
import type { ProjectFile } from "@shared/schema";

export interface FileNode {
  id?: number;
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
  children: FileNode[];
}

export function useFileTree(files: ProjectFile[]) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["pi-gen-project"]));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const buildFileTree = (files: ProjectFile[]): FileNode[] => {
    const root: FileNode = {
      name: "pi-gen-project",
      path: "",
      isDirectory: true,
      children: [],
    };

    const nodeMap = new Map<string, FileNode>();
    nodeMap.set("", root);

    // Sort files by path to ensure directories are created before their children
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    for (const file of sortedFiles) {
      const pathParts = file.path.split("/");
      let currentPath = "";
      let currentNode = root;

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const isLastPart = i === pathParts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        let childNode = nodeMap.get(currentPath);
        if (!childNode) {
          childNode = {
            id: isLastPart ? file.id : undefined,
            name: part,
            path: currentPath,
            isDirectory: isLastPart ? file.isDirectory : true,
            content: isLastPart ? file.content : undefined,
            children: [],
          };
          nodeMap.set(currentPath, childNode);
          currentNode.children.push(childNode);
        }
        currentNode = childNode;
      }
    }

    return [root];
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const fileTree = buildFileTree(files);

  return {
    fileTree,
    expandedFolders,
    selectedFile,
    setSelectedFile,
    toggleFolder,
  };
}
