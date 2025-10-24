# 🔐 NuPIdentity - Central de Identidade NuPtechs

Plataforma centralizada de identidade e gerenciamento de acesso para todos os sistemas NuPtechs. Fornece Single Sign-On (SSO), autenticação centralizada e gerenciamento granular de permissões.

## 🚀 Quick Start

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Banco de Dados
```bash
# Sincronizar schema
npm run db:push

# Popular dados iniciais
npm run db:seed
```

### 3. Iniciar Servidor
```bash
npm run dev
```

Acesse: http://localhost:3001

## 🔑 Credenciais Padrão

Após executar `npm run db:seed`:

- **Email**: yfaf01@gmail.com
- **Senha**: 123456
- **Perfil**: Administrador Global

## 📋 Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

- **DATABASE_URL**: Connection string PostgreSQL
- **JWT_SECRET**: Chave para assinar tokens JWT
- **SESSION_SECRET**: Chave para sessões Express

## 🏗️ Arquitetura

### Backend
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Auth**: JWT + Refresh Tokens

### Frontend
- **Framework**: React + TypeScript
- **Build**: Vite
- **UI**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State**: TanStack Query

## 📦 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run db:push      # Sync database schema
npm run db:seed      # Popular banco com dados
```

## 📚 Documentação

Consulte `MIGRATION_GUIDE.md` para instruções detalhadas de setup e migração.

## 🔒 Segurança

- Autenticação JWT com refresh tokens
- Senhas hash com bcrypt
- CORS configurado
- Rate limiting (a implementar)
- WebAuthn suporte (a implementar)

## 🌐 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário atual

### Validação
- `POST /api/validate/token` - Validar JWT
- `GET /api/users/:id/permissions` - Permissões do usuário
- `GET /api/users/:id/systems/:systemId/permissions` - Permissões por sistema

### Sistemas
- `GET /api/systems` - Listar sistemas registrados
- `POST /api/systems/:id/sync` - Sincronizar permissões

## 🤝 Contribuindo

Este é um projeto interno NuPtechs para gerenciamento centralizado de identidade.

## 📄 Licença

Propriedade de NuPtechs © 2025
