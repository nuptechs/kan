import type { Express } from "express";
import { storage } from "./storage";
import type { Permission, InsertPermission } from "@shared/schema";

interface RoutePermission {
  id: string;
  name: string;
  description: string;
  category: string;
  route: string;
  method: string;
}

interface DetectedFunction {
  name: string;
  category: string;
  description: string;
  routes: {
    method: string;
    path: string;
  }[];
}

export class PermissionSyncService {
  private static instance: PermissionSyncService;
  
  private constructor() {}
  
  static getInstance(): PermissionSyncService {
    if (!PermissionSyncService.instance) {
      PermissionSyncService.instance = new PermissionSyncService();
    }
    return PermissionSyncService.instance;
  }

  /**
   * Analisa as rotas da aplicação e identifica funcionalidades
   */
  private analyzeRoutes(app: Express): DetectedFunction[] {
    const detectedFunctions: DetectedFunction[] = [];
    
    // Lista de funcionalidades conhecidas baseadas na estrutura atual
    const functionMap: { [key: string]: DetectedFunction } = {
      'tasks': {
        name: 'Gerenciar Tarefas',
        category: 'tasks',
        description: 'Funcionalidades relacionadas ao gerenciamento de tarefas',
        routes: []
      },
      'boards': {
        name: 'Gerenciar Boards',
        category: 'boards',
        description: 'Funcionalidades relacionadas ao gerenciamento de quadros kanban',
        routes: []
      },
      'columns': {
        name: 'Gerenciar Colunas',
        category: 'columns',
        description: 'Funcionalidades relacionadas ao gerenciamento de colunas',
        routes: []
      },
      'teams': {
        name: 'Gerenciar Times',
        category: 'teams',
        description: 'Funcionalidades relacionadas ao gerenciamento de times',
        routes: []
      },
      'users': {
        name: 'Gerenciar Usuários',
        category: 'users',
        description: 'Funcionalidades relacionadas ao gerenciamento de usuários',
        routes: []
      },
      'profiles': {
        name: 'Gerenciar Perfis',
        category: 'profiles',
        description: 'Funcionalidades relacionadas ao gerenciamento de perfis de acesso',
        routes: []
      },
      'permissions': {
        name: 'Gerenciar Permissões',
        category: 'permissions',
        description: 'Funcionalidades relacionadas ao sistema de permissões',
        routes: []
      },
      'analytics': {
        name: 'Visualizar Analytics',
        category: 'analytics',
        description: 'Funcionalidades relacionadas a métricas e relatórios',
        routes: []
      },
      'tags': {
        name: 'Gerenciar Tags',
        category: 'tags',
        description: 'Funcionalidades relacionadas ao gerenciamento de tags',
        routes: []
      },
      'custom-fields': {
        name: 'Campos Personalizados',
        category: 'custom-fields',
        description: 'Funcionalidades relacionadas aos campos personalizados',
        routes: []
      },
      'export': {
        name: 'Exportar Dados',
        category: 'export',
        description: 'Funcionalidades relacionadas à exportação de dados',
        routes: []
      },
      'system': {
        name: 'Sistema',
        category: 'system',
        description: 'Funcionalidades do sistema como logs e configurações',
        routes: []
      },
      'auth': {
        name: 'Autenticação',
        category: 'auth',
        description: 'Funcionalidades de autenticação e autorização',
        routes: []
      }
    };

    // Mapear rotas para funcionalidades
    // Como não podemos acessar diretamente o router do Express de forma programática,
    // vamos definir as rotas baseadas na estrutura atual do código
    const routeMapping = {
      'GET /api/tasks': { category: 'tasks', action: 'list' },
      'GET /api/tasks/:id': { category: 'tasks', action: 'view' },
      'POST /api/tasks': { category: 'tasks', action: 'create' },
      'PATCH /api/tasks/:id': { category: 'tasks', action: 'edit' },
      'DELETE /api/tasks/:id': { category: 'tasks', action: 'delete' },
      'GET /api/tasks/:taskId/assignees': { category: 'tasks', action: 'view-assignees' },
      'POST /api/tasks/:taskId/assignees': { category: 'tasks', action: 'assign' },
      'DELETE /api/tasks/:taskId/assignees/:userId': { category: 'tasks', action: 'unassign' },
      'PUT /api/tasks/:taskId/assignees': { category: 'tasks', action: 'set-assignees' },

      'GET /api/boards': { category: 'boards', action: 'list' },
      'GET /api/boards/:id': { category: 'boards', action: 'view' },
      'POST /api/boards': { category: 'boards', action: 'create' },
      'PATCH /api/boards/:id': { category: 'boards', action: 'edit' },
      'DELETE /api/boards/:id': { category: 'boards', action: 'delete' },
      'GET /api/boards/:boardId/tasks': { category: 'boards', action: 'view-tasks' },
      'GET /api/boards/:boardId/columns': { category: 'boards', action: 'view-columns' },
      'GET /api/boards/:boardId/member-count': { category: 'boards', action: 'view-members' },

      'GET /api/columns': { category: 'columns', action: 'list' },
      'GET /api/columns/:id': { category: 'columns', action: 'view' },
      'POST /api/columns': { category: 'columns', action: 'create' },
      'PUT /api/columns/:id': { category: 'columns', action: 'edit' },
      'PATCH /api/columns/:id': { category: 'columns', action: 'edit' },
      'DELETE /api/columns/:id': { category: 'columns', action: 'delete' },
      'POST /api/columns/reorder': { category: 'columns', action: 'reorder' },

      'GET /api/teams': { category: 'teams', action: 'list' },
      'GET /api/teams/:id': { category: 'teams', action: 'view' },
      'POST /api/teams': { category: 'teams', action: 'create' },
      'PATCH /api/teams/:id': { category: 'teams', action: 'edit' },
      'DELETE /api/teams/:id': { category: 'teams', action: 'delete' },
      'GET /api/teams/:teamId/users': { category: 'teams', action: 'view-members' },

      'GET /api/users': { category: 'users', action: 'list' },
      'GET /api/users/:id': { category: 'users', action: 'view' },
      'POST /api/users': { category: 'users', action: 'create' },
      'PATCH /api/users/:id': { category: 'users', action: 'edit' },
      'DELETE /api/users/:id': { category: 'users', action: 'delete' },
      'GET /api/users/:userId/teams': { category: 'users', action: 'view-teams' },
      'GET /api/users/:userId/permissions': { category: 'users', action: 'view-permissions' },
      'POST /api/users/:userId/teams/:teamId': { category: 'users', action: 'add-to-team' },
      'DELETE /api/users/:userId/teams/:teamId': { category: 'users', action: 'remove-from-team' },

      'GET /api/profiles': { category: 'profiles', action: 'list' },
      'GET /api/profiles/:id': { category: 'profiles', action: 'view' },
      'POST /api/profiles': { category: 'profiles', action: 'create' },
      'PATCH /api/profiles/:id': { category: 'profiles', action: 'edit' },
      'DELETE /api/profiles/:id': { category: 'profiles', action: 'delete' },
      'GET /api/profiles/:profileId/permissions': { category: 'profiles', action: 'view-permissions' },
      'POST /api/profiles/:profileId/permissions': { category: 'profiles', action: 'add-permission' },
      'DELETE /api/profiles/:profileId/permissions/:permissionId': { category: 'profiles', action: 'remove-permission' },

      'GET /api/permissions': { category: 'permissions', action: 'list' },
      'POST /api/permissions': { category: 'permissions', action: 'create' },
      'PATCH /api/permissions/:id': { category: 'permissions', action: 'edit' },
      'DELETE /api/permissions/:id': { category: 'permissions', action: 'delete' },

      'GET /api/analytics': { category: 'analytics', action: 'view' },

      'GET /api/tags': { category: 'tags', action: 'list' },
      'GET /api/tags/:id': { category: 'tags', action: 'view' },
      'POST /api/tags': { category: 'tags', action: 'create' },
      'PATCH /api/tags/:id': { category: 'tags', action: 'edit' },
      'DELETE /api/tags/:id': { category: 'tags', action: 'delete' },

      'GET /api/custom-fields': { category: 'custom-fields', action: 'list' },
      'POST /api/custom-fields': { category: 'custom-fields', action: 'create' },
      'PATCH /api/custom-fields/:id': { category: 'custom-fields', action: 'edit' },
      'DELETE /api/custom-fields/:id': { category: 'custom-fields', action: 'delete' },

      'POST /api/export': { category: 'export', action: 'export' },
      'GET /api/export/history': { category: 'export', action: 'view-history' },

      'GET /api/system/logs': { category: 'system', action: 'view-logs' },
      'DELETE /api/system/logs': { category: 'system', action: 'clear-logs' },

      'POST /api/auth/login': { category: 'auth', action: 'login' },
      'POST /api/auth/register': { category: 'auth', action: 'register' },
      'POST /api/auth/logout': { category: 'auth', action: 'logout' },
      'GET /api/auth/current-user': { category: 'auth', action: 'view-current-user' },

      'GET /api/notifications': { category: 'notifications', action: 'list' },
      'POST /api/notifications': { category: 'notifications', action: 'create' },
    };

    // Processar mapeamento para criar funcionalidades detectadas
    Object.entries(routeMapping).forEach(([routeKey, routeInfo]) => {
      const [method, path] = routeKey.split(' ');
      const categoryKey = routeInfo.category;
      
      if (!functionMap[categoryKey]) {
        functionMap[categoryKey] = {
          name: `Gerenciar ${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}`,
          category: categoryKey,
          description: `Funcionalidades relacionadas ao gerenciamento de ${categoryKey}`,
          routes: []
        };
      }
      
      functionMap[categoryKey].routes.push({
        method,
        path
      });
    });

    return Object.values(functionMap).filter(func => func.routes.length > 0);
  }

