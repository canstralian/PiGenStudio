import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { CodeEditor } from "./code-editor";
import { Terminal, Save, FileText } from "lucide-react";
import type { Project, ProjectFile } from "@shared/schema";

interface ScriptEditorProps {
  project: Project | undefined;
  files: ProjectFile[];
}

export function ScriptEditor({ project, files }: ScriptEditorProps) {
  const { toast } = useToast();
  const [activeStage, setActiveStage] = useState("stage2");
  const [runScriptContent, setRunScriptContent] = useState("");
  const [packagesContent, setPackagesContent] = useState("");

  const runScriptFile = files.find(f => f.path === `${activeStage}/01-run.sh`);
  const packagesFile = files.find(f => f.path === `${activeStage}/00-packages`);

  useEffect(() => {
    setRunScriptContent(runScriptFile?.content || "#!/bin/bash\n\necho 'Running stage setup...'\n");
    setPackagesContent(packagesFile?.content || "");
  }, [runScriptFile, packagesFile, activeStage]);

  const saveScript = async (type: "run" | "packages") => {
    if (!project) return;

    try {
      const fileName = type === "run" ? "01-run.sh" : "00-packages";
      const filePath = `${activeStage}/${fileName}`;
      const content = type === "run" ? runScriptContent : packagesContent;

      const existingFile = files.find(f => f.path === filePath);
      
      if (existingFile) {
        await apiRequest("PUT", `/api/projects/${project.id}/files/${existingFile.id}`, {
          content,
        });
      } else {
        await apiRequest("POST", `/api/projects/${project.id}/files`, {
          path: filePath,
          content,
          isDirectory: false,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "files"] });
      
      toast({
        title: "Success",
        description: `${type === "run" ? "Run script" : "Package list"} saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save ${type === "run" ? "run script" : "package list"}`,
        variant: "destructive",
      });
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-pi-accent">No project selected</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-pi-accent" />
            <span>Script Editor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeStage} onValueChange={setActiveStage}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stage2">Stage 2</TabsTrigger>
              <TabsTrigger value="stage3">Stage 3</TabsTrigger>
              <TabsTrigger value="stage4">Stage 4</TabsTrigger>
            </TabsList>

            <TabsContent value={activeStage} className="space-y-6">
              <Tabs defaultValue="run-script" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="run-script" className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4" />
                    <span>Run Script</span>
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Package List</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="run-script" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-pi-text">01-run.sh</h3>
                      <p className="text-sm text-pi-accent">
                        Shell script executed during {activeStage} build process
                      </p>
                    </div>
                    <Button onClick={() => saveScript("run")} className="bg-pi-green hover:bg-pi-green/90">
                      <Save className="w-4 h-4 mr-2" />
                      Save Script
                    </Button>
                  </div>
                  <CodeEditor
                    value={runScriptContent}
                    onChange={setRunScriptContent}
                    language="shell"
                    height="400px"
                  />
                </TabsContent>

                <TabsContent value="packages" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-pi-text">00-packages</h3>
                      <p className="text-sm text-pi-accent">
                        List of packages to install during {activeStage} (one per line)
                      </p>
                    </div>
                    <Button onClick={() => saveScript("packages")} className="bg-pi-green hover:bg-pi-green/90">
                      <Save className="w-4 h-4 mr-2" />
                      Save Packages
                    </Button>
                  </div>
                  <CodeEditor
                    value={packagesContent}
                    onChange={setPackagesContent}
                    language="text"
                    height="400px"
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
