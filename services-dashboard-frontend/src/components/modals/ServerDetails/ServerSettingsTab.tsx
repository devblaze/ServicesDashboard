import React, { useState } from 'react';
import { Edit3, Save, Loader2, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { ManagedServer, ServerType, ServerGroup } from '../../../types/ServerManagement';
import { serverManagementApi } from '../../../services/serverManagementApi';

interface SettingsTabProps {
  server: ManagedServer;
  darkMode: boolean;
  onUpdate: (updatedServer: ManagedServer) => void;
  onClose: () => void;
}

interface EditForm {
  name: string;
  hostAddress: string;
  sshPort: number;
  username: string;
  type: ServerType;
  group: ServerGroup;
  tags: string;
  parentServerId: number | null;
}

const SERVER_TYPES: { value: ServerType; label: string; icon: string }[] = [
  { value: 'Server', label: 'Server', icon: '🖥️' },
  { value: 'RaspberryPi', label: 'Raspberry Pi', icon: '🥧' },
  { value: 'VirtualMachine', label: 'Virtual Machine', icon: '💻' },
  { value: 'Container', label: 'Container', icon: '📦' },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  server,
  darkMode,
  onUpdate,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: server.name,
    hostAddress: server.hostAddress,
    sshPort: server.sshPort || 22,
    username: server.username || 'root',
    type: server.type,
    group: server.group,
    tags: server.tags || '',
    parentServerId: server.parentServerId || null
  });

  const queryClient = useQueryClient();

  // Fetch existing servers for parent selection
  const { data: existingServers = [] } = useQuery({
    queryKey: ['managed-servers'],
    queryFn: () => serverManagementApi.getServers(),
    enabled: isEditing // Only fetch when editing
  });

  const updateServerMutation = useMutation({
    mutationFn: (updates: Partial<ManagedServer>) => 
      serverManagementApi.updateServer(server.id, updates),
    onSuccess: (updatedServer) => {
      onUpdate(updatedServer);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['managed-servers'] });
    },
  });

  const deleteServerMutation = useMutation({
    mutationFn: () => serverManagementApi.deleteServer(server.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-servers'] });
      onClose();
    },
  });

  const handleSave = () => {
    const updates = {
      name: editForm.name,
      hostAddress: editForm.hostAddress,
      sshPort: editForm.sshPort,
      username: editForm.username,
      type: editForm.type,
      group: editForm.group,
      tags: editForm.tags || undefined,
      parentServerId: editForm.parentServerId,
    };
    updateServerMutation.mutate(updates);
  };

  const FormField: React.FC<{
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: 'text' | 'number';
  }> = ({ label, value, onChange, type = 'text' }) => (
    <div>
      <label className={`block text-sm font-medium mb-2 ${
        darkMode ? 'text-gray-200' : 'text-gray-700'
      }`}>
        {label}
      </label>
      {isEditing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-700/50 border-gray-600/50 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
        />
      ) : (
        <p className={`px-3 py-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {value}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Server Settings
        </h3>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={updateServerMutation.isPending}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateServerMutation.isPending}
                className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:opacity-50`}
              >
                {updateServerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <FormField
          label="Server Name"
          value={editForm.name}
          onChange={(value) => setEditForm({...editForm, name: value})}
        />
        <FormField
          label="Host Address"
          value={editForm.hostAddress}
          onChange={(value) => setEditForm({...editForm, hostAddress: value})}
        />
        <FormField
          label="SSH Port"
          value={editForm.sshPort}
          onChange={(value) => setEditForm({...editForm, sshPort: parseInt(value) || 22})}
          type="number"
        />
        <FormField
          label="Username"
          value={editForm.username}
          onChange={(value) => setEditForm({...editForm, username: value})}
        />

        {/* Server Type */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Server Type
          </label>
          {isEditing ? (
            <select
              value={editForm.type}
              onChange={(e) => setEditForm({...editForm, type: e.target.value as ServerType})}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
            >
              {SERVER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          ) : (
            <p className={`px-3 py-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {SERVER_TYPES.find(t => t.value === editForm.type)?.icon} {SERVER_TYPES.find(t => t.value === editForm.type)?.label}
            </p>
          )}
        </div>

        {/* Server Group */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Server Group
          </label>
          {isEditing ? (
            <select
              value={editForm.group}
              onChange={(e) => setEditForm({...editForm, group: e.target.value as ServerGroup})}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
            >
              <option value="OnPremise">🏢 On-Premise</option>
              <option value="Remote">🌐 Remote</option>
            </select>
          ) : (
            <p className={`px-3 py-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {editForm.group === 'OnPremise' ? '🏢 On-Premise' : '🌐 Remote'}
            </p>
          )}
        </div>

        {/* Parent Server */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Parent Server <span className="text-sm font-normal text-gray-500">(optional)</span>
          </label>
          {isEditing ? (
            <select
              value={editForm.parentServerId || ''}
              onChange={(e) => setEditForm({...editForm, parentServerId: e.target.value ? parseInt(e.target.value) : null})}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
            >
              <option value="">None (Standalone Server)</option>
              {existingServers
                .filter(s => s.id !== server.id) // Don't allow selecting itself as parent
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.hostAddress})
                  </option>
                ))}
            </select>
          ) : (
            <p className={`px-3 py-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {editForm.parentServerId
                ? existingServers.find(s => s.id === editForm.parentServerId)?.name || 'Unknown'
                : 'None (Standalone Server)'}
            </p>
          )}
        </div>

        <FormField
          label="Tags"
          value={editForm.tags}
          onChange={(value) => setEditForm({...editForm, tags: value})}
        />
      </div>

      {/* Danger Zone */}
      <div className={`p-4 rounded-lg border ${
        darkMode ? 'bg-red-900/20 border-red-600/50' : 'bg-red-50 border-red-200'
      }`}>
        <h4 className={`font-medium mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
          Danger Zone
        </h4>
        <p className={`text-sm mb-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
          Permanently delete this server. This action cannot be undone.
        </p>
        <button
          onClick={() => deleteServerMutation.mutate()}
          disabled={deleteServerMutation.isPending}
          className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          } disabled:opacity-50`}
        >
          {deleteServerMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Delete Server
        </button>
      </div>
    </div>
  );
};
