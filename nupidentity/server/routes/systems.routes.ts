import express, { type Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { systems, functions, insertSystemSchema, insertFunctionSchema } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";

const router: Router = express.Router();

/**
 * GET /api/systems
 * Lista todos os sistemas integrados
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const allSystems = await db.query.systems.findMany({
      orderBy: (systems, { asc }) => [asc(systems.name)],
    });
    
    res.json(allSystems);
  } catch (error) {
    console.error("Erro ao listar sistemas:", error);
    res.status(500).json({
      error: "Erro ao listar sistemas",
    });
  }
});

/**
 * GET /api/systems/:id
 * Retorna detalhes de um sistema específico
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const system = await db.query.systems.findFirst({
      where: eq(systems.id, id),
      with: {
        functions: true,
      },
    });
    
    if (!system) {
      return res.status(404).json({
        error: "Sistema não encontrado",
      });
    }
    
    res.json(system);
  } catch (error) {
    console.error("Erro ao buscar sistema:", error);
    res.status(500).json({
      error: "Erro ao buscar sistema",
    });
  }
});

/**
 * POST /api/systems
 * Registra novo sistema na Central
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const body = insertSystemSchema.parse(req.body);
    
    // Verificar se sistema já existe
    const existingSystem = await db.query.systems.findFirst({
      where: eq(systems.id, body.id),
    });
    
    if (existingSystem) {
      return res.status(409).json({
        error: "Sistema já existe",
        message: `Sistema com ID "${body.id}" já está registrado`,
      });
    }
    
    // Criar sistema
    const [newSystem] = await db.insert(systems).values(body).returning();
    
    res.status(201).json(newSystem);
  } catch (error: any) {
    console.error("Erro ao criar sistema:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: "Erro ao criar sistema",
    });
  }
});

/**
 * PATCH /api/systems/:id
 * Atualiza informações de um sistema
 */
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updatedSystem] = await db
      .update(systems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(systems.id, id))
      .returning();
    
    if (!updatedSystem) {
      return res.status(404).json({
        error: "Sistema não encontrado",
      });
    }
    
    res.json(updatedSystem);
  } catch (error) {
    console.error("Erro ao atualizar sistema:", error);
    res.status(500).json({
      error: "Erro ao atualizar sistema",
    });
  }
});

/**
 * DELETE /api/systems/:id
 * Remove sistema (e todas as suas funções em cascade)
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [deletedSystem] = await db
      .delete(systems)
      .where(eq(systems.id, id))
      .returning();
    
    if (!deletedSystem) {
      return res.status(404).json({
        error: "Sistema não encontrado",
      });
    }
    
    res.json({ message: "Sistema removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover sistema:", error);
    res.status(500).json({
      error: "Erro ao remover sistema",
    });
  }
});

/**
 * POST /api/systems/:systemId/sync-functions
 * Sincroniza funções de um sistema baseado no permissions.json
 * 
 * Body esperado (formato permissions.json):
 * {
 *   "system": { "id": "nup-kan", "name": "...", ... },
 *   "functions": [
 *     { "key": "boards-list", "name": "Listar Boards", "category": "Boards", ... }
 *   ]
 * }
 */
router.post("/:systemId/sync-functions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { systemId } = req.params;
    const { system: systemInfo, functions: manifestFunctions } = req.body;
    
    if (!manifestFunctions || !Array.isArray(manifestFunctions)) {
      return res.status(400).json({
        error: "Formato inválido",
        message: "Body deve conter um array 'functions'",
      });
    }
    
    // Verificar se sistema existe
    let system = await db.query.systems.findFirst({
      where: eq(systems.id, systemId),
    });
    
    // Se não existe, criar automaticamente
    if (!system && systemInfo) {
      [system] = await db.insert(systems).values({
        id: systemInfo.id || systemId,
        name: systemInfo.name || systemId,
        description: systemInfo.description || "",
        apiUrl: systemInfo.apiUrl || "",
        isActive: true,
      }).returning();
      
      console.log(`✅ [SYNC] Sistema "${system.name}" criado automaticamente`);
    }
    
    if (!system) {
      return res.status(404).json({
        error: "Sistema não encontrado e não foi possível criar",
      });
    }
    
    // Buscar funções existentes do sistema
    const existingFunctions = await db.query.functions.findMany({
      where: eq(functions.systemId, systemId),
    });
    
    const existingFunctionKeys = new Set(existingFunctions.map(f => f.functionKey));
    
    // Separar funções novas das existentes
    const newFunctions = manifestFunctions.filter(f => !existingFunctionKeys.has(f.key));
    const existingToUpdate = manifestFunctions.filter(f => existingFunctionKeys.has(f.key));
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // Criar funções novas
    for (const func of newFunctions) {
      try {
        await db.insert(functions).values({
          id: `${systemId}-${func.key}`,
          systemId,
          functionKey: func.key,
          name: func.name,
          category: func.category || "",
          description: func.description || "",
          endpoint: func.endpoint || "",
        });
        createdCount++;
        console.log(`✅ [SYNC] Função criada: ${func.name} (${func.key})`);
      } catch (error) {
        console.error(`❌ [SYNC] Erro ao criar função ${func.key}:`, error);
      }
    }
    
    // Atualizar funções existentes
    for (const func of existingToUpdate) {
      try {
        await db
          .update(functions)
          .set({
            name: func.name,
            category: func.category || "",
            description: func.description || "",
            endpoint: func.endpoint || "",
            updatedAt: new Date(),
          })
          .where(eq(functions.id, `${systemId}-${func.key}`));
        updatedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Erro ao atualizar função ${func.key}:`, error);
      }
    }
    
    // Funções que foram removidas do manifest (opcionalmente podem ser deletadas)
    const manifestKeys = new Set(manifestFunctions.map(f => f.key));
    const removedFunctions = existingFunctions.filter(f => !manifestKeys.has(f.functionKey));
    
    res.json({
      success: true,
      message: "Sincronização concluída",
      system: system.name,
      summary: {
        total: manifestFunctions.length,
        created: createdCount,
        updated: updatedCount,
        unchanged: existingToUpdate.length - updatedCount,
        removed: removedFunctions.length,
      },
      removedFunctions: removedFunctions.map(f => ({
        key: f.functionKey,
        name: f.name,
        note: "Função existe no banco mas não está mais no manifest",
      })),
    });
  } catch (error: any) {
    console.error("Erro na sincronização de funções:", error);
    res.status(500).json({
      error: "Erro na sincronização",
      message: error.message || "Erro ao sincronizar funções",
    });
  }
});

/**
 * GET /api/systems/:systemId/functions
 * Lista todas as funções de um sistema
 */
router.get("/:systemId/functions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { systemId } = req.params;
    
    const systemFunctions = await db.query.functions.findMany({
      where: eq(functions.systemId, systemId),
      orderBy: (functions, { asc }) => [asc(functions.category), asc(functions.name)],
    });
    
    // Agrupar por categoria
    const groupedByCategory: { [key: string]: any[] } = {};
    
    for (const func of systemFunctions) {
      const category = func.category || "Outros";
      if (!groupedByCategory[category]) {
        groupedByCategory[category] = [];
      }
      groupedByCategory[category].push(func);
    }
    
    res.json({
      systemId,
      total: systemFunctions.length,
      functions: systemFunctions,
      byCategory: groupedByCategory,
    });
  } catch (error) {
    console.error("Erro ao listar funções do sistema:", error);
    res.status(500).json({
      error: "Erro ao listar funções",
    });
  }
});

export default router;
