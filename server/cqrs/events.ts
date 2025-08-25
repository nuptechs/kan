/**
 * 📡 EVENT-DRIVEN SYSTEM - Sistema de Eventos Ultra-Rápido
 * 
 * RESPONSABILIDADES:
 * - Event Bus com Redis para escalabilidade
 * - Sincronização automática PostgreSQL → MongoDB
 * - Event Handlers para atualizar Read Models
 * - Garantir eventual consistency
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { mongoStore } from '../mongodb';

// Configuração Redis para Event Bus
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 5000,
});

// Event Types
export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;
  data: any;
}

export interface BoardCreatedEvent extends DomainEvent {
  type: 'board.created';
  boardId: string;
  board: any;
}

export interface TaskCreatedEvent extends DomainEvent {
  type: 'task.created';
  taskId: string;
  task: any;
}

export interface TaskUpdatedEvent extends DomainEvent {
  type: 'task.updated';
  taskId: string;
  task: any;
  changes: any;
}

export interface TaskDeletedEvent extends DomainEvent {
  type: 'task.deleted';
  taskId: string;
  task: any;
}

/**
 * 🚀 EVENT BUS - Hub Central de Eventos
 */
class EventBus {
  private eventQueue: Queue;
  private worker: Worker | null = null;

  constructor() {
    // Fila de eventos ultra-rápida
    this.eventQueue = new Queue('domain-events', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: 'exponential',
      },
    });

    this.startEventWorker();
  }

  // 📡 Emitir evento
  async emit(eventType: string, eventData: any): Promise<void> {
    const event: DomainEvent = {
      type: eventType,
      timestamp: new Date(),
      aggregateId: eventData.id || eventData.boardId || eventData.taskId || 'unknown',
      data: eventData,
    };

    try {
      await this.eventQueue.add(eventType, event, {
        priority: this.getEventPriority(eventType),
      });
      
      console.log(`📡 [EVENT] ${eventType} emitido:`, event.aggregateId);
    } catch (error) {
      console.error(`❌ [EVENT] Erro emitindo ${eventType}:`, error);
      throw error;
    }
  }

  // 🎯 Worker para processar eventos
  private startEventWorker(): void {
    this.worker = new Worker('domain-events', async (job: Job) => {
      const event = job.data as DomainEvent;
      
      console.log(`🔄 [EVENT-WORKER] Processando ${event.type}`);
      const startTime = Date.now();

      try {
        await this.handleEvent(event);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [EVENT-WORKER] ${event.type} processado em ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [EVENT-WORKER] Erro em ${event.type} após ${duration}ms:`, error);
        throw error;
      }
    }, {
      connection: redis,
      concurrency: 10, // Processar 10 eventos em paralelo
    });

    this.worker.on('completed', (job) => {
      console.log(`🎯 [EVENT-WORKER] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`💥 [EVENT-WORKER] Job ${job?.id} failed:`, err);
    });
  }

  // 🎪 Router de eventos para handlers
  private async handleEvent(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'board.created':
        await EventHandlers.handleBoardCreated(event as BoardCreatedEvent);
        break;
      case 'task.created':
        await EventHandlers.handleTaskCreated(event as TaskCreatedEvent);
        break;
      case 'task.updated':
        await EventHandlers.handleTaskUpdated(event as TaskUpdatedEvent);
        break;
      case 'task.deleted':
        await EventHandlers.handleTaskDeleted(event as TaskDeletedEvent);
        break;
      default:
        console.warn(`⚠️ [EVENT] Handler não encontrado para: ${event.type}`);
    }
  }

  // 📊 Prioridade dos eventos
  private getEventPriority(eventType: string): number {
    switch (eventType) {
      case 'user.login':
      case 'user.permissions.updated':
        return 10; // Alta prioridade
      case 'task.created':
      case 'task.updated':
        return 5;  // Média prioridade
      case 'board.created':
      case 'board.updated':
        return 3;  // Baixa prioridade
      default:
        return 1;  // Prioridade padrão
    }
  }

  // 📈 Métricas do Event Bus
  async getMetrics() {
    try {
      const waiting = await this.eventQueue.getWaiting();
      const active = await this.eventQueue.getActive();
      const completed = await this.eventQueue.getCompleted();
      const failed = await this.eventQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        health: 'healthy',
      };
    } catch (error) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        health: 'unhealthy',
        error: error?.toString(),
      };
    }
  }
}

/**
 * 🎭 EVENT HANDLERS - Sincronização PostgreSQL → MongoDB
 */
