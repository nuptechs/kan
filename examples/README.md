# 📚 Exemplos de Integração NuPIdentity

Esta pasta contém exemplos práticos de como integrar seu sistema com o NuPIdentity.

## 📁 Arquivos

### 1. `sync-permissions.js`
Script para sincronizar o `permissions.json` com o NuPIdentity.

**Uso:**
```bash
export IDENTITY_URL="http://localhost:5000"
export IDENTITY_ADMIN_TOKEN="seu-token-jwt"
node examples/sync-permissions.js
```

**Opções:**
- `IDENTITY_URL`: URL do servidor NuPIdentity (padrão: http://localhost:5000)
- `IDENTITY_ADMIN_TOKEN`: Token JWT de administrador (obrigatório)
- `PERMISSIONS_FILE`: Caminho do arquivo permissions.json (padrão: ./permissions.json)

### 2. `middleware-auth.js`
Middlewares de autenticação e autorização para Express.js.

**Funções:**
- `authenticate(req, res, next)`: Valida o token JWT
- `authorize(functionKey)`: Valida permissão específica
- `authorizeCached(functionKey)`: Valida com cache (5 minutos)
- `clearPermissionCache(userId)`: Limpa cache de um usuário

### 3. `express-integration.js`
Exemplo completo de API Express.js integrada com NuPIdentity.

**Uso:**
```bash
export IDENTITY_URL="http://localhost:5000"
export SYSTEM_ID="nup-crm"
node examples/express-integration.js
```

## 🚀 Início Rápido

### 1. Instale as dependências
```bash
npm install express node-fetch
```

### 2. Configure as variáveis de ambiente
```bash
export IDENTITY_URL="http://localhost:5000"
export IDENTITY_ADMIN_TOKEN="seu-token-jwt"
export SYSTEM_ID="seu-sistema"
```

### 3. Sincronize as permissões
```bash
node examples/sync-permissions.js
```

### 4. Rode o servidor de exemplo
```bash
node examples/express-integration.js
```

### 5. Teste as rotas protegidas
```bash
# Obter token JWT do NuPIdentity primeiro
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"senha123"}'

# Usar o token para acessar a rota protegida
curl http://localhost:3000/api/clients \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

## 📖 Mais Informações

Consulte o [Guia de Integração](../INTEGRATION.md) para documentação completa.
