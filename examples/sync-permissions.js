#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function syncPermissions() {
  const IDENTITY_URL = process.env.IDENTITY_URL || 'http://localhost:5000';
  const ADMIN_TOKEN = process.env.IDENTITY_ADMIN_TOKEN;
  const PERMISSIONS_FILE = process.env.PERMISSIONS_FILE || './permissions.json';

  console.log('🔄 NuPIdentity - Sincronização de Permissões\n');

  if (!ADMIN_TOKEN) {
    console.error('❌ Erro: IDENTITY_ADMIN_TOKEN não configurado');
    console.log('   Configure a variável de ambiente com um token JWT válido:');
    console.log('   export IDENTITY_ADMIN_TOKEN="seu-token-jwt"\n');
    process.exit(1);
  }

  if (!fs.existsSync(PERMISSIONS_FILE)) {
    console.error(`❌ Erro: Arquivo ${PERMISSIONS_FILE} não encontrado`);
    console.log('   Crie um arquivo permissions.json com a estrutura:');
    console.log('   {');
    console.log('     "system": { "id": "...", "name": "..." },');
    console.log('     "functions": [...]');
    console.log('   }\n');
    process.exit(1);
  }

  let permissions;
  try {
    const fileContent = fs.readFileSync(PERMISSIONS_FILE, 'utf8');
    permissions = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Erro ao ler permissions.json:', error.message);
    process.exit(1);
  }

  if (!permissions.system || !permissions.system.id) {
    console.error('❌ Erro: permissions.json deve conter "system.id"');
    process.exit(1);
  }

  if (!permissions.functions || !Array.isArray(permissions.functions)) {
    console.error('❌ Erro: permissions.json deve conter array "functions"');
    process.exit(1);
  }

  const systemId = permissions.system.id;
  const systemName = permissions.system.name || systemId;

  console.log(`📦 Sistema: ${systemName} (${systemId})`);
  console.log(`🔗 Servidor: ${IDENTITY_URL}`);
  console.log(`📋 Funções: ${permissions.functions.length}\n`);

  console.log('⏳ Enviando para NuPIdentity...\n');

  try {
    const response = await fetch(
      `${IDENTITY_URL}/api/systems/${systemId}/sync-functions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissions),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Erro na sincronização:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Mensagem: ${result.error || result.message}`);
      if (result.details) {
        console.error(`   Detalhes:`, result.details);
      }
      process.exit(1);
    }

    console.log('✅ Sincronização concluída com sucesso!\n');
    console.log('📊 Resumo:');
    console.log(`   📝 Total de funções: ${result.summary.total}`);
    console.log(`   ✨ Novas funções: ${result.summary.created}`);
    console.log(`   🔄 Funções atualizadas: ${result.summary.updated}`);
    console.log(`   ✔️  Funções inalteradas: ${result.summary.unchanged}`);
    
    if (result.summary.removed > 0) {
      console.log(`   ⚠️  Funções removidas: ${result.summary.removed}`);
      if (result.removedFunctions && result.removedFunctions.length > 0) {
        console.log('\n   Funções removidas do manifest:');
        result.removedFunctions.forEach(fn => {
          console.log(`   - ${fn.name} (${fn.key})`);
        });
      }
    }

    console.log('\n✅ Sistema integrado com NuPIdentity!');
    
  } catch (error) {
    console.error('❌ Erro ao conectar com NuPIdentity:', error.message);
    console.log('\n   Verifique se:');
    console.log('   - O servidor NuPIdentity está rodando');
    console.log('   - A URL está correta (IDENTITY_URL)');
    console.log('   - O token JWT é válido (IDENTITY_ADMIN_TOKEN)');
    process.exit(1);
  }
}

if (require.main === module) {
  syncPermissions();
}

module.exports = syncPermissions;
