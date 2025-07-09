import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Package, Plus, X, Search } from "lucide-react";
import type { Project } from "@shared/schema";

interface PackageManagerProps {
  project: Project | undefined;
}

export function PackageManager({ project }: PackageManagerProps) {
  const { toast } = useToast();
  const [activeStage, setActiveStage] = useState("stage2");
  const [newPackage, setNewPackage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const commonPackages = [
    "git", "curl", "wget", "vim", "nano", "htop", "tree", "unzip",
    "python3", "python3-pip", "nodejs", "npm", "build-essential",
    "openssh-server", "nginx", "apache2", "mysql-server", "postgresql",
    "docker.io", "docker-compose", "fail2ban", "ufw", "certbot",
  ];

  const stagePackages = project?.config?.stages?.[activeStage]?.packages || [];

  const filteredCommonPackages = commonPackages.filter(pkg => 
    pkg.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !stagePackages.includes(pkg)
  );

  const addPackage = async (packageName: string) => {
    if (!project || !packageName.trim()) return;

    try {
      const currentStages = project.config?.stages || {};
      const currentStageConfig = currentStages[activeStage] || { enabled: true, skipImage: "0", packages: [], runScript: "" };
      
      const updatedPackages = [...currentStageConfig.packages, packageName];
      
      await apiRequest("PUT", `/api/projects/${project.id}`, {
        config: {
          ...project.config,
          stages: {
            ...currentStages,
            [activeStage]: {
              ...currentStageConfig,
              packages: updatedPackages,
            },
          },
        },
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      setNewPackage("");
      
      toast({
        title: "Success",
        description: `Package ${packageName} added to ${activeStage}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add package",
        variant: "destructive",
      });
    }
  };

  const removePackage = async (packageName: string) => {
    if (!project) return;

    try {
      const currentStages = project.config?.stages || {};
      const currentStageConfig = currentStages[activeStage] || { enabled: true, skipImage: "0", packages: [], runScript: "" };
      
      const updatedPackages = currentStageConfig.packages.filter(pkg => pkg !== packageName);
      
      await apiRequest("PUT", `/api/projects/${project.id}`, {
        config: {
          ...project.config,
          stages: {
            ...currentStages,
            [activeStage]: {
              ...currentStageConfig,
              packages: updatedPackages,
            },
          },
        },
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      
      toast({
        title: "Success",
        description: `Package ${packageName} removed from ${activeStage}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove package",
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
            <Package className="w-5 h-5 text-pi-green" />
            <span>Package Management</span>
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
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add package name"
                    value={newPackage}
                    onChange={(e) => setNewPackage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addPackage(newPackage)}
                  />
                  <Button onClick={() => addPackage(newPackage)} className="bg-pi-green hover:bg-pi-green/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <div>
                  <Label className="text-sm font-medium text-pi-text mb-2 block">
                    Installed Packages ({stagePackages.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {stagePackages.length === 0 ? (
                      <div className="text-pi-accent text-sm">No packages installed</div>
                    ) : (
                      stagePackages.map((pkg) => (
                        <Badge key={pkg} variant="secondary" className="flex items-center space-x-1">
                          <span>{pkg}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePackage(pkg)}
                            className="h-4 w-4 p-0 hover:bg-red-100"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Search className="w-4 h-4 text-pi-accent" />
                    <Input
                      placeholder="Search common packages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                  
                  <Label className="text-sm font-medium text-pi-text mb-2 block">
                    Common Packages
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filteredCommonPackages.map((pkg) => (
                      <Button
                        key={pkg}
                        variant="outline"
                        size="sm"
                        onClick={() => addPackage(pkg)}
                        className="justify-start hover:bg-pi-green/10 hover:border-pi-green"
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        {pkg}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
