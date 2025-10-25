#!/usr/bin/env tsx

import { getIdentitySyncService } from '../server/identitySyncService';

async function main() {
  console.log('🔄 NuP-Kan → NuPIdentify: Sincronização Manual de Permissões\n');

  const syncService = getIdentitySyncService();
  
  const result = await syncService.forceSyncNow();

  if (result.success) {
    console.log('\n✅ Sincronização concluída com sucesso!');
    
    if (result.summary) {
      console.log('\n📊 Resumo:');
      console.log(`   Total: ${result.summary.total}`);
      console.log(`   ✨ Criadas: ${result.summary.created}`);
      console.log(`   🔄 Atualizadas: ${result.summary.updated}`);
      console.log(`   ✔️  Inalteradas: ${result.summary.unchanged}`);
      
      if (result.summary.removed > 0) {
        console.log(`   ⚠️  Removidas: ${result.summary.removed}`);
      }
    }
    
    process.exit(0);
  } else {
    console.error('\n❌ Erro na sincronização:', result.error);
    console.error('\nVerifique se:');
    console.error('  1. O NuPIdentify está rodando');
    console.error('  2. IDENTITY_URL está configurado corretamente');
    console.error('  3. IDENTITY_SYNC_TOKEN é válido (JWT de admin)');
    console.error('  4. O arquivo permissions.json existe e está válido\n');
    process.exit(1);
  }
}

main();
