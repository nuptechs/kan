# 🚀 Guia de Migração - NuPIdentity

## ⚠️ Antes de Começar

Este guia assume que você criou um novo projeto Replit vazio chamado "NuPIdentify" usando o template Node.js.

## 📦 Arquivos para Copiar

Copie **TODA** a pasta `nupidentity/` do projeto atual para a raiz do novo projeto.

### Estrutura que deve ficar no novo projeto:

```
NuPIdentify/  (novo projeto)
├── client/
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── components/
│       ├── lib/
│       └── pages/
├── server/
│   ├── index.ts
│   ├── vite.ts
│   ├── routes/
│   ├── scripts/
│   └── db/
├── shared/
│   └── schema.ts
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── drizzle.config.ts
└── postcss.config.js
```

## 🔧 Setup no Novo Projeto

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente (Secrets)

No painel do Replit, adicione as seguintes secrets:

#### Banco de Dados (obrigatório):
- **DATABASE_URL** = `postgresql://...` (mesma URL do projeto atual)

#### Autenticação JWT (obrigatório):
- **JWT_SECRET** = `sua-chave-secreta-super-segura-aqui`
- **JWT_REFRESH_SECRET** = `outra-chave-secreta-diferente`

#### Sessão (obrigatório):
- **SESSION_SECRET** = `chave-para-sessao-express`

#### OAuth (opcional - para futura implementação):
- **GOOGLE_CLIENT_ID**
- **GOOGLE_CLIENT_SECRET**
- **GITHUB_CLIENT_ID**
- **GITHUB_CLIENT_SECRET**

### 3. Configurar Database

```bash
# Criar/atualizar schema no banco
npm run db:push

# Popular banco com dados iniciais (usuário admin, sistemas, permissões)
npm run db:seed
```

### 4. Iniciar Servidor

```bash
npm run dev
```

O servidor estará rodando em: `http://localhost:3001`

## 🔐 Credenciais Padrão (após seed)

- **Email**: yfaf01@gmail.com
- **Senha**: 123456
- **Perfil**: Administrador Global (todas as 64 permissões)

## 📝 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para produção
npm run db:push      # Sincroniza schema com banco de dados
npm run db:seed      # Popula banco com dados iniciais
```

## ⚙️ Configuração do Workflow

No Replit, configure o workflow para rodar:

```bash
npm run dev
```

- **Nome**: NuPIdentity Server
- **Comando**: `npm run dev`
- **Porta**: 3001
- **Output Type**: webview

## 🔗 Integração com NuP-Kan

Para integrar o NuPIdentity com o NuP-Kan (ou outros sistemas):

1. **Registrar Sistema no NuPIdentity**:
   - Acesse admin panel do NuPIdentity
   - Adicione novo sistema com: nome, descrição, URL base

2. **Configurar Permissões**:
   - Crie arquivo `permissions.json` no sistema
   - Execute sincronização via API `/api/systems/:id/sync`

3. **Implementar SSO**:
   ```javascript
   // No sistema cliente (ex: NuP-Kan)
   // Redirecionar para: http://localhost:3001/login?redirect_uri=...
   // Receber JWT token no callback
   // Validar token via: POST http://localhost:3001/api/validate/token
   ```

## ✅ Checklist Pós-Migração

- [ ] Projeto criado no Replit
- [ ] Arquivos copiados
- [ ] `npm install` executado
- [ ] Secrets configuradas (DATABASE_URL, JWT_SECRET, etc)
- [ ] `npm run db:push` executado
- [ ] `npm run db:seed` executado
- [ ] Servidor iniciando sem erros
- [ ] Login funcionando em `/`
- [ ] Dashboard acessível após login

## 🐛 Troubleshooting

### Erro: "Cannot find module 'vite'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: Database connection failed
- Verifique se DATABASE_URL está configurada nas Secrets
- Confirme que o banco de dados Neon está acessível

### Erro: JWT token invalid
- Verifique se JWT_SECRET está configurada
- Certifique-se de que a secret é a mesma em todas as requisições

### Frontend não carrega (tela preta)
```bash
# Limpar cache do Vite
rm -rf node_modules/.vite
npm run dev
```

## 📞 Suporte

Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Logs do servidor no Replit
3. Variáveis de ambiente configuradas

---

**Importante**: Este é um projeto independente. Não depende de arquivos do NuP-Kan.