  /**
   * Gera permissões baseadas nas funcionalidades detectadas
   */
  private generatePermissions(detectedFunctions: DetectedFunction[]): RoutePermission[] {
    const permissions: RoutePermission[] = [];
    
    // Mapear ações para nomes amigáveis
    const actionNames: { [key: string]: string } = {
      'list': 'Listar',
      'view': 'Visualizar',
      'create': 'Criar',
      'edit': 'Editar',
      'delete': 'Excluir',
      'assign': 'Atribuir',
      'unassign': 'Desatribuir',
      'reorder': 'Reordenar',
      'export': 'Exportar',
      'login': 'Fazer Login',
      'register': 'Registrar',
      'logout': 'Fazer Logout'
    };

    detectedFunctions.forEach(func => {
      // Agrupar rotas por ação
      const actionGroups: { [key: string]: string[] } = {};
      
      func.routes.forEach(route => {
        const routeKey = `${route.method} ${route.path}`;
        const action = this.extractActionFromRoute(route.method, route.path);
        
        if (!actionGroups[action]) {
          actionGroups[action] = [];
        }
        actionGroups[action].push(routeKey);
      });

      // Criar permissões para cada ação
      Object.entries(actionGroups).forEach(([action, routes]) => {
        const actionName = actionNames[action] || action.charAt(0).toUpperCase() + action.slice(1);
        const categoryName = func.category.charAt(0).toUpperCase() + func.category.slice(1);
        
        permissions.push({
          id: `perm-${func.category}-${action}`,
          name: `${actionName} ${categoryName}`,
          description: `Permitir ${actionName.toLowerCase()} ${categoryName.toLowerCase()}`,
          category: func.category,
          route: routes[0], // Usar a primeira rota como referência
          method: routes[0].split(' ')[0]
        });
      });
    });

    return permissions;
  }

