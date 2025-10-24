# Overview

This project is a **MONOREPO** comprising two core applications:

1.  **NuP-Kan**: A Kanban board application offering drag-and-drop task management, Work-In-Progress (WIP) limits, analytics, and team collaboration features.
2.  **NuPIdentity**: A centralized identity and access management platform acting as an OAuth2/OIDC provider for all NuPtechs systems. It facilitates Single Sign-On (SSO), centralized authentication, and granular permission management across multiple systems.

Both applications share a single PostgreSQL database, with NuPIdentity tables uniquely prefixed to prevent conflicts. The project aims to provide a robust, scalable task management solution integrated with a secure, flexible identity platform for the NuPtechs ecosystem.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## NuPIdentity - Central Identity Platform

### Server Backend
-   **Framework**: Express.js with TypeScript (running on port 3001).
-   **Authentication**: JWT tokens with refresh token mechanism.
-   **Database**: Shared PostgreSQL instance with NuP-Kan; `identity_` prefixed tables.
-   **ORM**: Drizzle ORM, utilizing direct SQL queries for schema compatibility.

### Data Model
-   **Core Tables (`identity_` prefix)**:
    -   `systems`: Registered applications (e.g., NuP-Kan).
    -   `functions`: System-specific permissions, synchronized via `permissions.json`.
    -   `profiles`: Access roles (e.g., "Global Administrator").
    -   `profile_functions`: N:N relationship between profiles and functions.
    -   `user_profiles`: N:N relationship between users and profiles.
    -   `teams`: Organizational teams.
    -   `user_teams`: N:N relationship between users and teams.
    -   `oauth_clients`, `oauth_tokens`, `webauthn_credentials`.
-   **Auxiliary Tables**: `kanUsers` (mirrors NuP-Kan `users` for read-only access), `identity_user_metadata`.

### API Endpoints (Core Functionality)
-   **Authentication (`/api/auth`)**: Register, Login (returns JWT), Refresh Token, Logout, Get authenticated user data (`/me`).
-   **Validation (`/api`)**: Validate JWT tokens, retrieve user-specific permissions for all systems or a specific system.
-   **Systems (`/api/systems`)**: List registered systems, synchronize functions from `permissions.json`.

### Frontend Architecture
-   **Framework**: React with TypeScript and Vite (integrated with Express via custom middleware).
-   **UI/UX**: `shadcn/ui` component library with Radix UI primitives, styled with Tailwind CSS matching NuP-Kan design system.
-   **State Management**: TanStack Query for server state, React Hook Form with Zod for form validation.
-   **Routing**: Wouter for client-side routing.
-   **Development**: Vite dev server integrated via custom `server/vite.ts` middleware with HMR support.

### Frontend Features
-   **Login Page**: Email/password authentication with real-time validation and error handling.
-   **Registration Flow**: User signup with validation and automatic JWT token handling.
-   **Auto-login Check**: Automatically verifies if user has valid session on page load.
-   **Type-Safe API**: queryClient configured with automatic token attachment and error handling.

### Single Sign-On (SSO) Flow
The system supports a standard SSO flow where NuP-Kan redirects to NuPIdentity for user authentication, receiving a JWT token in return. Subsequent API calls from NuP-Kan to NuPIdentity validate the token and fetch user permissions.

## NuP-Kan - Kanban Board Application

### Frontend Architecture
-   **Framework**: React with TypeScript and Vite.
-   **UI/UX**: `shadcn/ui` component library built on Radix UI primitives, styled with Tailwind CSS using a custom design system.
-   **State Management**: TanStack Query for server state.
-   **Routing**: Wouter for client-side routing.
-   **Interactivity**: `react-beautiful-dnd` for drag-and-drop, React Hook Form with Zod for form management.

### Backend Architecture
-   **Framework**: Express.js with TypeScript.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **API Design**: RESTful JSON API.
-   **Development**: Vite middleware for integrated full-stack development.

### Data Layer
-   **ORM**: Drizzle ORM for PostgreSQL.
-   **Schema**: Shared type-safe schemas between client and server using Drizzle-Zod.
-   **Database Structure**: Includes tables for tasks, columns (with WIP limits), team members, users, teams, and a `UserTeams` junction table for N:N user-team relationships with roles. Profiles and permissions tables support access control.
-   **Persistence**: All application data (tasks, columns, teams, user-team relationships) is stored in PostgreSQL.
-   **User-Team Management API**: Full CRUD operations for managing user-team memberships and roles.

### Key Features
-   **Kanban Board**: Column-based task organization with drag-and-drop.
-   **WIP Limits**: Configurable limits per column with visual feedback.
-   **Task Management**: Comprehensive CRUD for tasks with real-time updates.
-   **Team Management**: User assignment and status tracking within teams.
-   **Analytics**: Performance metrics (cycle time, throughput).
-   **Settings Panel**: Dynamic board customization.
-   **Timeline & Comments**: Task history and comments integrated into task details.
-   **Email System**: Automated emails (e.g., welcome emails) using SendGrid with responsive HTML templates.

### Development Patterns
-   **Monorepo**: Client, server, and shared code within a single repository.
-   **Type Safety**: End-to-end TypeScript with shared types and schema validation.
-   **Component-Based UI**: Reusable UI components.
-   **API Integration**: Consistent error handling and loading states for data operations.

# External Dependencies

## Database
-   **Neon Database**: Serverless PostgreSQL hosting.

## UI Frameworks
-   **shadcn/ui**: Component library.
-   **Radix UI**: Low-level UI primitives.
-   **Tailwind CSS**: Utility-first CSS framework.

## Development Tools
-   **Vite**: Build tool and dev server.
-   **TypeScript**: Static type checking.
-   **ESBuild**: Fast JavaScript bundler.

## Runtime Libraries
-   **TanStack Query**: Server state management.
-   **React Beautiful DnD**: Drag-and-drop.
-   **React Hook Form**: Form management.
-   **Zod**: Runtime type validation.
-   **Date-fns**: Date manipulation utilities.
-   **SendGrid**: Email service provider.