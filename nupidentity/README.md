# NuPIdentity 🔐

**Central de Identidade e Autenticação da NuPtechs**

Sistema centralizado de autenticação e gerenciamento de permissões para todos os sistemas da NuPtechs (NuP-Kan, NuP-CRM, NuP-ERP, etc).

## 🎯 Funcionalidades

### Autenticação Múltipla
- ✅ **Email + Senha** - Autenticação tradicional com bcrypt
- 🔄 **Replit Auth** - Login social com Google, GitHub, Apple
- 🔐 **WebAuthn/Passkeys** - Autenticação biométrica (impressão digital, Face ID)

### Gerenciamento de Identidade
- 👤 **Usuários** - CRUD completo de usuários
- 👥 **Times** - Organização em times (N:N com usuários)
- 🎭 **Perfis de Acesso** - Conjuntos de permissões reutilizáveis
- ⚙️ **Sistemas Integrados** - Registro de sistemas clientes (NuP-Kan, etc)
- 🔑 **Funções/Permissões** - Sincronização via permissions.json

### Single Sign-On (SSO)
- 🎫 **JWT Tokens** - Access tokens (1h) + Refresh tokens (7 dias)
- 🔍 **Validação Centralizada** - Sistemas clientes validam tokens via API
- 📊 **Permissões Granulares** - Controle fino de acesso por função

## 🏗️ Arquitetura

```
NuPIdentity (Servidor Central OAuth2/OIDC)
    ↓ JWT Token
    ├─→ NuP-Kan (Sistema Cliente)
    ├─→ NuP-CRM (Sistema Cliente)
    └─→ NuP-ERP (Sistema Cliente)
```

## 📦 Stack Tecnológica

- **Backend**: Express.js + TypeScript
- **Frontend**: React + Vite + shadcn/ui
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Auth**: JWT + bcrypt + @simplewebauthn
- **OAuth**: openid-client (Replit Auth)

## 🚀 Desenvolvimento

```bash
# Instalar dependências
npm install

# Push schema para banco de dados
npm run db:push

# Iniciar servidor de desenvolvimento
npm run dev
```

Servidor roda em: `http://localhost:5001`

## 📁 Estrutura

```
nupidentity/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Login, Dashboard Admin)
│   │   ├── components/    # Componentes UI (shadcn)
│   │   └── lib/           # Utilitários
│   └── index.html
├── server/                # Backend Express
│   ├── index.ts           # Servidor principal
│   ├── db.ts              # Conexão banco
│   ├── config.ts          # Configurações
│   ├── auth/              # Lógica de autenticação
│   │   ├── jwt.ts         # Geração/validação JWT
│   │   └── password.ts    # bcrypt hashing
│   ├── middleware/        # Middlewares Express
│   │   └── auth.ts        # requireAuth, optionalAuth
│   └── routes/            # Rotas da API
│       ├── auth.routes.ts       # POST /login, /register, /refresh
│       └── validation.routes.ts # GET /users/:id/permissions
├── shared/
│   └── schema.ts          # Schema Drizzle (compartilhado)
└── package.json
```

## 🔗 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login (email + senha)
- `POST /api/auth/refresh` - Renovar access token
- `POST /api/auth/logout` - Logout (invalida refresh token)
- `GET /api/auth/me` - Usuário autenticado atual

### Validação (para sistemas clientes)
- `POST /api/validate/token` - Validar JWT token
- `GET /api/users/:userId/permissions` - Todas permissões do usuário
- `GET /api/users/:userId/systems/:systemId/permissions` - Permissões para sistema específico
- `POST /api/users/:userId/systems/:systemId/check` - Verificar função específica

## 🔐 Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# OAuth (Replit Auth)
REPLIT_CLIENT_ID=your-client-id
REPLIT_CLIENT_SECRET=your-client-secret

# WebAuthn
RP_ID=localhost
ORIGIN=http://localhost:5001

# Session
SESSION_SECRET=your-session-secret

# Features
ENABLE_REGISTRATION=true
ENABLE_SOCIAL_LOGIN=true
ENABLE_PASSKEYS=true

# CORS
CORS_ORIGINS=http://localhost:5000,http://localhost:5001
```

## 📝 Próximos Passos

- [ ] Implementar Replit Auth (Google, GitHub, Apple)
- [ ] Implementar WebAuthn/Passkeys
- [ ] Criar UI admin dashboard
- [ ] Implementar APIs de gerenciamento (CRUD sistemas, usuários, perfis)
- [ ] Integrar com NuP-Kan
- [ ] Migrar usuários existentes

## 📄 Licença

MIT
