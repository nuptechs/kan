# Overview

This project has been transformed into a **MONOREPO** containing two applications:

1. **NuP-Kan**: Kanban board application with drag-and-drop task management, WIP limits, analytics, and team collaboration
2. **NuPIdentity**: Centralized identity and access management platform (SSO provider) for all NuPtechs systems

Both applications share the same PostgreSQL database, with NuPIdentity tables using `identity_` prefix to avoid conflicts. The NuPIdentity platform provides OAuth2/OIDC authentication, permission management, and Single Sign-On (SSO) for multiple company systems.

**MONOREPO STRUCTURE:**
```
/
├── client/                  # NuP-Kan Frontend (React + Vite)
├── server/                  # NuP-Kan Backend (Express)
├── shared/                  # NuP-Kan Shared Types (Drizzle schemas)
├── nupidentity/
│   ├── client/             # NuPIdentity Frontend (React + Vite) - TODO
│   ├── server/             # NuPIdentity Backend (Express on port 3001)
│   └── shared/             # NuPIdentity Shared Types (Drizzle schemas)
├── permissions.json        # NuP-Kan functions manifest (64 functions)
└── package.json            # Root package with workspaces
```

**Recent Updates (October 24, 2025):**
- ✅ **MONOREPO TRANSFORMATION**: Projeto convertido para monorepo com NuP-Kan + NuPIdentity
- ✅ **NUPIDENTITY CORE**: Central de Identidade implementada como OAuth2/OIDC provider
- ✅ **DATABASE SCHEMA**: 10 tabelas com prefixo `identity_` + tabelas auxiliares (kanUsers, identity_user_metadata)
- ✅ **PERMISSIONS SYSTEM**: 64 funções do NuP-Kan mapeadas e sincronizadas via permissions.json
- ✅ **SEED COMPLETE**: Sistema NuP-Kan registrado + perfil "Administrador Global" + usuário admin (yfaf01@gmail.com)
- ✅ **AUTH APIs**: Login JWT, validação de tokens, busca de permissões - todas funcionando
- ✅ **DEVELOPMENT READY**: Servidor NuPIdentity rodando na porta 3001 com Express + PostgreSQL

**Previous Updates (August 26, 2025):**
- ✅ **CRITICAL ARCHITECTURE FIX**: Corrigida inconsistência grave entre MemStorage e DatabaseStorage
- ✅ **PRODUCTION READY**: MemStorage completamente removido - sistema usa apenas PostgreSQL
- ✅ **CODE CLEANUP**: Arquivo storage.ts reduzido de 2300+ para 1150 linhas (~50% menor)
- ✅ **DRAG & DROP COLUMNS**: DatabaseStorage agora cria colunas padrão (Backlog, To Do, In Progress, Review, Done)
- ✅ **DATA INTEGRITY**: Boards no PostgreSQL não ficam mais vazios, permitindo funcionalidade completa do Kanban
- ✅ **COLOR MAPPING**: Adicionado suporte a códigos hex e nomes de cores nas colunas
- ✅ **OPTIMISTIC UPDATES**: Melhorada responsividade do drag and drop com atualizações otimistas

**Previous Updates (August 24, 2025):**
- ✅ **BRANDING UPDATE**: Nome da aplicação alterado de "uP - Kan" para "NuP-Kan"

**Previous Updates (August 22, 2025):**
- ✅ **BRANDING UPDATE**: Nome da aplicação alterado de "Kanban Flow" para "uP - Kan"
- ✅ Logo personalizado adicionado com a letra "N" estilizada
- ✅ Timeline implementada como histórico dentro dos detalhes das tasks
- ✅ Sistema de comentários adicionado à timeline para histórico completo
- ✅ Diferenciação visual entre eventos automáticos e comentários de usuários
- ✅ Timeline removida do kanban board e movida para modal de detalhes
- ✅ Interface minimalista e moderna para timeline com scroll automático
- ✅ **CRITICAL FIX**: Corrigidos erros de apiRequest com parâmetros invertidos
- ✅ Sistema de reordenação de colunas totalmente funcional
- ✅ Limites WIP aprimorados com verificação correta
- ✅ **EMAIL SYSTEM**: Sistema de emails implementado com SendGrid
- ✅ Emails de boas-vindas automáticos para novos usuários
- ✅ Templates HTML responsivos com branding NuP-Kan

