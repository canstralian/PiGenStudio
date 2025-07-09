import { projects, projectFiles, type Project, type InsertProject, type ProjectFile, type InsertProjectFile } from "@shared/schema";

export interface IStorage {
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // File operations
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  updateProjectFile(id: number, updates: Partial<InsertProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<boolean>;
  deleteProjectFiles(projectId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private projects: Map<number, Project> = new Map();
  private projectFiles: Map<number, ProjectFile> = new Map();
  private currentProjectId = 1;
  private currentFileId = 1;

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const now = new Date().toISOString();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, project);
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject: Project = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const deleted = this.projects.delete(id);
    if (deleted) {
      // Also delete all files for this project
      Array.from(this.projectFiles.entries()).forEach(([fileId, file]) => {
        if (file.projectId === id) {
          this.projectFiles.delete(fileId);
        }
      });
    }
    return deleted;
  }

  async createProjectFile(insertFile: InsertProjectFile): Promise<ProjectFile> {
    const id = this.currentFileId++;
    const file: ProjectFile = {
      ...insertFile,
      id,
      createdAt: new Date().toISOString(),
    };
    this.projectFiles.set(id, file);
    return file;
  }

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return Array.from(this.projectFiles.values()).filter(
      (file) => file.projectId === projectId
    );
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    return this.projectFiles.get(id);
  }

  async updateProjectFile(id: number, updates: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    const file = this.projectFiles.get(id);
    if (!file) return undefined;

    const updatedFile: ProjectFile = {
      ...file,
      ...updates,
    };
    this.projectFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    return this.projectFiles.delete(id);
  }

  async deleteProjectFiles(projectId: number): Promise<boolean> {
    let deleted = false;
    Array.from(this.projectFiles.entries()).forEach(([fileId, file]) => {
      if (file.projectId === projectId) {
        this.projectFiles.delete(fileId);
        deleted = true;
      }
    });
    return deleted;
  }
}

export const storage = new MemStorage();
