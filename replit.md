# Pi-Gen Configuration Tool

## Overview

This is a full-stack web application that helps users create and configure custom Raspberry Pi OS images using Pi-Gen. The tool provides a user-friendly interface for building custom configurations, managing project files, and exporting ready-to-use Pi-Gen project structures.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with custom styling
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Style**: REST API with JSON responses
- **Session Management**: Express sessions with PostgreSQL store
- **File Handling**: Multer for file uploads, JSZip for project exports

### Development Setup
- **Monorepo Structure**: Shared code between client and server
- **Hot Module Replacement**: Vite middleware integrated with Express
- **Type Safety**: Shared TypeScript schemas between frontend and backend
- **Path Aliases**: Configured for clean imports (`@/`, `@shared/`)

## Key Components

### Project Management
- **Project Creation**: Users can create new Pi-Gen projects with custom configurations
- **Project Storage**: Projects stored in PostgreSQL with metadata and configuration
- **File Management**: Hierarchical file system for organizing Pi-Gen stages and scripts

### Configuration System
- **Pi-Gen Config**: Structured configuration for image name, release, locale, timezone, etc.
- **Stage Management**: Support for multiple Pi-Gen stages (stage0-stage4) with individual settings
- **Package Management**: Interface for adding/removing packages per stage
- **Script Editor**: Code editor for custom bash scripts with syntax highlighting

### File System
- **Virtual File Tree**: Hierarchical representation of Pi-Gen project structure
- **File Upload**: Support for uploading custom files to project directories
- **Code Editor**: Monaco Editor integration for editing scripts and configuration files
- **Export System**: ZIP file generation for complete Pi-Gen projects

### User Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Component Library**: Comprehensive UI components based on Radix UI
- **Dark Mode**: CSS variables-based theming system
- **Toast Notifications**: User feedback for operations
- **Modal Dialogs**: For project creation, file management, and exports

## Data Flow

### Project Workflow
1. User creates a new project with basic configuration
2. System generates default Pi-Gen directory structure
3. User configures image settings, packages, and custom scripts
4. User can upload additional files and organize project structure
5. Project is exported as ZIP file ready for Pi-Gen processing

### Data Persistence
- Projects stored in `projects` table with JSON configuration
- Project files stored in `project_files` table with hierarchical paths
- In-memory storage fallback for development (MemStorage class)
- Session-based state management for user interactions

### API Communication
- RESTful endpoints for CRUD operations on projects and files
- JSON serialization for all data exchange
- Error handling with appropriate HTTP status codes
- Request/response logging for debugging

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (PostgreSQL serverless)
- **Authentication**: Express sessions with PostgreSQL storage
- **File Processing**: JSZip for project exports
- **Code Editor**: Monaco Editor for syntax highlighting
- **UI Components**: Radix UI primitives
- **Form Validation**: Zod for runtime type checking

### Development Dependencies
- **Build Tools**: Vite, ESBuild for production builds
- **Type Checking**: TypeScript with strict mode enabled
- **Linting**: ESLint configuration (implied by project structure)
- **CSS Processing**: PostCSS with Tailwind CSS and Autoprefixer

### Third-Party Integrations
- **Replit Integration**: Development environment optimizations
- **CDN Resources**: Monaco Editor workers via CDN
- **Font Loading**: Custom font stack for code editor

## Deployment Strategy

### Production Build
- **Client Build**: Vite builds optimized React application to `dist/public`
- **Server Build**: ESBuild bundles Express server to `dist/index.js`
- **Static Assets**: Served directly by Express in production
- **Environment Variables**: Database URL and other config via environment

### Development Environment
- **Hot Reloading**: Vite middleware provides instant updates
- **Proxy Setup**: Express serves as proxy for Vite dev server
- **Database Migrations**: Drizzle Kit for schema management
- **Session Storage**: PostgreSQL-backed sessions for persistence

### Scalability Considerations
- **Database**: Serverless PostgreSQL scales automatically
- **File Storage**: In-database file storage suitable for moderate usage
- **Session Management**: PostgreSQL sessions support horizontal scaling
- **Static Assets**: Can be moved to CDN for better performance

### Security Measures
- **Input Validation**: Zod schemas validate all user inputs
- **SQL Injection Prevention**: Drizzle ORM provides query safety
- **File Upload Security**: Multer with memory storage prevents disk attacks
- **Session Security**: Secure session configuration with PostgreSQL storage