  /**
   * Extrai a ação de uma rota
   */
  private extractActionFromRoute(method: string, path: string): string {
    if (method === 'GET') {
      if (path.includes('/:id') || path.includes('/:')) {
        return 'view';
      }
      return 'list';
    }
    if (method === 'POST') return 'create';
    if (method === 'PATCH' || method === 'PUT') return 'edit';
    if (method === 'DELETE') return 'delete';
    
    // Casos especiais
    if (path.includes('/reorder')) return 'reorder';
    if (path.includes('/assign')) return 'assign';
    if (path.includes('/export')) return 'export';
    if (path.includes('/login')) return 'login';
    if (path.includes('/register')) return 'register';
    if (path.includes('/logout')) return 'logout';
    
    return method.toLowerCase();
  }

  /**
   * Garante que o perfil administrador existe no sistema
   */
  private async ensureAdminProfileExists(): Promise<any> {
    try {
      const profiles = await storage.getProfiles();
      
      // Procurar por perfil administrador baseado no nome ou características
      let adminProfile = profiles.find(profile => 
        profile.name.toLowerCase().includes('admin') || 
        profile.name.toLowerCase().includes('administrador')
      );
      
      // Se não encontrou pelo nome, procurar pelo ID conhecido do MemStorage
      if (!adminProfile) {
        adminProfile = profiles.find(profile => profile.id === 'profile-admin');
      }
      
      // Se ainda não encontrou, criar o perfil administrador
      if (!adminProfile) {
        console.log('🔧 [PERMISSION SYNC] Criando perfil administrador...');
        
        const newAdminProfile = {
          name: "Administrador",
          description: "Acesso total ao sistema",
          color: "#ef4444",
          isDefault: "false"
        };
        
        adminProfile = await storage.createProfile(newAdminProfile);
        console.log(`✅ [PERMISSION SYNC] Perfil administrador criado: ${adminProfile.name} (${adminProfile.id})`);
      }
      
      return adminProfile;
    } catch (error) {
      console.error('❌ [PERMISSION SYNC] Erro ao garantir perfil administrador:', error);
      return null;
    }
  }

