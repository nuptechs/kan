/**
 * 🔐 INTEGRAÇÃO COM NUPIDENTITY
 * 
 * Cliente para conectar o NuP-Kan ao NuPIdentity (sistema centralizado de identidade)
 * 
 * Responsabilidades:
 * - Validar tokens JWT emitidos pelo NuPIdentity
 * - Buscar dados do usuário e permissões do NuPIdentity
 * - Cache de dados de autenticação para performance
 */

import { cache, TTL } from '../cache';

// URL do servidor NuPIdentity (deve ser configurado via variável de ambiente)
const NUPIDENTITY_URL = process.env.NUPIDENTITY_URL || 'http://localhost:3001';
const SYSTEM_ID = 'nup-kan'; // ID deste sistema registrado no NuPIdentity

export interface NuPIdentityUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  profileId?: string;
  profileName?: string;
}

export interface NuPIdentityPermission {
  id: string;
  name: string;
  description: string;
  category: string;
  systemId: string;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: NuPIdentityUser;
  permissions?: NuPIdentityPermission[];
  error?: string;
}

/**
 * Cliente para integração com NuPIdentity
 */
export class NuPIdentityClient {
  
  /**
   * Valida um token JWT junto ao NuPIdentity
   */
  static async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const cacheKey = `nupid_token:${token}`;
      const cached = await cache.get<TokenValidationResult>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await fetch(`${NUPIDENTITY_URL}/api/validate/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return {
          valid: false,
          error: 'Invalid token',
        };
      }

      const data = await response.json();
      
      const result: TokenValidationResult = {
        valid: true,
        user: data.user,
      };

      // Cache por 5 minutos
      await cache.set(cacheKey, result, TTL.MEDIUM);
      
      return result;
    } catch (error) {
      console.error('❌ [NUPIDENTITY] Erro ao validar token:', error);
      return {
        valid: false,
        error: 'Token validation failed',
      };
    }
  }

  /**
   * Busca dados completos do usuário incluindo permissões para o NuP-Kan
   */
  static async getUserData(userId: string, token: string): Promise<{
    user: NuPIdentityUser | null;
    permissions: NuPIdentityPermission[];
  }> {
    try {
      const cacheKey = `nupid_user:${userId}`;
      const cached = await cache.get<any>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Buscar dados do usuário
      const userResponse = await fetch(`${NUPIDENTITY_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        return { user: null, permissions: [] };
      }

      const user = await userResponse.json();

      // Buscar permissões do usuário para o sistema NuP-Kan
      const permissionsResponse = await fetch(
        `${NUPIDENTITY_URL}/api/users/${userId}/systems/${SYSTEM_ID}/permissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      let permissions: NuPIdentityPermission[] = [];
      
      if (permissionsResponse.ok) {
        const permData = await permissionsResponse.json();
        permissions = permData.permissions || permData || [];
      }

      const result = {
        user,
        permissions,
      };

      // Cache por 5 minutos
      await cache.set(cacheKey, result, TTL.MEDIUM);
      
      return result;
    } catch (error) {
      console.error('❌ [NUPIDENTITY] Erro ao buscar dados do usuário:', error);
      return { user: null, permissions: [] };
    }
  }

  /**
   * Invalida cache de um usuário
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = `nupid_user:${userId}`;
    await cache.del(cacheKey);
  }

  /**
   * Verifica saúde da conexão com NuPIdentity
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${NUPIDENTITY_URL}/api/systems`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ [NUPIDENTITY] Health check falhou:', error);
      return false;
    }
  }

  /**
   * Retorna URL para login no NuPIdentity (OAuth2 flow)
   */
  static getLoginUrl(redirectUrl: string): string {
    const params = new URLSearchParams({
      system_id: SYSTEM_ID,
      redirect_uri: redirectUrl,
    });
    
    return `${NUPIDENTITY_URL}/auth/login?${params.toString()}`;
  }
}
