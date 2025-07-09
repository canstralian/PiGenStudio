import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  content: text("content"),
  isDirectory: boolean("is_directory").default(false),
  createdAt: text("created_at").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;

export const piGenConfigSchema = z.object({
  imageName: z.string().default("raspios-custom"),
  release: z.string().default("bullseye"),
  deployCompression: z.string().default("xz"),
  locale: z.string().default("en_US.UTF-8"),
  timezone: z.string().default("Europe/London"),
  keyboardKeymap: z.string().default("gb"),
  keyboardLayout: z.string().default("English (UK)"),
  enableSsh: z.boolean().default(true),
  skipImages: z.string().default("0,1"),
  stages: z.record(z.object({
    enabled: z.boolean().default(true),
    skipImage: z.string().default("0"),
    packages: z.array(z.string()).default([]),
    runScript: z.string().default(""),
  })).default({}),
});

export type PiGenConfig = z.infer<typeof piGenConfigSchema>;