**Previous Updates (August 21, 2025):**
- ✅ Sistema completo de gerenciamento de times implementado com CRUD total
- ✅ API de teams totalmente funcional com PostgreSQL
- ✅ Interface em português para criação, edição e exclusão de times
- ✅ Correções de erros LSP e avisos de acessibilidade nos dialogs
- ✅ **MAJOR UPDATE**: Implementado relacionamento N:N entre usuários e times
- ✅ Criada tabela `user_teams` para permitir usuários em múltiplos times
- ✅ Migração completa do campo `teamId` para nova estrutura relacional
- ✅ APIs novas para gerenciar membros de times: GET, POST, PATCH, DELETE

# User Preferences

Preferred communication style: Simple, everyday language.

# NuPIdentity - Central de Identidade

## Visão Geral
**NuPIdentity** é a plataforma centralizada de identidade e controle de acesso para todos os sistemas da NuPtechs. Funciona como um **OAuth2/OIDC Identity Provider (IdP)** que permite:

- **Single Sign-On (SSO)**: Usuários fazem login uma vez e acessam todos os sistemas
- **Autenticação Centralizada**: JWT tokens, WebAuthn (biometria), social login (Google, GitHub, Apple)
- **Gerenciamento de Permissões**: Controle granular de acesso baseado em funções por sistema
- **Multi-tenant**: Suporta múltiplos sistemas (NuP-Kan, futuros sistemas NuPtechs)

## Arquitetura do NuPIdentity

### Servidor Backend
- **Framework**: Express.js com TypeScript (porta 3001)
- **Autenticação**: JWT tokens com refresh tokens
- **Database**: PostgreSQL compartilhado com NuP-Kan (tabelas prefixadas com `identity_`)
- **ORM**: Drizzle ORM com queries SQL diretas para compatibilidade de schema

### Estrutura de Tabelas

#### Tabelas Principais (prefixo `identity_`)
1. **systems**: Sistemas registrados na plataforma (ex: NuP-Kan)
   - Campos: id, name, redirect_uris, client_secret, active, created_at, updated_at
2. **functions**: Funções/permissões de cada sistema (sincronizadas via permissions.json)
   - Campos: id, system_id, function_key, name, category, endpoint, description
3. **profiles**: Perfis de acesso (ex: "Administrador Global", "Gerente", "Usuário")
   - Campos: id, name, description, system_id, is_global, active
4. **profile_functions**: Relacionamento N:N entre perfis e funções
   - Campos: profile_id, function_id, granted
5. **user_profiles**: Relacionamento N:N entre usuários e perfis
   - Campos: user_id, profile_id, assigned_at, assigned_by
6. **teams**: Times/equipes organizacionais
   - Campos: id, name, description, created_at, updated_at
7. **user_teams**: Relacionamento N:N entre usuários e times
   - Campos: user_id, team_id, role, joined_at
8. **oauth_clients**: Clientes OAuth2 registrados
9. **oauth_tokens**: Tokens OAuth2 e refresh tokens
10. **webauthn_credentials**: Credenciais biométricas WebAuthn

#### Tabelas Auxiliares
- **kanUsers**: Schema espelhado da tabela `users` do NuP-Kan para leitura (evita conflitos com Drizzle)
- **identity_user_metadata**: Metadados específicos do NuPIdentity (OAuth providers, WebAuthn)

### APIs Implementadas

#### Autenticação (`/api/auth`)
- **POST /api/auth/register**: Criar novo usuário
- **POST /api/auth/login**: Login com email/senha → retorna JWT access_token
- **POST /api/auth/refresh**: Renovar access_token usando refresh_token
- **POST /api/auth/logout**: Invalidar tokens
- **GET /api/auth/me**: Obter dados do usuário autenticado

#### Validação (`/api`)
- **POST /api/validate/token**: Validar JWT token e retornar dados do usuário
- **GET /api/users/:userId/permissions**: Buscar todas as permissões de um usuário (64 funções para admin)
- **GET /api/users/:userId/systems/:systemId/permissions**: Permissões de um usuário para sistema específico

#### Sistemas (`/api/systems`)
- **GET /api/systems**: Listar sistemas registrados
- **POST /api/systems/:systemId/sync-functions**: Sincronizar funções do permissions.json

### Fluxo de Autenticação SSO

