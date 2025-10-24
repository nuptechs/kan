import { db } from "./db";
import { systems, functions, profiles, userProfiles, profileFunctions, users } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { hashPassword } from "./auth/password";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

/**
 * Script de seed para inicializar o NuPIdentity
 * 
 * 1. Registra NuP-Kan como sistema
 * 2. Sincroniza funções do permissions.json
 * 3. Cria perfil "Administrador Global"
 * 4. Atribui todas as funções ao perfil admin
 * 5. Cria/atualiza usuário admin (yfaf01@gmail.com)
 * 6. Associa usuário admin ao perfil
 */

async function seed() {
  console.log("🌱 [SEED] Iniciando seed do NuPIdentity...\n");
  
  try {
    // =============================================================================
    // 1. Registrar NuP-Kan como sistema
    // =============================================================================
    console.log("📦 [SEED] Registrando sistema NuP-Kan...");
    
    let kanSystem = await db.query.systems.findFirst({
      where: eq(systems.id, "nup-kan"),
    });
    
    if (!kanSystem) {
      [kanSystem] = await db.insert(systems).values({
        id: "nup-kan",
        name: "NuP-Kan - Sistema Kanban",
        description: "Sistema de gerenciamento de projetos com quadros Kanban",
        apiUrl: "http://localhost:5000",
        isActive: true,
      }).returning();
      console.log("✅ [SEED] Sistema NuP-Kan criado");
    } else {
      console.log("ℹ️  [SEED] Sistema NuP-Kan já existe");
    }
    
    // =============================================================================
    // 2. Sincronizar funções do permissions.json
    // =============================================================================
    console.log("\n🔄 [SEED] Sincronizando funções do permissions.json...");
    
    // Ler permissions.json do NuP-Kan
    const permissionsPath = path.join(process.cwd(), "..", "permissions.json");
    const permissionsData = JSON.parse(await fs.readFile(permissionsPath, "utf-8"));
    
    const { functions: manifestFunctions } = permissionsData;
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const func of manifestFunctions) {
      const functionId = `nup-kan-${func.key}`;
      
      const existing = await db.query.functions.findFirst({
        where: eq(functions.id, functionId),
      });
      
      if (!existing) {
        await db.insert(functions).values({
          id: functionId,
          systemId: "nup-kan",
          functionKey: func.key,
          name: func.name,
          category: func.category || "",
          description: func.description || "",
          endpoint: func.endpoint || "",
        });
        createdCount++;
      } else {
        await db
          .update(functions)
          .set({
            name: func.name,
            category: func.category || "",
            description: func.description || "",
            endpoint: func.endpoint || "",
            updatedAt: new Date(),
          })
          .where(eq(functions.id, functionId));
        updatedCount++;
      }
    }
    
    console.log(`✅ [SEED] Funções sincronizadas: ${createdCount} criadas, ${updatedCount} atualizadas`);
    
    // =============================================================================
    // 3. Criar perfil "Administrador Global"
    // =============================================================================
    console.log("\n👑 [SEED] Criando perfil Administrador Global...");
    
    let adminProfile = await db.query.profiles.findFirst({
      where: eq(profiles.name, "Administrador Global"),
    });
    
    if (!adminProfile) {
      [adminProfile] = await db.insert(profiles).values({
        id: nanoid(),
        name: "Administrador Global",
        description: "Acesso total a todos os sistemas",
        color: "#dc2626",
        isDefault: false,
        isGlobal: true,
        systemId: null, // Global
      }).returning();
      console.log("✅ [SEED] Perfil Administrador Global criado");
    } else {
      console.log("ℹ️  [SEED] Perfil Administrador Global já existe");
    }
    
    // =============================================================================
    // 4. Atribuir todas as funções ao perfil admin
    // =============================================================================
    console.log("\n🔗 [SEED] Atribuindo permissões ao perfil admin...");
    
    const allFunctions = await db.query.functions.findMany();
    
    let assignedCount = 0;
    
    for (const func of allFunctions) {
      const existing = await db.query.profileFunctions.findFirst({
        where: and(
          eq(profileFunctions.profileId, adminProfile.id),
          eq(profileFunctions.functionId, func.id)
        ),
      });
      
      if (!existing) {
        await db.insert(profileFunctions).values({
          id: nanoid(),
          profileId: adminProfile.id,
          functionId: func.id,
          granted: true,
        });
        assignedCount++;
      }
    }
    
    console.log(`✅ [SEED] ${assignedCount} permissões atribuídas ao perfil admin`);
    
    // =============================================================================
    // 5. Criar/atualizar usuário admin
    // =============================================================================
    console.log("\n👤 [SEED] Criando/atualizando usuário admin...");
    
    const adminEmail = "yfaf01@gmail.com";
    const adminPassword = "123456";
    
    // Buscar usuário usando SQL direto (tabela users compartilhada com Kan)
    const findUserResult = await db.execute(sql`
      SELECT * FROM users WHERE email = ${adminEmail} LIMIT 1
    `);
    
    let adminUser = findUserResult.rows[0] as any;
    
    if (!adminUser) {
      // Usuário não existe, vamos criá-lo
      // Nota: A tabela users é compartilhada com o Kan, então usamos apenas os campos compatíveis
      const passwordHash = await hashPassword(adminPassword);
      
      // Inserir diretamente via SQL para evitar problemas de schema incompatível
      const result = await db.execute(sql`
        INSERT INTO users (email, name, password, role, avatar)
        VALUES (${adminEmail}, ${"Administrador"}, ${passwordHash}, ${"admin"}, ${""})
        RETURNING *
      `);
      
      adminUser = result.rows[0] as any;
      console.log(`✅ [SEED] Usuário admin criado (${adminEmail})`);
    } else {
      console.log(`ℹ️  [SEED] Usuário admin já existe (${adminEmail})`);
    }
    
    // =============================================================================
    // 6. Associar usuário admin ao perfil
    // =============================================================================
    console.log("\n🔗 [SEED] Associando usuário admin ao perfil...");
    
    const existingAssociation = await db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.userId, adminUser.id),
        eq(userProfiles.profileId, adminProfile.id)
      ),
    });
    
    if (!existingAssociation) {
      await db.insert(userProfiles).values({
        id: nanoid(),
        userId: adminUser.id,
        profileId: adminProfile.id,
      });
      console.log("✅ [SEED] Usuário admin associado ao perfil Administrador Global");
    } else {
      console.log("ℹ️  [SEED] Usuário admin já está associado ao perfil");
    }
    
    // =============================================================================
    // RESUMO
    // =============================================================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 [SEED] Seed concluído com sucesso!");
    console.log("=".repeat(60));
    console.log(`
📊 Resumo:
   • Sistema: ${kanSystem.name}
   • Funções sincronizadas: ${allFunctions.length}
   • Perfil: ${adminProfile.name}
   • Usuário admin: ${adminUser.email}
   
🔐 Credenciais de acesso:
   Email: ${adminEmail}
   Senha: ${adminPassword}
   
🚀 Próximos passos:
   1. Iniciar servidor: npm run dev
   2. Fazer login na Central
   3. Sincronizar permissões do NuP-Kan
    `);
    
  } catch (error) {
    console.error("❌ [SEED] Erro durante seed:", error);
    throw error;
  }
}

// Executar seed
seed()
  .then(() => {
    console.log("✅ [SEED] Processo finalizado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ [SEED] Falha:", error);
    process.exit(1);
  });
