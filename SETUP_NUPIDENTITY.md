# 🚀 Setup Completo - Integração NuP-Kan ↔ NuPIdentity

## ✅ O Que Foi Implementado

### 1. **Arquitetura Multi-Projeto**
- ✅ NuP-Kan e NuPIdentify são projetos Replit **separados**
- ✅ Cada um com seu próprio banco de dados PostgreSQL
- ✅ NuP-Kan (porta 5000) + NuPIdentity (porta 3001)

### 2. **Sistema de Sincronização Automática**
- ✅ Serviço `identitySyncService.ts` criado
- ✅ Sincronização automática a cada 5 minutos
- ✅ Sincronização na inicialização do servidor
- ✅ Detecção inteligente de mudanças (hash-based)
- ✅ Retry automático com 3 tentativas
- ✅ Logs detalhados de todas as operações

### 3. **Scripts e Comandos NPM**
```bash
npm run sync:permissions  # Sincronizar manualmente
npm run sync:check       # Verificar permissions.json
npm run dev              # Inicia servidor com auto-sync
```

### 4. **Documentação Completa**
- ✅ `INTEGRATION.md` - Guia completo de integração
- ✅ `replit.md` - Arquitetura do sistema atualizada
- ✅ `examples/README.md` - Exemplos práticos
- ✅ `.env.example` - Variáveis de ambiente necessárias

---

## 📋 Próximos Passos - IMPORTANTE

### **No Projeto NuPIdentify (novo projeto separado):**

#### 1. **Criar Banco de Dados PostgreSQL**
```bash
# Opção A: Via Interface do Replit (RECOMENDADO)
1. Abra Tools → Database
2. Clique em "Add PostgreSQL Database"
3. Aguarde criação automática (Neon)
4. DATABASE_URL será criado automaticamente

# Opção B: Manual no Neon.tech
1. Acesse https://neon.tech
2. Crie projeto "NuPIdentify"
3. Copie Connection String
4. Cole em DATABASE_URL nas Secrets
```

#### 2. **Configurar Secrets/Environment Variables**
```bash
# Obrigatórias
DATABASE_URL=postgresql://...        # Do passo 1
JWT_SECRET=chave-secreta-jwt
JWT_REFRESH_SECRET=chave-refresh-jwt
SESSION_SECRET=chave-sessao

# Opcionais (mas recomendadas)
NODE_ENV=production
PORT=3001
```

#### 3. **Instalar Dependências e Inicializar**
```bash
npm install
npm run db:push          # Criar tabelas no banco
npm run db:seed          # Popular com dados iniciais
npm run dev              # Iniciar servidor
```

#### 4. **Obter Token de Admin**
Após inicializar o NuPIdentify:

```bash
# Fazer login como admin
curl -X POST https://nupidentify.replit.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nuptechs.com",
    "password": "senha-do-seed"
  }'

# Copiar o campo "token" da resposta
```

---

### **No Projeto NuP-Kan (este projeto):**

#### 1. **Configurar Secrets com Token do NuPIdentify**
```bash
# Adicione em Tools → Secrets:

IDENTITY_URL=https://nupidentify.replit.dev
IDENTITY_SYNC_TOKEN=<token-jwt-copiado-do-passo-4-acima>

# Opcionais (já têm valores padrão)
AUTO_SYNC_PERMISSIONS=true
SYNC_INTERVAL_MINUTES=5
```

#### 2. **Reiniciar Servidor**
```bash
# O servidor já está configurado!
# Apenas reinicie para ativar a sincronização:
npm run dev

# Ou force restart do workflow
```

#### 3. **Verificar Sincronização**
Procure nos logs por:
```
🔄 [IDENTITY SYNC] Iniciando serviço de sincronização...
✅ [IDENTITY SYNC] Sincronização concluída com sucesso!
   ✨ Novas: X
   🔄 Atualizadas: Y
```

---

