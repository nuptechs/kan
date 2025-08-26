import { createClient, type RedisClientType } from 'redis';

// Redis Cache Layer para Performance Ultra-Rápida
class CacheManager {
  private redis: RedisClientType | null = null;
  private memoryCache = new Map<string, { data: any, expires: number }>();
  
  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    // Redis temporariamente desabilitado para estabilidade
    console.log('🟡 [CACHE] Redis desabilitado, usando cache em memória');
    this.redis = null;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      }
      
      // Fallback para cache em memória
      const cached = this.memoryCache.get(key);
      if (cached && Date.now() < cached.expires) {
        return cached.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Erro ao buscar:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
        return;
      }
      
      // Fallback para cache em memória
      this.memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttlSeconds * 1000)
      });
      
      // Limpeza automática do cache em memória
      this.cleanMemoryCache();
    } catch (error) {
      console.error('❌ [CACHE] Erro ao salvar:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('❌ [CACHE] Erro ao deletar:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }
      
      // Para cache em memória, remove chaves que batem com o padrão
      for (const key of Array.from(this.memoryCache.keys())) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('❌ [CACHE] Erro ao invalidar padrão:', error);
    }
  }

  private cleanMemoryCache(): void {
    if (this.memoryCache.size > 1000) { // Limitar cache em memória
      const now = Date.now();
      for (const [key, value] of Array.from(this.memoryCache.entries())) {
        if (now > value.expires) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  // Métricas de cache
  async getStats(): Promise<{ hits: number, misses: number, size: number }> {
    try {
      if (this.redis) {
        const info = await this.redis.info('stats');
        return {
          hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0'),
          misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0'),
          size: await this.redis.dbSize()
        };
      }
      
      return {
        hits: 0,
        misses: 0,
        size: this.memoryCache.size
      };
    } catch (error) {
      return { hits: 0, misses: 0, size: 0 };
    }
  }
}

// Singleton para usar em toda aplicação
export const cache = new CacheManager();

// Funções helper para cache de dados específicos
export const CacheKeys = {
  USER_PERMISSIONS: (userId: string) => `user_permissions:${userId}`,
  USER_DATA: (userId: string) => `user:${userId}`,
  BOARD_DATA: (boardId: string) => `board:${boardId}`,
  BOARD_COLUMNS: (boardId: string) => `board_columns:${boardId}`,
  BOARD_TASKS: (boardId: string) => `board_tasks:${boardId}`,
  ANALYTICS: 'analytics:global',
  ALL_BOARDS: 'boards:all',
} as const;

// TTL constants (Time To Live em segundos) - OTIMIZADO PARA PERFORMANCE
export const TTL = {
  SHORT: 300,     // 5 minutos - dados que mudam frequentemente
  MEDIUM: 1800,   // 30 minutos - dados moderadamente estáveis  
  LONG: 7200,     // 2 horas - dados muito estáveis
  VERY_LONG: 14400 // 4 horas - dados quase estáticos
} as const;