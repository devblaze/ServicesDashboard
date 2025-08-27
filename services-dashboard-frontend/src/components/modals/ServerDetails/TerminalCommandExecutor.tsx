import React, { useRef, useState } from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { serverManagementApi, type CommandResult } from '../../../services/serverManagementApi';

interface TerminalTabProps {
  serverId: number;
  darkMode: boolean;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({ serverId, darkMode }) => {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const executeCommandMutation = useMutation({
    mutationFn: (cmd: string) => serverManagementApi.executeCommand(serverId, cmd),
    onSuccess: (result: CommandResult) => {
      setCommandHistory(prev => [...prev, result]);
      setCommand('');
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    },
  });

  const handleExecuteCommand = () => {
    if (!command.trim()) return;
    executeCommandMutation.mutate(command.trim());
  };

  return (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Terminal className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Remote Terminal
        </h3>
      </div>
      
      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className={`h-64 p-4 mb-4 rounded-lg border font-mono text-sm overflow-y-auto ${
          darkMode
            ? 'bg-gray-900/50 border-gray-700/50 text-green-400'
            : 'bg-gray-50 border-gray-200 text-gray-900'
        }`}
      >
        {commandHistory.length === 0 ? (
          <div className="flex items-center space-x-2">
            <Terminal className={`w-4 h-4 opacity-50 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`} />
            <p className={darkMode ? 'text-gray-500' : 'text-gray-600'}>
              Terminal ready. Enter commands below...
            </p>
          </div>
        ) : (
          commandHistory.map((result: CommandResult, index: number) => (
            <div key={index} className="mb-4">
              <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                $ {/* Command would be stored if needed */}
              </div>
              <div className="whitespace-pre-wrap mt-1">
                {result.output || 'No output'}
              </div>
              {result.exitCode !== undefined && result.exitCode !== 0 && (
                <div className="text-red-400 mt-1">
                  Exit code: {result.exitCode}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Command Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleExecuteCommand()}
          placeholder="Enter command..."
          disabled={executeCommandMutation.isPending}
          className={`flex-1 px-3 py-2 rounded-lg border font-mono ${
            darkMode
              ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
        />
        <button
          onClick={handleExecuteCommand}
          disabled={!command.trim() || executeCommandMutation.isPending}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {executeCommandMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Execute'
          )}
        </button>
      </div>
    </div>
  );
};