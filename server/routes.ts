import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertProjectFileSchema, piGenConfigSchema } from "@shared/schema";
import { z } from "zod";
import JSZip from "jszip";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const upload = multer({ storage: multer.memoryStorage() });

// Load analytics scripts
async function loadAnalyticsScripts() {
  try {
    const analyticsScript = await fs.readFile(path.join(process.cwd(), 'scripts', 'analytics.sh'), 'utf-8');
    const analyticsConfig = await fs.readFile(path.join(process.cwd(), 'scripts', 'analytics.conf'), 'utf-8');
    const installScript = await fs.readFile(path.join(process.cwd(), 'scripts', 'install-analytics.sh'), 'utf-8');
    return { analyticsScript, analyticsConfig, installScript };
  } catch (error) {
    console.warn('Analytics scripts not found, skipping...');
    return null;
  }
}

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

      // Load analytics scripts
      const analyticsScripts = await loadAnalyticsScripts();

      // Create default Pi-Gen structure
      const defaultFiles = [
        { path: "config", content: generateConfigFile(projectData.config), isDirectory: false },
        { path: "README.md", content: generateReadmeFile(), isDirectory: false },
        { path: "stage0", content: "", isDirectory: true },
        { path: "stage1", content: "", isDirectory: true },
        { path: "stage2", content: "", isDirectory: true },
        { path: "stage2/00-packages", content: "", isDirectory: false },
        { path: "stage2/01-run.sh", content: "#!/bin/bash\n\necho 'Running stage2 setup...'\n", isDirectory: false },
        { path: "stage2/files", content: "", isDirectory: true },
        { path: "stage3", content: "", isDirectory: true },
        { path: "stage4", content: "", isDirectory: true },
      ];

      // Add analytics scripts if available
      if (analyticsScripts) {
        defaultFiles.push(
          { path: "scripts", content: "", isDirectory: true },
          { path: "scripts/analytics.sh", content: analyticsScripts.analyticsScript, isDirectory: false },
          { path: "scripts/analytics.conf", content: analyticsScripts.analyticsConfig, isDirectory: false },
          { path: "scripts/install-analytics.sh", content: analyticsScripts.installScript, isDirectory: false },
          { path: "scripts/README.md", content: generateAnalyticsReadme(), isDirectory: false }
        );
      }

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

function generateReadmeFile(): string {
  return `# Pi-Gen Custom Build

This is a custom Raspberry Pi OS build created with Pi-Gen Configuration Tool.

## Contents

- **config** - Pi-Gen configuration file
- **stage0-4** - Pi-Gen stages for building the custom image
- **scripts/** - Additional scripts and utilities

## Analytics Module

This project includes an analytics module for monitoring your Raspberry Pi system.

### Installation

After flashing your SD card with the generated image, SSH into your Pi and run:

\`\`\`bash
cd /path/to/scripts
sudo bash install-analytics.sh
\`\`\`

### Usage

\`\`\`bash
# Collect metrics once
analytics.sh collect

# Start interactive monitoring
analytics.sh monitor

# Generate a comprehensive report
analytics.sh report

# View help
analytics.sh help
\`\`\`

See the \`scripts/README.md\` file for more details.

## Building the Image

To build this custom image, use Pi-Gen:

\`\`\`bash
git clone https://github.com/RPi-Distro/pi-gen.git
cd pi-gen
# Copy the contents of this project to pi-gen directory
# Then run:
./build.sh
\`\`\`

For more information, visit: https://github.com/RPi-Distro/pi-gen
`;
}

