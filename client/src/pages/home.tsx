import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileTree } from "@/components/file-tree";
import { ConfigurationPanel } from "@/components/configuration-panel";
import { PackageManager } from "@/components/package-manager";
import { ScriptEditor } from "@/components/script-editor";
import { FileUpload } from "@/components/file-upload";
import { ExportModal } from "@/components/export-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Router, Plus, Download, Settings, Package, Terminal, FileText } from "lucide-react";
import type { Project } from "@shared/schema";

export default function Home() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("configuration");
  const [newProjectName, setNewProjectName] = useState("");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !projectId,
  });

  const { data: currentProject, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "files"],
    enabled: !!projectId,
  });

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive",
      });
      return;
    }

    try {
      const defaultConfig = {
        imageName: "raspios-custom",
        release: "bullseye",
        deployCompression: "xz",
        locale: "en_US.UTF-8",
        timezone: "Europe/London",
        keyboardKeymap: "gb",
        keyboardLayout: "English (UK)",
        enableSsh: true,
        skipImages: "0,1",
        stages: {
          stage2: {
            enabled: true,
            skipImage: "0",
            packages: [],
            runScript: "",
          },
        },
      };

      await apiRequest("POST", "/api/projects", {
        name: newProjectName,
        description: `Custom Raspberry Pi OS build: ${newProjectName}`,
        config: defaultConfig,
      });

      setNewProjectName("");
      setIsNewProjectOpen(false);
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      
      // Refresh projects list
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/export`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentProject?.name || "pi-gen-project"}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Project exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export project",
        variant: "destructive",
      });
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-pi-bg">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Router className="text-pi-red text-xl" />
            <h1 className="text-xl font-semibold text-pi-text">Pi-Gen Configuration Tool</h1>
          </div>
          <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pi-red hover:bg-pi-red/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateProject()}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} className="bg-pi-red hover:bg-pi-red/90">
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-pi-text mb-4">Welcome to Pi-Gen Configuration Tool</h2>
            <p className="text-pi-accent mb-8">Create and manage custom Raspberry Pi OS builds</p>
            
            {projectsLoading ? (
              <div className="text-pi-accent">Loading projects...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects?.map((project: Project) => (
                  <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-pi-text mb-2">{project.name}</h3>
                    <p className="text-pi-accent text-sm mb-4">{project.description}</p>
                    <Button 
                      onClick={() => window.location.href = `/project/${project.id}`}
                      className="w-full bg-pi-green hover:bg-pi-green/90 text-white"
                    >
                      Open Project
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pi-bg">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Router className="text-pi-red text-xl" />
          <h1 className="text-xl font-semibold text-pi-text">Pi-Gen Configuration Tool</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handleExport} className="bg-pi-green hover:bg-pi-green/90 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Project
          </Button>
          <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pi-red hover:bg-pi-red/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateProject()}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} className="bg-pi-red hover:bg-pi-red/90">
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-80 bg-white border-r border-gray-200">
          <FileTree 
            project={currentProject}
            files={files || []}
            isLoading={filesLoading}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="configuration" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Configuration</span>
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>Packages</span>
                </TabsTrigger>
                <TabsTrigger value="scripts" className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <span>Scripts</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Files</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="configuration" className="p-6">
                <ConfigurationPanel project={currentProject} />
              </TabsContent>
              <TabsContent value="packages" className="p-6">
                <PackageManager project={currentProject} />
              </TabsContent>
              <TabsContent value="scripts" className="p-6">
                <ScriptEditor project={currentProject} files={files || []} />
              </TabsContent>
              <TabsContent value="files" className="p-6">
                <FileUpload projectId={projectId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <ExportModal 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
        project={currentProject}
      />
    </div>
  );
}
