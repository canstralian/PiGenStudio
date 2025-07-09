import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { CodeEditor } from "./code-editor";
import { Settings, Layers, Code } from "lucide-react";
import type { Project } from "@shared/schema";

const configSchema = z.object({
  imageName: z.string().min(1, "Image name is required"),
  release: z.string().min(1, "Release is required"),
  deployCompression: z.string().min(1, "Deploy compression is required"),
  locale: z.string().min(1, "Locale is required"),
  timezone: z.string().min(1, "Timezone is required"),
  keyboardKeymap: z.string().min(1, "Keyboard keymap is required"),
  keyboardLayout: z.string().min(1, "Keyboard layout is required"),
  enableSsh: z.boolean(),
  skipImages: z.string().min(1, "Skip images is required"),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface ConfigurationPanelProps {
  project: Project | undefined;
}

export function ConfigurationPanel({ project }: ConfigurationPanelProps) {
  const { toast } = useToast();
  const [activeStage, setActiveStage] = useState("stage2");
  const [configPreview, setConfigPreview] = useState("");

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      imageName: "raspios-custom",
      release: "bullseye",
      deployCompression: "xz",
      locale: "en_US.UTF-8",
      timezone: "Europe/London",
      keyboardKeymap: "gb",
      keyboardLayout: "English (UK)",
      enableSsh: true,
      skipImages: "0,1",
    },
  });

  useEffect(() => {
    if (project?.config) {
      form.reset(project.config);
    }
  }, [project, form]);

  useEffect(() => {
    const values = form.watch();
    generateConfigPreview(values);
  }, [form.watch()]);

  const generateConfigPreview = (config: ConfigFormData) => {
    const preview = `# Pi-Gen Configuration
IMG_NAME="${config.imageName}"
RELEASE="${config.release}"
DEPLOY_COMPRESSION="${config.deployCompression}"
LOCALE_DEFAULT="${config.locale}"
TIMEZONE_DEFAULT="${config.timezone}"
KEYBOARD_KEYMAP="${config.keyboardKeymap}"
KEYBOARD_LAYOUT="${config.keyboardLayout}"

# Stage configuration
SKIP_IMAGES="${config.skipImages}"
ENABLE_SSH="${config.enableSsh ? '1' : '0'}"

# Custom stages
STAGE2_SKIP_IMAGE="0"
`;
    setConfigPreview(preview);
  };

  const onSubmit = async (data: ConfigFormData) => {
    if (!project) return;

    try {
      await apiRequest("PUT", `/api/projects/${project.id}`, {
        config: {
          ...data,
          stages: project.config?.stages || {},
        },
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  const toggleStage = async (stage: string, enabled: boolean) => {
    if (!project) return;

    try {
      const updatedStages = {
        ...project.config?.stages,
        [stage]: {
          ...project.config?.stages?.[stage],
          enabled,
        },
      };

      await apiRequest("PUT", `/api/projects/${project.id}`, {
        config: {
          ...project.config,
          stages: updatedStages,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      toast({
        title: "Success",
        description: `${stage} ${enabled ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stage configuration",
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
      <Tabs defaultValue="project" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="project" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Project Settings</span>
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center space-x-2">
            <Layers className="w-4 h-4" />
            <span>Stages</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>Preview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-pi-red" />
                <span>Project Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="imageName">Image Name</Label>
                    <Input
                      id="imageName"
                      {...form.register("imageName")}
                      placeholder="raspios-custom"
                    />
                    {form.formState.errors.imageName && (
                      <p className="text-sm text-red-600">{form.formState.errors.imageName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="release">Release</Label>
                    <Select value={form.watch("release")} onValueChange={(value) => form.setValue("release", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select release" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bullseye">Bullseye</SelectItem>
                        <SelectItem value="bookworm">Bookworm</SelectItem>
                        <SelectItem value="buster">Buster</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="deployCompression">Deploy Compression</Label>
                    <Select value={form.watch("deployCompression")} onValueChange={(value) => form.setValue("deployCompression", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select compression" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xz">XZ</SelectItem>
                        <SelectItem value="gz">GZ</SelectItem>
                        <SelectItem value="zip">ZIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="locale">Locale</Label>
                    <Input
                      id="locale"
                      {...form.register("locale")}
                      placeholder="en_US.UTF-8"
                    />
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      {...form.register("timezone")}
                      placeholder="Europe/London"
                    />
                  </div>

                  <div>
                    <Label htmlFor="keyboardKeymap">Keyboard Keymap</Label>
                    <Input
                      id="keyboardKeymap"
                      {...form.register("keyboardKeymap")}
                      placeholder="gb"
                    />
                  </div>

                  <div>
                    <Label htmlFor="keyboardLayout">Keyboard Layout</Label>
                    <Input
                      id="keyboardLayout"
                      {...form.register("keyboardLayout")}
                      placeholder="English (UK)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="skipImages">Skip Images</Label>
                    <Input
                      id="skipImages"
                      {...form.register("skipImages")}
                      placeholder="0,1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableSsh"
                    checked={form.watch("enableSsh")}
                    onCheckedChange={(checked) => form.setValue("enableSsh", checked as boolean)}
                  />
                  <Label htmlFor="enableSsh">Enable SSH</Label>
                </div>

                <Button type="submit" className="bg-pi-red hover:bg-pi-red/90">
                  Save Configuration
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-pi-green" />
                <span>Stage Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  {["stage2", "stage3", "stage4"].map((stage) => (
                    <Button
                      key={stage}
                      variant={activeStage === stage ? "default" : "outline"}
                      onClick={() => setActiveStage(stage)}
                      className={activeStage === stage ? "bg-pi-red hover:bg-pi-red/90" : ""}
                    >
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </Button>
                  ))}
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-pi-text mb-4">
                    {activeStage.charAt(0).toUpperCase() + activeStage.slice(1)}: 
                    {activeStage === "stage2" && " Base System"}
                    {activeStage === "stage3" && " Desktop Environment"}
                    {activeStage === "stage4" && " Applications"}
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${activeStage}-enabled`}
                        checked={project.config?.stages?.[activeStage]?.enabled ?? true}
                        onCheckedChange={(checked) => toggleStage(activeStage, checked as boolean)}
                      />
                      <Label htmlFor={`${activeStage}-enabled`}>Enable {activeStage}</Label>
                    </div>
                    <div>
                      <Label htmlFor={`${activeStage}-skipImage`}>Skip Image</Label>
                      <Select 
                        value={project.config?.stages?.[activeStage]?.skipImage || "0"}
                        onValueChange={(value) => {
                          // Handle skip image change
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 - Generate image</SelectItem>
                          <SelectItem value="1">1 - Skip image generation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-pi-accent" />
                <span>Configuration Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeEditor
                value={configPreview}
                onChange={() => {}}
                language="shell"
                height="400px"
                readOnly
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