class EventHandlers {
  
  // 📝 Handler: Board Criado
  static async handleBoardCreated(event: BoardCreatedEvent): Promise<void> {
    if (!mongoStore.collections) {
      console.log('🟡 [EVENT-HANDLER] MongoDB não disponível, pulando sincronização');
      return;
    }

    const { board } = event.data;

    // Criar board otimizado no MongoDB (Read Model)
    const boardReadModel = {
      _id: board.id,
      name: board.name,
      description: board.description || '',
      color: board.color || '#3B82F6',
      createdAt: board.createdAt,
      createdById: board.createdById,
      
      // Dados pré-calculados (iniciais)
      taskCount: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      
      columns: [], // Será preenchido quando colunas forem criadas
      activeMembers: [], // Será preenchido quando membros entrarem
      
      metrics: {
        avgTaskCompletion: 0,
        cycleTime: 0,
        throughput: 0,
        lastActivity: board.createdAt,
      },
    };

    await mongoStore.collections.boardsWithStats.replaceOne(
      { _id: board.id },
      boardReadModel,
      { upsert: true }
    );

    console.log(`📊 [SYNC] Board ${board.name} sincronizado para MongoDB`);
  }

  // 📝 Handler: Task Criada
  static async handleTaskCreated(event: TaskCreatedEvent): Promise<void> {
    if (!mongoStore.collections) return;

    const { task } = event.data;

    // Criar task otimizada no MongoDB (Read Model)
    const taskReadModel = {
      _id: task.id,
      boardId: task.boardId,
      columnId: task.status, // Status = columnId para compatibilidade
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      progress: task.progress || 0,
      assigneeId: task.assigneeId,
      assigneeName: '', // Será preenchido em paralelo
      assigneeAvatar: '',
      tags: task.tags || [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      
      // Dados desnormalizados (será preenchido)
      boardName: '',
      columnTitle: task.status,
      
      recentActivity: [{
        action: 'created',
        timestamp: task.createdAt,
        userId: task.assigneeId || 'system',
        userName: 'Sistema',
      }],
    };

    // Operações em paralelo para performance máxima
    await Promise.all([
      // Inserir task otimizada
      mongoStore.collections.tasksOptimized.replaceOne(
        { _id: task.id },
        taskReadModel,
        { upsert: true }
      ),
      
      // Atualizar contadores do board
      mongoStore.collections.boardsWithStats.updateOne(
        { _id: task.boardId },
        { 
          $inc: { 
            taskCount: 1,
            pendingTasks: 1 
          },
          $set: { 
            'metrics.lastActivity': new Date() 
          }
        }
      ),
    ]);

    console.log(`📊 [SYNC] Task ${task.title} sincronizada para MongoDB`);
  }

  // 📝 Handler: Task Atualizada
  static async handleTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    if (!mongoStore.collections) return;

    const { task, changes } = event.data;

    // Atualizar task no MongoDB
    const updateData: any = {
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      progress: task.progress || 0,
      updatedAt: task.updatedAt,
      
      $push: {
        recentActivity: {
          action: 'updated',
          timestamp: task.updatedAt,
          userId: 'system',
          userName: 'Sistema',
        }
      }
    };

    await mongoStore.collections.tasksOptimized.updateOne(
      { _id: task.id },
      { $set: updateData }
    );

    console.log(`📊 [SYNC] Task ${task.title} atualizada no MongoDB`);
  }

  // 📝 Handler: Task Deletada
  static async handleTaskDeleted(event: TaskDeletedEvent): Promise<void> {
    if (!mongoStore.collections) return;

    const { taskId, task } = event.data;

    // Operações em paralelo
    await Promise.all([
      // Remover task do MongoDB
      mongoStore.collections.tasksOptimized.deleteOne({ _id: taskId }),
      
      // Atualizar contadores do board
      mongoStore.collections.boardsWithStats.updateOne(
        { _id: task.boardId },
        { 
          $inc: { 
            taskCount: -1,
            // Decrementar contador específico baseado no status
            ...(task.status === 'done' && { completedTasks: -1 }),
            ...(task.status === 'in_progress' && { inProgressTasks: -1 }),
            ...(task.status !== 'done' && task.status !== 'in_progress' && { pendingTasks: -1 }),
          },
          $set: { 
            'metrics.lastActivity': new Date() 
          }
        }
      ),
    ]);

    console.log(`📊 [SYNC] Task ${task.title} removida do MongoDB`);
  }
}

export const eventBus = new EventBus();
export { EventHandlers };