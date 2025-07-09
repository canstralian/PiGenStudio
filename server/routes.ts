import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertProjectFileSchema, piGenConfigSchema } from "@shared/schema";
import { z } from "zod";
import JSZip from "jszip";
import multer from "multer";
import path from "path";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);

      // Create default Pi-Gen structure
      const defaultFiles = [
        { path: "config", content: generateConfigFile(projectData.config), isDirectory: false },
        { path: "README.md", content: "# Pi-Gen Custom Build\n\nThis is a custom Raspberry Pi OS build created with Pi-Gen Configuration Tool.", isDirectory: false },
        { path: "stage0", content: "", isDirectory: true },
        { path: "stage1", content: "", isDirectory: true },
        { path: "stage2", content: "", isDirectory: true },
        { path: "stage2/00-packages", content: "", isDirectory: false },
        { path: "stage2/01-run.sh", content: "#!/bin/bash\n\necho 'Running stage2 setup...'\n", isDirectory: false },
        { path: "stage2/files", content: "", isDirectory: true },
        { path: "stage3", content: "", isDirectory: true },
        { path: "stage4", content: "", isDirectory: true },
      ];

      for (const file of defaultFiles) {
        await storage.createProjectFile({
          projectId: project.id,
          path: file.path,
          content: file.content,
          isDirectory: file.isDirectory,
        });
      }

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, updates);
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update project" });
      }
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // File routes
  app.get("/api/projects/:id/files", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.post("/api/projects/:id/files", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const fileData = insertProjectFileSchema.parse({
        ...req.body,
        projectId,
      });
      const file = await storage.createProjectFile(fileData);
      res.json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create file" });
      }
    }
  });

  app.put("/api/projects/:projectId/files/:fileId", async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const updates = insertProjectFileSchema.partial().parse(req.body);
      const file = await storage.updateProjectFile(fileId, updates);
      if (!file) {
        res.status(404).json({ message: "File not found" });
        return;
      }
      res.json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update file" });
      }
    }
  });

  app.delete("/api/projects/:projectId/files/:fileId", async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const deleted = await storage.deleteProjectFile(fileId);
      if (!deleted) {
        res.status(404).json({ message: "File not found" });
        return;
      }
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // File upload
  app.post("/api/projects/:id/upload", upload.array("files"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = req.files as Express.Multer.File[];
      const { targetPath = "" } = req.body;

      const uploadedFiles = [];
      for (const file of files) {
        const filePath = path.join(targetPath, file.originalname).replace(/\\/g, "/");
        const content = file.buffer.toString("utf-8");
        
        const projectFile = await storage.createProjectFile({
          projectId,
          path: filePath,
          content,
          isDirectory: false,
        });
        uploadedFiles.push(projectFile);
      }

      res.json(uploadedFiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Export project
  app.get("/api/projects/:id/export", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      const files = await storage.getProjectFiles(id);
      const zip = new JSZip();

      // Add project files to zip
      for (const file of files) {
        if (!file.isDirectory && file.content) {
          zip.file(file.path, file.content);
        }
      }

      // Generate zip buffer
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${project.name}.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to export project" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateConfigFile(config: any): string {
  const piGenConfig = piGenConfigSchema.parse(config);
  
  return `# Pi-Gen Configuration
IMG_NAME="${piGenConfig.imageName}"
RELEASE="${piGenConfig.release}"
DEPLOY_COMPRESSION="${piGenConfig.deployCompression}"
LOCALE_DEFAULT="${piGenConfig.locale}"
TIMEZONE_DEFAULT="${piGenConfig.timezone}"
KEYBOARD_KEYMAP="${piGenConfig.keyboardKeymap}"
KEYBOARD_LAYOUT="${piGenConfig.keyboardLayout}"

# Stage configuration
SKIP_IMAGES="${piGenConfig.skipImages}"
ENABLE_SSH="${piGenConfig.enableSsh ? '1' : '0'}"

# Custom stages
${Object.entries(piGenConfig.stages).map(([stage, config]) => 
  `# ${stage}\n${stage.toUpperCase()}_SKIP_IMAGE="${config.skipImage}"`
).join('\n')}
`;
}
