import express, { type Router, type Request, type Response } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { users, userProfiles, profiles, profileFunctions, functions, userFunctionOverrides, systems } from "../../shared/schema";
import { verifyToken, extractTokenFromHeader } from "../auth/jwt";

const router: Router = express.Router();

/**
 * POST /api/validate/token
 * Valida token JWT e retorna informações do usuário
 * Usado por sistemas clientes para verificar autenticação
 */
router.post("/token", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: "Token não fornecido",
      });
    }
    
    // Verificar token
    const payload = verifyToken(token);
    
    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        valid: false,
        error: "Usuário inválido ou desativado",
      });
    }
    
    // Token válido
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      valid: true,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    res.status(401).json({
      valid: false,
      error: error.message || "Token inválido",
    });
  }
});

/**
 * GET /api/users/:userId/permissions
 * Retorna todas as permissões de um usuário (todos os sistemas)
 */
router.get("/users/:userId/permissions", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Buscar permissões usando SQL direto (mais eficiente e não depende de relações)
    const result = await db.execute(sql`
      SELECT DISTINCT
        f.id as function_id,
        f.function_key,
        f.name,
        f.category,
        f.endpoint,
        s.id as system_id,
        s.name as system_name
      FROM identity_user_profiles up
      JOIN identity_profile_functions pf ON pf.profile_id = up.profile_id
      JOIN functions f ON f.id = pf.function_id
      JOIN systems s ON s.id = f.system_id
      WHERE up.user_id = ${userId}
        AND pf.granted = true
      ORDER BY s.name, f.category, f.name
    `);
    
    const permissions = result.rows.map((row: any) => ({
      functionId: row.function_id,
      functionKey: row.function_key,
      name: row.name,
      category: row.category,
      endpoint: row.endpoint,
      systemId: row.system_id,
      systemName: row.system_name,
    }));
    
    res.json({
      userId,
      permissions,
      total: permissions.length,
    });
  } catch (error) {
    console.error("Erro ao buscar permissões:", error);
    res.status(500).json({
      error: "Erro ao buscar permissões",
    });
  }
});

/**
 * GET /api/users/:userId/systems/:systemId/permissions
 * Retorna permissões de um usuário para um sistema específico
 * Usado por sistemas clientes para verificar acesso
 */
router.get("/users/:userId/systems/:systemId/permissions", async (req: Request, res: Response) => {
  try {
    const { userId, systemId } = req.params;
    
    // Verificar se sistema existe
    const system = await db.query.systems.findFirst({
      where: eq(systems.id, systemId),
    });
    
    if (!system) {
      return res.status(404).json({
        error: "Sistema não encontrado",
      });
    }
    
    // Buscar funções do sistema
    const systemFunctions = await db.query.functions.findMany({
      where: eq(functions.systemId, systemId),
    });
    
    const functionIds = systemFunctions.map(f => f.id);
    
    if (functionIds.length === 0) {
      return res.json({
        userId,
        systemId,
        systemName: system.name,
        permissions: [],
        functionKeys: [],
      });
    }
    
    // Buscar perfis do usuário
    const userProfilesData = await db.query.userProfiles.findMany({
      where: eq(userProfiles.userId, userId),
      with: {
        profile: true,
      },
    });
    
    const profileIds = userProfilesData.map(up => up.profileId);
    
    // Buscar funções concedidas pelos perfis
    const profilePerms = await db.query.profileFunctions.findMany({
      where: and(
        inArray(profileFunctions.profileId, profileIds),
        inArray(profileFunctions.functionId, functionIds)
      ),
      with: {
        function: true,
      },
    });
    
    // Buscar overrides do usuário para este sistema
    const overrides = await db.query.userFunctionOverrides.findMany({
      where: and(
        eq(userFunctionOverrides.userId, userId),
        inArray(userFunctionOverrides.functionId, functionIds)
      ),
      with: {
        function: true,
      },
    });
    
    // Montar mapa de permissões
    const permissionsMap = new Map<string, boolean>();
    
    // Adicionar permissões dos perfis
    for (const pp of profilePerms) {
      if (pp.granted && pp.function) {
        permissionsMap.set(pp.function.functionKey, true);
      }
    }
    
    // Aplicar overrides
    for (const override of overrides) {
      if (override.function) {
        if (override.granted) {
          permissionsMap.set(override.function.functionKey, true);
        } else {
          permissionsMap.delete(override.function.functionKey); // Remove se override nega
        }
      }
    }
    
    // Converter para array de function keys
    const grantedFunctionKeys = Array.from(permissionsMap.keys());
    
    // Detalhes completos
    const permissions = systemFunctions
      .filter(f => permissionsMap.has(f.functionKey))
      .map(f => ({
        functionKey: f.functionKey,
        name: f.name,
        category: f.category,
        endpoint: f.endpoint,
      }));
    
    res.json({
      userId,
      systemId,
      systemName: system.name,
      permissions,
      functionKeys: grantedFunctionKeys, // Formato simplificado para checagem rápida
      total: grantedFunctionKeys.length,
    });
  } catch (error) {
    console.error("Erro ao buscar permissões do sistema:", error);
    res.status(500).json({
      error: "Erro ao buscar permissões do sistema",
    });
  }
});

/**
 * POST /api/users/:userId/systems/:systemId/check
 * Verifica se usuário tem uma função específica
 * Body: { functionKey: "boards-create" }
 */
router.post("/users/:userId/systems/:systemId/check", async (req: Request, res: Response) => {
  try {
    const { userId, systemId } = req.params;
    const { functionKey } = req.body;
    
    if (!functionKey) {
      return res.status(400).json({
        error: "functionKey é obrigatório",
      });
    }
    
    // Buscar permissões do usuário para este sistema
    const response = await db.query.functions.findFirst({
      where: and(
        eq(functions.systemId, systemId),
        eq(functions.functionKey, functionKey)
      ),
    });
    
    if (!response) {
      return res.json({
        userId,
        systemId,
        functionKey,
        granted: false,
        reason: "Função não encontrada",
      });
    }
    
    // Buscar perfis e overrides (mesma lógica da rota acima, simplificada)
    const userProfilesData = await db.query.userProfiles.findMany({
      where: eq(userProfiles.userId, userId),
    });
    
    const profileIds = userProfilesData.map(up => up.profileId);
    
    const profilePerms = await db.query.profileFunctions.findMany({
      where: and(
        inArray(profileFunctions.profileId, profileIds),
        eq(profileFunctions.functionId, response.id)
      ),
    });
    
    const override = await db.query.userFunctionOverrides.findFirst({
      where: and(
        eq(userFunctionOverrides.userId, userId),
        eq(userFunctionOverrides.functionId, response.id)
      ),
    });
    
    // Determinar se tem permissão
    let granted = false;
    
    if (override) {
      granted = override.granted; // Override prevalece
    } else {
      granted = profilePerms.some(pp => pp.granted); // Pelo menos um perfil concede
    }
    
    res.json({
      userId,
      systemId,
      functionKey,
      granted,
    });
  } catch (error) {
    console.error("Erro ao verificar permissão:", error);
    res.status(500).json({
      error: "Erro ao verificar permissão",
    });
  }
});

export default router;