```
┌─────────────┐           ┌──────────────┐           ┌─────────────┐
│   NuP-Kan   │           │  NuPIdentity │           │  PostgreSQL │
│  (port 5000)│           │ (port 3001)  │           │             │
└──────┬──────┘           └──────┬───────┘           └──────┬──────┘
       │                         │                          │
       │ 1. Redirect to login    │                          │
       ├────────────────────────>│                          │
       │                         │                          │
       │ 2. User enters credentials                         │
       │                         │ 3. Validate user         │
       │                         ├─────────────────────────>│
       │                         │<─────────────────────────┤
       │                         │ 4. User data + permissions
       │                         │                          │
       │ 5. JWT token            │                          │
       │<────────────────────────┤                          │
       │                         │                          │
       │ 6. Call NuP-Kan API     │                          │
       │    with JWT token       │                          │
       │─────────────────────────────────────────────────────>
       │                         │                          │
       │ 7. Validate token       │                          │
       ├────────────────────────>│                          │
       │                         │ 8. Get permissions       │
       │                         ├─────────────────────────>│
       │                         │<─────────────────────────┤
       │ 9. User data + perms    │                          │
       │<────────────────────────┤                          │
       │                         │                          │
       │ 10. Response with data  │                          │
       │<─────────────────────────────────────────────────────
```

### Dados de Teste

**Usuário Admin Configurado:**
- Email: `yfaf01@gmail.com`
- Senha: `123456`
- Perfil: "Administrador Global" (todas as 64 permissões do NuP-Kan)
- UUID: `e84b8e4a-c0b7-414f-9228-35b068af12b9`

**Sistema Registrado:**
- Sistema: NuP-Kan (`nup-kan`)
- Funções: 64 funções sincronizadas de `permissions.json`
- Categorias: Analytics, Boards, Columns, Comments, Members, Settings, Tasks, Teams

### Status de Implementação

✅ **CONCLUÍDO:**
- Schema do banco de dados (10 tabelas + auxiliares)
- Servidor Express com todas as rotas de autenticação
- JWT token generation e validação
- Seed script com sistema NuP-Kan + perfil admin + usuário
- APIs testadas e funcionando:
  - Login retorna JWT token válido
  - GET /api/auth/me retorna dados do usuário
  - GET /api/users/:id/permissions retorna 64 permissões

🚧 **TODO:**
- Frontend do NuPIdentity (React + shadcn/ui)
- OAuth2/OIDC authorization flow completo
- WebAuthn biometric authentication
- Social login (Google, GitHub, Apple)
- Integração do NuP-Kan com NuPIdentity SSO
- Dashboard de gerenciamento de usuários e permissões

# System Architecture (NuP-Kan)

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Built with shadcn/ui components library and Radix UI primitives
- **Styling**: Tailwind CSS with a custom design system using CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Drag & Drop**: react-beautiful-dnd for kanban board interactions
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Development**: Vite middleware integration for seamless full-stack development

## Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL database with persistent storage
- **Schema**: Shared schema definitions between client and server using Drizzle-Zod
- **Database Structure**: 
  - Tasks table with title, description, status, priority, assignee, and progress tracking
  - Columns table for kanban board configuration with WIP limits
  - Team members table for user management
  - Users table (without teamId field - replaced by many-to-many)
  - Teams table for team information
  - **UserTeams table**: Junction table implementing N:N relationship between users and teams with role field
  - Profiles and permissions tables for access control system
- **Storage**: DatabaseStorage class implementing full CRUD operations with PostgreSQL
- **Migrations**: Drizzle Kit for database schema migrations (`npm run db:push`)
- **Data Persistence**: All tasks, columns, team members, and user-team relationships stored in PostgreSQL
- **User-Team Management**: Complete API for many-to-many relationships with role-based access
  - GET `/api/users/:userId/teams` - Get all teams for a user
  - GET `/api/teams/:teamId/users` - Get all users in a team  
  - POST `/api/users/:userId/teams/:teamId` - Add user to team with role
  - DELETE `/api/users/:userId/teams/:teamId` - Remove user from team
  - PATCH `/api/users/:userId/teams/:teamId` - Update user role in team

## Key Features Architecture
- **Kanban Board**: Column-based task organization with drag-and-drop reordering
- **WIP Limits**: Configurable work-in-progress limits per column with visual indicators
- **Task Management**: Full CRUD operations with real-time updates
- **Team Management**: User assignment and status tracking
- **Analytics**: Performance metrics including cycle time and throughput
- **Settings Panel**: Dynamic configuration for board customization

## Development Patterns
- **Monorepo Structure**: Client, server, and shared code in a single repository
- **Type Safety**: End-to-end TypeScript with shared types and schema validation
- **Component Architecture**: Reusable UI components with proper separation of concerns
- **API Integration**: Consistent error handling and loading states across all data operations

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database hosting
- **Connection**: Uses DATABASE_URL environment variable for connection configuration

## UI Framework
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Low-level UI primitives for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework for styling

## Development Tools
- **Vite**: Build tool and development server with React support
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment integration with error overlay and cartographer

## Runtime Libraries
- **TanStack Query**: Server state management and caching
- **React Beautiful DnD**: Drag and drop functionality for kanban board
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities