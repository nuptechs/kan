# Overview

Este projeto é o **NuP-Kan**, uma aplicação Kanban com drag-and-drop, gestão de tarefas, limites WIP, analytics e colaboração em equipe.

## Arquitetura Multi-Projeto

O ecossistema NuPtechs é composto por **projetos separados** que se integram:

### 1. **NuP-Kan** (Este Projeto)
- **Descrição**: Sistema de gerenciamento de projetos com quadros Kanban
- **URL**: `nupkan.replit.dev`
- **Porta**: 5000
- **Banco de Dados**: PostgreSQL exclusivo

### 2. **NuPIdentify** (Projeto Separado)
- **Descrição**: Central de identidade e autenticação (OAuth2/OIDC provider)
- **URL**: `nupidentify.replit.dev`
- **Porta**: 3001
- **Banco de Dados**: PostgreSQL exclusivo
- **Função**: SSO, autenticação centralizada, gerenciamento de permissões

### 3. Integração Entre Sistemas
- NuP-Kan **sincroniza automaticamente** suas permissões (`permissions.json`) com NuPIdentify
- NuP-Kan **valida tokens JWT** emitidos pelo NuPIdentify
- NuP-Kan **consulta permissões** do usuário via API do NuPIdentify
- Pasta `examples/` contém código de referência para integração

## User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture - NuP-Kan

## Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI/UX**: `shadcn/ui` component library built on Radix UI primitives, styled with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Interactivity**: `react-beautiful-dnd` for drag-and-drop, React Hook Form with Zod for form management

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful JSON API
- **Development**: Vite middleware for integrated full-stack development

## Data Layer
- **ORM**: Drizzle ORM for PostgreSQL
- **Schema**: Shared type-safe schemas between client and server using Drizzle-Zod
- **Database Structure**: Includes tables for tasks, columns (with WIP limits), team members, users, teams, and a `UserTeams` junction table for N:N user-team relationships with roles. Profiles and permissions tables support access control.
- **Persistence**: All application data (tasks, columns, teams, user-team relationships) is stored in PostgreSQL

## Key Features
- **Kanban Board**: Column-based task organization with drag-and-drop
- **WIP Limits**: Configurable limits per column with visual feedback
- **Task Management**: Comprehensive CRUD for tasks with real-time updates
- **Team Management**: User assignment and status tracking within teams
- **Analytics**: Performance metrics (cycle time, throughput)
- **Settings Panel**: Dynamic board customization
- **Timeline & Comments**: Task history and comments integrated into task details
- **Email System**: Automated emails using SendGrid with responsive HTML templates

## Integration with NuPIdentify

### Automatic Permission Synchronization
NuP-Kan mantém um arquivo `permissions.json` que define todas as funcionalidades do sistema. Este arquivo é **automaticamente sincronizado** com o NuPIdentify sempre que:

1. **Na inicialização do servidor** - Sincronização inicial
2. **A cada 5 minutos** - Sincronização periódica automática
3. **Manualmente** - Via comando `npm run sync:permissions`
4. **Após alterações** - Quando o arquivo `permissions.json` é modificado

### Permission Structure (`permissions.json`)
```json
{
  "system": {
    "id": "nup-kan",
    "name": "NuP-Kan - Sistema Kanban",
    "description": "Sistema de gerenciamento de projetos com quadros Kanban",
    "version": "1.0.0",
    "apiUrl": "https://nupkan.replit.dev"
  },
  "functions": [
    {
      "key": "tasks-list",
      "name": "Listar Tasks",
      "category": "Tasks",
      "description": "Permitir listar tasks",
      "endpoint": "GET /api/tasks"
    }
  ]
}
```

### Environment Variables Required
```bash
# URL do NuPIdentify
IDENTITY_URL=https://nupidentify.replit.dev

# Token de administrador para sincronização
IDENTITY_SYNC_TOKEN=<jwt-token-admin>

# Habilitar sincronização automática (default: true)
AUTO_SYNC_PERMISSIONS=true

# Intervalo de sincronização em minutos (default: 5)
SYNC_INTERVAL_MINUTES=5
```

### Sync Service Features
- ✅ Sincronização automática na inicialização
- ✅ Sincronização periódica (intervalo configurável)
- ✅ Retry automático em caso de falha (3 tentativas)
- ✅ Logs detalhados de todas as operações
- ✅ Verificação de conectividade com NuPIdentify
- ✅ Graceful shutdown ao parar o servidor

### Manual Sync Commands
```bash
# Sincronizar permissões manualmente
npm run sync:permissions

# Verificar diferenças sem sincronizar
npm run sync:check
```

### Integration Examples
A pasta `examples/` contém código de referência:
- `express-integration.js` - Exemplo completo de API integrada
- `middleware-auth.js` - Middleware de autenticação e autorização
- `sync-permissions.js` - Script standalone de sincronização
- `README.md` - Documentação detalhada

## Development Patterns
- **Type Safety**: End-to-end TypeScript with shared types and schema validation
- **Component-Based UI**: Reusable UI components
- **API Integration**: Consistent error handling and loading states for data operations
- **Permission-Based Access**: Integration with NuPIdentify for centralized permission management

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL hosting (banco exclusivo para NuP-Kan)

## UI Frameworks
- **shadcn/ui**: Component library
- **Radix UI**: Low-level UI primitives
- **Tailwind CSS**: Utility-first CSS framework

## Development Tools
- **Vite**: Build tool and dev server
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler

## Runtime Libraries
- **TanStack Query**: Server state management
- **React Beautiful DnD**: Drag-and-drop
- **React Hook Form**: Form management
- **Zod**: Runtime type validation
- **Date-fns**: Date manipulation utilities
- **SendGrid**: Email service provider

## Integration
- **NuPIdentify**: Centralized identity and permission management (projeto separado)

# Recent Changes

## 2025-10-25: Migração para Arquitetura Multi-Projeto
- ✅ NuPIdentify migrado para projeto Replit separado
- ✅ Banco de dados PostgreSQL exclusivo para cada projeto
- ✅ Sistema de sincronização automática de permissões implementado
- ✅ Pasta `examples/` criada com código de integração
- ✅ Scripts npm adicionados para facilitar sincronização
- ✅ Documentação atualizada para refletir nova arquitetura
