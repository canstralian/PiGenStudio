import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, FolderPlus, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Project, ProjectFile } from "@shared/schema";

interface FileTreeProps {
  project: Project | undefined;
  files: ProjectFile[];
  isLoading: boolean;
}

interface FileNode {
  id?: number;
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
  children: FileNode[];
}

export function FileTree({ project, files, isLoading }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["pi-gen-project"]));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file");
  const { toast } = useToast();

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

  const handleCreateItem = async () => {
    if (!project || !newItemName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", `/api/projects/${project.id}/files`, {
        path: newItemName,
        content: newItemType === "file" ? "" : "",
        isDirectory: newItemType === "folder",
      });

      setNewItemName("");
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "files"] });
      
      toast({
        title: "Success",
        description: `${newItemType === "file" ? "File" : "Folder"} created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create ${newItemType}`,
        variant: "destructive",
      });
    }
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center px-2 py-1 hover:bg-gray-100 rounded cursor-pointer ${
            isSelected ? "bg-red-50 text-red-600" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.isDirectory) {
              toggleFolder(node.path);
            } else {
              setSelectedFile(node.path);
            }
          }}
        >
          {node.isDirectory && (
            <button className="mr-1 p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {node.isDirectory ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-pi-accent" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-pi-accent" />
            )
          ) : (
            <FileText className="w-4 h-4 mr-2 text-pi-accent" />
          )}
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        {node.isDirectory && isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-pi-accent">Loading files...</div>
      </div>
    );
  }

  const fileTree = buildFileTree(files);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-pi-text">Project Structure</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <FolderPlus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    variant={newItemType === "file" ? "default" : "outline"}
                    onClick={() => setNewItemType("file")}
                    className="flex-1"
                  >
                    <FilePlus className="w-4 h-4 mr-2" />
                    File
                  </Button>
                  <Button
                    variant={newItemType === "folder" ? "default" : "outline"}
                    onClick={() => setNewItemType("folder")}
                    className="flex-1"
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Folder
                  </Button>
                </div>
                <Input
                  placeholder={`Enter ${newItemType} name`}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateItem()}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateItem} className="bg-pi-red hover:bg-pi-red/90">
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-sm text-pi-accent mb-2">{project?.name}</div>
        <div className="flex space-x-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
          <span className="px-2 py-1 bg-gray-100 text-pi-accent text-xs rounded">v1.0.0</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {fileTree.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
}