## 🔍 Arquivos Criados/Modificados

### **Arquivos Novos:**
```
server/identitySyncService.ts          # Serviço de sincronização
scripts/sync-permissions.ts            # Script CLI de sync manual
.env.example                           # Template de variáveis
INTEGRATION.md                         # Guia completo
SETUP_NUPIDENTITY.md                  # Este arquivo
```

### **Arquivos Modificados:**
```
server/index.ts                        # Integração do sync service
package.json                           # Scripts npm adicionados
replit.md                             # Arquitetura atualizada
examples/README.md                    # Exemplos atualizados
permissions.json                      # URL correta
```

---

## 📊 Resumo da Integração

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  NuP-Kan (Port 5000)          NuPIdentify (Port 3001)      │
│  ├── permissions.json         ├── PostgreSQL (separado)    │
│  ├── Auto-Sync Service    ──► ├── 10 tabelas identity_*    │
│  │   └── A cada 5min          ├── OAuth2/OIDC Provider     │
│  │   └── Hash-based           └── Permission Management    │
│  ├── 64 funcionalidades                                    │
│  └── PostgreSQL (separado)                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Sincronização:
  1️⃣ NuP-Kan detecta mudanças no permissions.json
  2️⃣ Envia para NuPIdentify via POST /api/systems/nup-kan/sync-functions
  3️⃣ NuPIdentify registra/atualiza no banco
  4️⃣ Retorna resumo (criadas, atualizadas, removidas)
  5️⃣ NuP-Kan loga resultado
```

---

## 🎯 Funcionalidades do Sistema

### **Sincronização Automática:**
- ✅ Detecta mudanças no `permissions.json`
- ✅ Envia apenas quando necessário
- ✅ Retry automático em caso de falha
- ✅ Logs detalhados

### **Sincronização Manual:**
```bash
npm run sync:permissions    # Força sync agora
npm run sync:check          # Verifica arquivo
```

### **Configuração Flexível:**
```bash
AUTO_SYNC_PERMISSIONS=true    # Habilitar/desabilitar
SYNC_INTERVAL_MINUTES=5       # Intervalo em minutos
IDENTITY_URL=...              # URL do NuPIdentify
IDENTITY_SYNC_TOKEN=...       # Token JWT admin
```

---

## 🐛 Troubleshooting Comum

### **1. "IDENTITY_SYNC_TOKEN não configurado"**
```bash
# Solução: Obtenha token do NuPIdentify
curl -X POST https://nupidentify.replit.dev/api/auth/login \
  -d '{"email":"admin@nuptechs.com","password":"senha"}'
```

### **2. "Erro ao conectar com NuPIdentity"**
```bash
# Verifique se está rodando:
curl https://nupidentify.replit.dev/health
```

### **3. "Permissões não sincronizam"**
```bash
# Forçar sincronização:
npm run sync:permissions

# Verificar logs:
# Procure por [IDENTITY SYNC] nos logs do servidor
```

### **4. "Token expirado"**
```bash
# Tokens expiram após 24h
# Gere novo token fazendo login novamente
```

---

## 📚 Documentação de Referência

1. **[INTEGRATION.md](INTEGRATION.md)** - Guia completo de integração
2. **[replit.md](replit.md)** - Arquitetura do sistema
3. **[examples/README.md](examples/README.md)** - Exemplos práticos
4. **[.env.example](.env.example)** - Variáveis de ambiente

---

## ✨ Pronto para Usar!

Após configurar conforme os passos acima:

1. ✅ NuPIdentity rodando em projeto separado
2. ✅ NuP-Kan sincronizando automaticamente
3. ✅ 64 funcionalidades registradas no NuPIdentity
4. ✅ Sistema pronto para autenticação e autorização centralizadas

**Desenvolvido para o ecossistema NuPtechs** 🚀  
**Data**: 25/10/2025  
**Versão**: 1.0.0
