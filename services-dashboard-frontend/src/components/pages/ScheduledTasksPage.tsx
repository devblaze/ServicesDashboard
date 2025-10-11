import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Server,
  History,
  Loader2
} from 'lucide-react';
import { scheduledTasksApi } from '../../services/scheduledTasksApi';
import type { ScheduledTask, TaskExecution } from '../../types/ScheduledTask';
import { describeCronExpression, formatDateTime, formatNextExecution, formatDuration } from '../../utils/cronUtils';
import { CreateScheduledTaskModal } from '../modals/CreateScheduledTaskModal';

interface ScheduledTasksPageProps {
  darkMode?: boolean;
}

export const ScheduledTasksPage: React.FC<ScheduledTasksPageProps> = ({ darkMode = true }) => {
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch scheduled tasks
  const {
    data: tasks = [],
    isLoading,
    error,
    isError
  } = useQuery<ScheduledTask[], Error>({
    queryKey: ['scheduled-tasks'],
    queryFn: () => scheduledTasksApi.getTasks(),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    retry: 1,
  });

  // Fetch executions for selected task
  const {
    data: executions = []
  } = useQuery<TaskExecution[], Error>({
    queryKey: ['task-executions', selectedTask?.id],
    queryFn: () => selectedTask ? scheduledTasksApi.getTaskExecutions(selectedTask.id, 20) : Promise.resolve([]),
    enabled: !!selectedTask && showExecutions,
    refetchInterval: 10 * 1000,
  });

  // Toggle task mutation
  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      scheduledTasksApi.toggleTask(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => scheduledTasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      setSelectedTask(null);
    },
  });

  // Manual execution mutation
  const executeTaskMutation = useMutation({
    mutationFn: ({ id, serverIds }: { id: number; serverIds: number[] }) =>
      scheduledTasksApi.executeTaskManually(id, { serverIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-executions'] });
    },
  });

  const handleToggleTask = (task: ScheduledTask) => {
    toggleTaskMutation.mutate({ id: task.id, enabled: !task.isEnabled });
  };

  const handleDeleteTask = (task: ScheduledTask) => {
    if (window.confirm(`Are you sure you want to delete "${task.name}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleExecuteNow = (task: ScheduledTask) => {
    const serverIds = task.servers.map(s => s.id);
    if (serverIds.length === 0) {
      alert('This task has no servers assigned');
      return;
    }
    if (window.confirm(`Execute "${task.name}" on ${serverIds.length} server(s) now?`)) {
      executeTaskMutation.mutate({ id: task.id, serverIds });
    }
  };

  const getStatusBadge = (task: ScheduledTask) => {
    if (!task.isEnabled) {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-200 text-gray-700'
        }`}>
          Disabled
        </span>
      );
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        darkMode ? 'bg-green-600/50 text-green-300' : 'bg-green-100 text-green-700'
      }`}>
        Active
      </span>
    );
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return darkMode ? 'text-green-400' : 'text-green-600';
      case 'Failed': return darkMode ? 'text-red-400' : 'text-red-600';
      case 'TimedOut': return darkMode ? 'text-orange-400' : 'text-orange-600';
      case 'Running': return darkMode ? 'text-blue-400' : 'text-blue-600';
      default: return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  if (isError && error) {
    return (
      <div className={`rounded-2xl border backdrop-blur-sm p-6 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50 shadow-lg'
          : 'bg-white/80 border-gray-200/50 shadow-lg'
      }`}>
        <div className="flex items-center space-x-4 mb-6">
          <AlertTriangle className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
          <div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Connection Error
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Unable to load scheduled tasks
            </p>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${
          darkMode ? 'bg-red-900/20 border border-red-600/50' : 'bg-red-50 border border-red-200'
        }`}>
          <code className="text-sm">{String(error)}</code>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 rounded-2xl border ${
        darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading scheduled tasks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl border backdrop-blur-sm p-6 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50 shadow-lg'
          : 'bg-white/80 border-gray-200/50 shadow-lg'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-purple-900/50' : 'bg-purple-100/50'
            }`}>
              <Clock className={`w-6 h-6 ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Scheduled Tasks
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Automate command execution across your servers
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Active
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {tasks.filter(t => t.isEnabled).length}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <Pause className="w-5 h-5 text-gray-400" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Disabled
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {tasks.filter(t => !t.isEnabled).length}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {tasks.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <Server className="w-5 h-5 text-purple-400" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Servers
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Set(tasks.flatMap(t => t.servers.map(s => s.id))).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-xl border backdrop-blur-sm p-6 transition-all duration-200 ${
              darkMode
                ? 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                : 'bg-white/80 border-gray-200/50 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {task.name}
                  </h3>
                  {getStatusBadge(task)}
                </div>
                {task.description && (
                  <p className={`text-sm mb-3 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {describeCronExpression(task.cronExpression)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-gray-400" />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {task.servers.length} server{task.servers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {task.nextExecutionTime && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {formatNextExecution(task.nextExecutionTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExecuteNow(task)}
                  disabled={executeTaskMutation.isPending}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-blue-600/20 text-blue-400'
                      : 'hover:bg-blue-100 text-blue-600'
                  }`}
                  title="Execute now"
                >
                  {executeTaskMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleToggleTask(task)}
                  disabled={toggleTaskMutation.isPending}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-600/20 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={task.isEnabled ? 'Disable' : 'Enable'}
                >
                  {task.isEnabled ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setShowExecutions(true);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-purple-600/20 text-purple-400'
                      : 'hover:bg-purple-100 text-purple-600'
                  }`}
                  title="View history"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-600/20 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Edit task"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task)}
                  disabled={deleteTaskMutation.isPending}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-red-600/20 text-red-400'
                      : 'hover:bg-red-100 text-red-600'
                  }`}
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className={`flex items-center justify-between pt-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex space-x-6 text-sm">
                <div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Total: </span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {task.totalExecutions}
                  </span>
                </div>
                <div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Success: </span>
                  <span className="font-medium text-green-500">
                    {task.successfulExecutions}
                  </span>
                </div>
                <div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Failed: </span>
                  <span className="font-medium text-red-500">
                    {task.failedExecutions}
                  </span>
                </div>
              </div>
              {task.lastExecutionTime && (
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Last run: {formatDateTime(task.lastExecutionTime)}
                </div>
              )}
            </div>

            {/* Command preview */}
            <div className={`mt-4 p-3 rounded-lg font-mono text-xs ${
              darkMode ? 'bg-gray-900/50' : 'bg-gray-100'
            }`}>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>$ </span>
              <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                {task.command.length > 100 ? task.command.substring(0, 100) + '...' : task.command}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {tasks.length === 0 && !isLoading && !isError && (
        <div className={`text-center py-12 rounded-2xl border ${
          darkMode
            ? 'bg-gray-800/50 border-gray-700/50'
            : 'bg-white/80 border-gray-200/50'
        }`}>
          <Clock className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <h3 className={`text-xl font-semibold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            No scheduled tasks
          </h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Create your first scheduled task to automate command execution
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            }`}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Task
          </button>
        </div>
      )}

      {/* Execution History Modal */}
      {showExecutions && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl border max-w-4xl w-full max-h-[80vh] overflow-hidden ${
            darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Execution History: {selectedTask.name}
                </h3>
                <button
                  onClick={() => {
                    setShowExecutions(false);
                    setSelectedTask(null);
                  }}
                  className={`p-2 rounded-lg ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {executions.length === 0 ? (
                <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No execution history available
                </p>
              ) : (
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div
                      key={execution.id}
                      className={`p-4 rounded-lg border ${
                        darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`font-medium ${getExecutionStatusColor(execution.status)}`}>
                            {execution.status}
                          </span>
                          <span className={`text-sm ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {execution.serverName}
                          </span>
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDateTime(execution.startedAt)}
                        </div>
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Duration: {formatDuration(execution.durationMs)}
                        {execution.exitCode !== undefined && ` • Exit code: ${execution.exitCode}`}
                      </div>
                      {execution.output && (
                        <div className={`mt-2 p-2 rounded font-mono text-xs ${
                          darkMode ? 'bg-gray-900/50' : 'bg-gray-100'
                        }`}>
                          {execution.output.substring(0, 200)}
                          {execution.output.length > 200 && '...'}
                        </div>
                      )}
                      {execution.errorOutput && (
                        <div className={`mt-2 p-2 rounded font-mono text-xs ${
                          darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'
                        }`}>
                          {execution.errorOutput}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateScheduledTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
        }}
        darkMode={darkMode}
      />
    </div>
  );
};
