import { BaseApiClient } from './BaseApiClient';
import type {
  ScheduledTask,
  CreateScheduledTaskRequest,
  UpdateScheduledTaskRequest,
  TaskExecution,
  ManualExecutionRequest,
  CronValidationRequest,
  CronValidationResponse,
} from '../types/ScheduledTask';
import { mockScheduledTasks, mockTaskExecutions } from '../mocks/mockScheduledTasks';

const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true';

class ScheduledTasksApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'ScheduledTasks' });
  }

  // Get all scheduled tasks
  async getTasks(): Promise<ScheduledTask[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return mockScheduledTasks;
    }
    return this.request<ScheduledTask[]>('get', '/scheduledtasks');
  }

  // Get a specific task by ID
  async getTask(id: number): Promise<ScheduledTask> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const task = mockScheduledTasks.find(t => t.id === id);
      if (!task) throw new Error('Task not found');
      return task;
    }
    return this.request<ScheduledTask>('get', `/scheduledtasks/${id}`);
  }

  // Create a new scheduled task
  async createTask(request: CreateScheduledTaskRequest): Promise<ScheduledTask> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const newTask: ScheduledTask = {
        id: Math.max(...mockScheduledTasks.map(t => t.id)) + 1,
        ...request,
        isEnabled: request.isEnabled ?? true,
        timeoutSeconds: request.timeoutSeconds ?? 300,
        timeZone: request.timeZone ?? 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        servers: [],
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      };
      console.log('Demo mode: created task', newTask);
      return newTask;
    }
    return this.request<ScheduledTask>('post', '/scheduledtasks', request);
  }

  // Update an existing task
  async updateTask(id: number, request: UpdateScheduledTaskRequest): Promise<ScheduledTask> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const task = mockScheduledTasks.find(t => t.id === id);
      if (!task) throw new Error('Task not found');
      return { ...task, ...request, updatedAt: new Date().toISOString() };
    }
    return this.request<ScheduledTask>('put', `/scheduledtasks/${id}`, request);
  }

  // Delete a task
  async deleteTask(id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('Demo mode: deleted task', id);
      return;
    }
    return this.request<void>('delete', `/scheduledtasks/${id}`);
  }

  // Toggle task enabled/disabled
  async toggleTask(id: number, enabled: boolean): Promise<{ message: string }> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('Demo mode: toggled task', id, enabled);
      return { message: `Task ${enabled ? 'enabled' : 'disabled'} successfully` };
    }
    return this.request<{ message: string }>('post', `/scheduledtasks/${id}/toggle`, { enabled });
  }

  // Execute task manually on specified servers
  async executeTaskManually(id: number, request: ManualExecutionRequest): Promise<TaskExecution[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const task = mockScheduledTasks.find(t => t.id === id);
      const executions: TaskExecution[] = request.serverIds.map((serverId, index) => ({
        id: Date.now() + index,
        scheduledTaskId: id,
        scheduledTaskName: task?.name || 'Unknown Task',
        serverId,
        serverName: `Server ${serverId}`,
        startedAt: new Date().toISOString(),
        status: 'Running',
        durationMs: 0,
      }));
      console.log('Demo mode: executed task manually', executions);
      return executions;
    }
    return this.request<TaskExecution[]>('post', `/scheduledtasks/${id}/execute`, request);
  }

  // Get execution history for a task
  async getTaskExecutions(id: number, limit: number = 50): Promise<TaskExecution[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return (mockTaskExecutions[id] || []).slice(0, limit);
    }
    return this.request<TaskExecution[]>('get', `/scheduledtasks/${id}/executions`, undefined, { limit });
  }

  // Get execution history for a server
  async getServerExecutions(serverId: number, limit: number = 50): Promise<TaskExecution[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const allExecutions = Object.values(mockTaskExecutions).flat();
      return allExecutions.filter(e => e.serverId === serverId).slice(0, limit);
    }
    return this.request<TaskExecution[]>('get', `/scheduledtasks/executions/server/${serverId}`, undefined, { limit });
  }

  // Validate a cron expression
  async validateCron(request: CronValidationRequest): Promise<CronValidationResponse> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 200));
      // Simple validation - in demo mode, always return valid
      return {
        isValid: true,
        nextExecution: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    }
    return this.request<CronValidationResponse>('post', '/scheduledtasks/validate-cron', request);
  }
}

export const scheduledTasksApi = new ScheduledTasksApiClient();
