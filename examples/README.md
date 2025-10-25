# 📚 Exemplos de Integração NuP-Kan ↔ NuPIdentity

Esta pasta contém exemplos práticos de como integrar seu sistema com o NuPIdentity.

> **Nota**: Estes exemplos são extraídos do NuP-Kan e podem ser adaptados para outros sistemas da NuPtechs.

## 🌐 URLs dos Sistemas

- **NuP-Kan**: `https://nupkan.replit.dev` (porta 5000)
- **NuPIdentify**: `https://nupidentify.replit.dev` (porta 3001)

## 📁 Arquivos

### 1. `sync-permissions.js`
Script para sincronizar o `permissions.json` com o NuPIdentity.

**Uso:**
```bash
export IDENTITY_URL="https://nupidentify.replit.dev"
export IDENTITY_ADMIN_TOKEN="seu-token-jwt"
node examples/sync-permissions.js
```

**Opções:**
- `IDENTITY_URL`: URL do servidor NuPIdentity (padrão: https://nupidentify.replit.dev)
- `IDENTITY_ADMIN_TOKEN`: Token JWT de administrador (obrigatório)
- `PERMISSIONS_FILE`: Caminho do arquivo permissions.json (padrão: ./permissions.json)

**⚡ Sincronização Automática no NuP-Kan:**
O NuP-Kan possui um serviço integrado que sincroniza automaticamente:
- Na inicialização do servidor
- A cada 5 minutos (configurável via `SYNC_INTERVAL_MINUTES`)
- Apenas quando detecta mudanças no `permissions.json`

Veja `server/identitySyncService.ts` para a implementação completa.

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
export IDENTITY_URL="https://nupidentify.replit.dev"
export SYSTEM_ID="nup-kan"
node examples/express-integration.js
```

## 🚀 Início Rápido

### 1. Instale as dependências
```bash
npm install express node-fetch
```

### 2. Configure as variáveis de ambiente
```bash
export IDENTITY_URL="https://nupidentify.replit.dev"
export IDENTITY_SYNC_TOKEN="seu-token-jwt"
export SYSTEM_ID="nup-kan"
export AUTO_SYNC_PERMISSIONS="true"
export SYNC_INTERVAL_MINUTES="5"
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
# Obter token JWT do NuPIdentify primeiro
curl -X POST https://nupidentify.replit.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nuptechs.com","password":"senha123"}'

# Usar o token para acessar a rota protegida do NuP-Kan
curl https://nupkan.replit.dev/api/tasks \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

### 6. Comandos NPM (no NuP-Kan)
```bash
# Sincronizar permissões manualmente
npm run sync:permissions

# Verificar quantas permissões existem
npm run sync:check

# Iniciar servidor (com auto-sync habilitado)
npm run dev
```

## 📖 Mais Informações

- **[Guia de Integração Completo](../INTEGRATION.md)**: Documentação detalhada
- **[replit.md](../replit.md)**: Arquitetura do sistema
- **Serviço de Sync Automático**: `server/identitySyncService.ts`

## 🔧 Configuração Avançada

### Desabilitar Auto-Sync
```bash
# .env
AUTO_SYNC_PERMISSIONS=false
```

### Ajustar Intervalo de Sincronização
```bash
# .env
SYNC_INTERVAL_MINUTES=15  # Padrão: 5 minutos
```

### Usar em Outro Sistema
1. Copie `examples/sync-permissions.js` para seu projeto
2. Crie um `permissions.json` com o ID do seu sistema
3. Configure `IDENTITY_URL` e `IDENTITY_SYNC_TOKEN`
4. Execute: `node sync-permissions.js`

---

**Desenvolvido para o ecossistema NuPtechs**  
**Última atualização**: 25/10/2025