function generateAnalyticsReadme(): string {
  return `# Analytics Module

System monitoring and metrics collection for Raspberry Pi.

## Features

- **System Metrics**: CPU temperature, memory usage, disk usage, load average
- **Performance Monitoring**: Process information, top CPU/memory consumers
- **Network Statistics**: Interface statistics, active connections, listening ports
- **Trend Analysis**: Compare metrics over time
- **Configurable Alerts**: Set thresholds for temperature, memory, CPU, and disk
- **Multiple Export Formats**: JSON and CSV export options
- **Interactive Monitoring**: Real-time system monitoring dashboard

## Installation

Run the installation script with root privileges:

\`\`\`bash
sudo bash install-analytics.sh
\`\`\`

This will:
1. Copy the analytics script to \`/usr/local/bin/analytics.sh\`
2. Install the configuration file to \`/etc/analytics/analytics.conf\`
3. Create the reports directory at \`/var/log/analytics\`
4. Install required dependencies (jq, net-tools)
5. Optionally set up automated collection via cron

## Usage

### Basic Commands

\`\`\`bash
# Collect all metrics
analytics.sh collect

# Collect specific metrics
analytics.sh system        # System metrics only
analytics.sh performance   # Performance metrics only
analytics.sh network       # Network metrics only

# Interactive monitoring
analytics.sh monitor

# Generate a comprehensive report
analytics.sh report [output-file]

# Check service status
analytics.sh service <service-name>

# Export metrics to CSV
analytics.sh export /var/log/analytics/metrics-20231101.json

# Cleanup old metrics (default: 30 days)
analytics.sh cleanup [days]
\`\`\`

### Configuration

Edit the configuration file to customize settings:

\`\`\`bash
sudo nano /etc/analytics/analytics.conf
\`\`\`

Available settings:
- \`COLLECT_METRICS\` - Enable/disable metrics collection
- \`TEMPERATURE_THRESHOLD\` - CPU temperature alert threshold (default: 70°C)
- \`MEMORY_THRESHOLD\` - Memory usage alert threshold (default: 85%)
- \`CPU_THRESHOLD\` - CPU usage alert threshold (default: 80%)
- \`REPORTS_DIR\` - Directory for storing reports
- \`METRICS_RETENTION_DAYS\` - Number of days to keep old metrics

### Automated Collection

To automatically collect metrics every 15 minutes, add to crontab:

\`\`\`bash
crontab -e
# Add these lines:
*/15 * * * * /usr/local/bin/analytics.sh collect >> /var/log/analytics/cron.log 2>&1
0 3 * * * /usr/local/bin/analytics.sh cleanup >> /var/log/analytics/cron.log 2>&1
\`\`\`

## Output Files

- **Metrics**: \`/var/log/analytics/metrics-YYYYMMDD.json\`
- **Logs**: \`/var/log/analytics/analytics.log\`
- **Reports**: \`/var/log/analytics/system_report_*.txt\`

## Metrics Format

Metrics are stored in JSON format:

\`\`\`json
[
  {
    "timestamp": "2023-11-01T12:00:00Z",
    "cpu_temperature": 45,
    "memory_usage_percent": 65,
    "memory_used_bytes": 536870912,
    "memory_total_bytes": 1073741824,
    "cpu_usage_percent": 15.3,
    "load_average_1min": 0.45,
    "disk_usage_percent": 42
  }
]
\`\`\`

## Examples

### Monitor system in real-time
\`\`\`bash
analytics.sh monitor
\`\`\`
Press 'r' to refresh, 'q' to quit, 's' to save a report.

### Generate and email a weekly report
\`\`\`bash
analytics.sh report /tmp/weekly-report.txt
mail -s "Weekly System Report" admin@example.com < /tmp/weekly-report.txt
\`\`\`

### Export last week's metrics to CSV for analysis
\`\`\`bash
for day in {1..7}; do
  date_str=$(date -d "$day days ago" +%Y%m%d)
  if [ -f "/var/log/analytics/metrics-$date_str.json" ]; then
    analytics.sh export "/var/log/analytics/metrics-$date_str.json"
  fi
done
\`\`\`

## Troubleshooting

### Permission Issues
Make sure the script has execute permissions:
\`\`\`bash
sudo chmod +x /usr/local/bin/analytics.sh
\`\`\`

### Missing Dependencies
Install manually if needed:
\`\`\`bash
sudo apt-get install jq net-tools sysstat
\`\`\`

### Log Files Growing Too Large
Run the cleanup command regularly:
\`\`\`bash
analytics.sh cleanup 7  # Keep only last 7 days
\`\`\`

## Support

For issues or questions, please refer to the project documentation or create an issue in the project repository.
`;
}
