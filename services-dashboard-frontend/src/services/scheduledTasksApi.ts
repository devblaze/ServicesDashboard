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

class ScheduledTasksApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'ScheduledTasks' });
  }

  // Get all scheduled tasks
  async getTasks(): Promise<ScheduledTask[]> {
    return this.request<ScheduledTask[]>('get', '/scheduledtasks');
  }

  // Get a specific task by ID
  async getTask(id: number): Promise<ScheduledTask> {
    return this.request<ScheduledTask>('get', `/scheduledtasks/${id}`);
  }

  // Create a new scheduled task
  async createTask(request: CreateScheduledTaskRequest): Promise<ScheduledTask> {
    return this.request<ScheduledTask>('post', '/scheduledtasks', request);
  }

  // Update an existing task
  async updateTask(id: number, request: UpdateScheduledTaskRequest): Promise<ScheduledTask> {
    return this.request<ScheduledTask>('put', `/scheduledtasks/${id}`, request);
  }

  // Delete a task
  async deleteTask(id: number): Promise<void> {
    return this.request<void>('delete', `/scheduledtasks/${id}`);
  }

  // Toggle task enabled/disabled
  async toggleTask(id: number, enabled: boolean): Promise<{ message: string }> {
    return this.request<{ message: string }>('post', `/scheduledtasks/${id}/toggle`, { enabled });
  }

  // Execute task manually on specified servers
  async executeTaskManually(id: number, request: ManualExecutionRequest): Promise<TaskExecution[]> {
    return this.request<TaskExecution[]>('post', `/scheduledtasks/${id}/execute`, request);
  }

  // Get execution history for a task
  async getTaskExecutions(id: number, limit: number = 50): Promise<TaskExecution[]> {
    return this.request<TaskExecution[]>('get', `/scheduledtasks/${id}/executions`, undefined, { limit });
  }

  // Get execution history for a server
  async getServerExecutions(serverId: number, limit: number = 50): Promise<TaskExecution[]> {
    return this.request<TaskExecution[]>('get', `/scheduledtasks/executions/server/${serverId}`, undefined, { limit });
  }

  // Validate a cron expression
  async validateCron(request: CronValidationRequest): Promise<CronValidationResponse> {
    return this.request<CronValidationResponse>('post', '/scheduledtasks/validate-cron', request);
  }
}

export const scheduledTasksApi = new ScheduledTasksApiClient();