  /**
   * Identifica o perfil administrador no sistema
   */
  private async getAdminProfile() {
    return await this.ensureAdminProfileExists();
  }

  /**
   * Sincroniza permissões no banco de dados
   */
  async syncPermissions(app: Express): Promise<void> {
    try {
      console.log('🔄 [PERMISSION SYNC] Iniciando sincronização de permissões...');
      
      // 1. Detectar funcionalidades
      const detectedFunctions = this.analyzeRoutes(app);
      console.log(`📊 [PERMISSION SYNC] ${detectedFunctions.length} categorias de funcionalidades detectadas`);
      
      // 2. Gerar permissões
      const newPermissions = this.generatePermissions(detectedFunctions);
      console.log(`🔑 [PERMISSION SYNC] ${newPermissions.length} permissões geradas`);
      
      // 3. Obter perfil administrador
      const adminProfile = await this.getAdminProfile();
      if (!adminProfile) {
        console.error('❌ [PERMISSION SYNC] Não foi possível identificar o perfil administrador');
        return;
      }
      console.log(`👤 [PERMISSION SYNC] Perfil administrador identificado: ${adminProfile.name} (${adminProfile.id})`);
      
      // 4. Obter permissões existentes
      const existingPermissions = await storage.getPermissions();
      const existingPermissionIds = new Set(existingPermissions.map(p => p.id));
      
      // 5. Identificar permissões a serem criadas
      const permissionsToCreate = newPermissions.filter(p => !existingPermissionIds.has(p.id));
      
      // 6. Criar novas permissões e atribuir ao perfil administrador
      let createdCount = 0;
      let assignedCount = 0;
      
      for (const permission of permissionsToCreate) {
        try {
          const insertPermission: InsertPermission = {
            name: permission.name,
            description: permission.description,
            category: permission.category
          };
          
          // Criar a permissão
          await storage.createPermission(insertPermission);
          createdCount++;
          console.log(`✅ [PERMISSION SYNC] Criada permissão: ${permission.name}`);
          
          // Atribuir automaticamente ao perfil administrador
          try {
            await storage.addPermissionToProfile(adminProfile.id, permission.id);
            assignedCount++;
            console.log(`🔗 [PERMISSION SYNC] Permissão "${permission.name}" atribuída ao perfil "${adminProfile.name}"`);
          } catch (assignError) {
            console.error(`❌ [PERMISSION SYNC] Erro ao atribuir permissão ${permission.id} ao perfil administrador:`, assignError);
          }
          
        } catch (error) {
          console.error(`❌ [PERMISSION SYNC] Erro ao criar permissão ${permission.id}:`, error);
        }
      }
      
      // 7. Identificar categorias ativas
      const activeCategories = new Set(newPermissions.map(p => p.category));
      
      // 8. Identificar permissões órfãs (que não correspondem a funcionalidades ativas)
      const orphanPermissions = existingPermissions.filter(p => 
        !newPermissions.some(np => np.id === p.id) && 
        activeCategories.has(p.category)
      );
      
      if (orphanPermissions.length > 0) {
        console.log(`⚠️ [PERMISSION SYNC] ${orphanPermissions.length} permissões órfãs detectadas:`, 
          orphanPermissions.map(p => p.name));
      }
      
      console.log(`✅ [PERMISSION SYNC] Sincronização concluída. ${createdCount} permissões criadas, ${assignedCount} atribuídas ao perfil administrador.`);
      
    } catch (error) {
      console.error('❌ [PERMISSION SYNC] Erro durante sincronização:', error);
    }
  }

  /**
   * Obtém relatório de funcionalidades e permissões
   */
  async getFunctionalityReport(app: Express) {
    const detectedFunctions = this.analyzeRoutes(app);
    const generatedPermissions = this.generatePermissions(detectedFunctions);
    const existingPermissions = await storage.getPermissions();
    
    return {
      detectedFunctions: detectedFunctions.length,
      generatedPermissions: generatedPermissions.length,
      existingPermissions: existingPermissions.length,
      categories: Array.from(new Set(generatedPermissions.map(p => p.category))),
      functionsDetail: detectedFunctions,
      permissionsDetail: generatedPermissions,
      existingPermissionsDetail: existingPermissions
    };
  }
}