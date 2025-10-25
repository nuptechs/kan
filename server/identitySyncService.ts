import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PermissionSystem {
  id: string;
  name: string;
  description?: string;
  version?: string;
  apiUrl?: string;
}

interface PermissionFunction {
  key: string;
  name: string;
  category: string;
  description?: string;
  endpoint?: string;
}

interface PermissionsManifest {
  system: PermissionSystem;
  functions: PermissionFunction[];
}

interface SyncResult {
  success: boolean;
  summary?: {
    total: number;
    created: number;
    updated: number;
    unchanged: number;
    removed: number;
  };
  error?: string;
  timestamp: Date;
}

export class IdentitySyncService {
  private identityUrl: string;
  private syncToken: string;
  private permissionsFile: string;
  private autoSync: boolean;
  private syncInterval: number;
  private intervalId?: NodeJS.Timeout;
  private lastSyncHash: string = '';
  private retryAttempts: number = 3;
  private retryDelay: number = 5000;

  constructor() {
    this.identityUrl = process.env.IDENTITY_URL || 'http://localhost:3001';
    this.syncToken = process.env.IDENTITY_SYNC_TOKEN || '';
    this.permissionsFile = join(process.cwd(), 'permissions.json');
    this.autoSync = process.env.AUTO_SYNC_PERMISSIONS !== 'false';
    this.syncInterval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5') * 60 * 1000;
  }

  /**
   * Inicia o serviço de sincronização automática
   */
  async start(): Promise<void> {
    if (!this.syncToken) {
      console.warn('⚠️  [IDENTITY SYNC] IDENTITY_SYNC_TOKEN não configurado - sincronização desabilitada');
      return;
    }

    console.log('🔄 [IDENTITY SYNC] Iniciando serviço de sincronização de permissões...');
    console.log(`   URL: ${this.identityUrl}`);
    console.log(`   Auto-sync: ${this.autoSync ? 'habilitado' : 'desabilitado'}`);
    console.log(`   Intervalo: ${this.syncInterval / 60000} minutos`);

    // Sincronização inicial
    await this.syncWithRetry();

    // Configurar sincronização periódica se habilitada
    if (this.autoSync) {
      this.intervalId = setInterval(async () => {
        await this.syncWithRetry();
      }, this.syncInterval);

      console.log('✅ [IDENTITY SYNC] Sincronização automática configurada');
    }
  }

  /**
   * Para o serviço de sincronização
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('⏸️  [IDENTITY SYNC] Serviço de sincronização parado');
    }
  }

  /**
   * Sincroniza permissões com retry automático
   */
  private async syncWithRetry(): Promise<SyncResult> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.syncPermissions();
        
        if (result.success) {
          return result;
        }

        if (attempt < this.retryAttempts) {
          console.log(`⚠️  [IDENTITY SYNC] Tentativa ${attempt}/${this.retryAttempts} falhou, aguardando ${this.retryDelay / 1000}s...`);
          await this.sleep(this.retryDelay);
        }
      } catch (error) {
        if (attempt < this.retryAttempts) {
          console.log(`⚠️  [IDENTITY SYNC] Erro na tentativa ${attempt}/${this.retryAttempts}: ${error instanceof Error ? error.message : String(error)}`);
          await this.sleep(this.retryDelay);
        } else {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          };
        }
      }
    }

    return {
      success: false,
      error: 'Máximo de tentativas excedido',
      timestamp: new Date()
    };
  }

  /**
   * Sincroniza permissões com o NuPIdentify
   */
  async syncPermissions(): Promise<SyncResult> {
    try {
      // Verificar se o arquivo existe
      if (!existsSync(this.permissionsFile)) {
        console.warn('⚠️  [IDENTITY SYNC] Arquivo permissions.json não encontrado');
        return {
          success: false,
          error: 'Arquivo permissions.json não encontrado',
          timestamp: new Date()
        };
      }

      // Ler arquivo de permissões
      const fileContent = readFileSync(this.permissionsFile, 'utf8');
      const currentHash = this.generateHash(fileContent);

      // Verificar se houve mudanças desde a última sincronização
      if (currentHash === this.lastSyncHash) {
        console.log('ℹ️  [IDENTITY SYNC] Nenhuma mudança detectada em permissions.json');
        return {
          success: true,
          timestamp: new Date()
        };
      }

      const permissions: PermissionsManifest = JSON.parse(fileContent);

      // Validar estrutura
      if (!permissions.system || !permissions.system.id) {
        throw new Error('permissions.json deve conter "system.id"');
      }

      if (!permissions.functions || !Array.isArray(permissions.functions)) {
        throw new Error('permissions.json deve conter array "functions"');
      }

      console.log(`🔄 [IDENTITY SYNC] Sincronizando ${permissions.functions.length} permissões...`);

      // Enviar para NuPIdentify
      const response = await fetch(
        `${this.identityUrl}/api/systems/${permissions.system.id}/sync-functions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.syncToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(permissions),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(`Erro HTTP ${response.status}: ${errorData.error || errorData.message || 'Falha na sincronização'}`);
      }

      const result = await response.json();

      // Atualizar hash se sincronização foi bem sucedida
      this.lastSyncHash = currentHash;

      console.log('✅ [IDENTITY SYNC] Sincronização concluída com sucesso!');
      console.log(`   ✨ Novas: ${result.summary.created}`);
      console.log(`   🔄 Atualizadas: ${result.summary.updated}`);
      console.log(`   ✔️  Inalteradas: ${result.summary.unchanged}`);
      
      if (result.summary.removed > 0) {
        console.log(`   ⚠️  Removidas: ${result.summary.removed}`);
      }

      return {
        success: true,
        summary: result.summary,
        timestamp: new Date()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [IDENTITY SYNC] Erro na sincronização:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Verifica conectividade com o NuPIdentify
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.identityUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.syncToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('❌ [IDENTITY SYNC] Erro ao verificar conectividade:', error);
      return false;
    }
  }

  /**
   * Força uma sincronização imediata
   */
  async forceSyncNow(): Promise<SyncResult> {
    console.log('🔄 [IDENTITY SYNC] Sincronização manual iniciada...');
    return await this.syncWithRetry();
  }

  /**
   * Gera hash do conteúdo para detectar mudanças
   */
  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Helper para aguardar
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let syncServiceInstance: IdentitySyncService | null = null;

export function getIdentitySyncService(): IdentitySyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new IdentitySyncService();
  }
  return syncServiceInstance;
}

export function stopIdentitySyncService(): void {
  if (syncServiceInstance) {
    syncServiceInstance.stop();
    syncServiceInstance = null;
  }
}
