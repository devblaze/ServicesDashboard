import React, { useRef, useState, useEffect } from 'react';
import { Terminal, Loader2, Info, Download, AlertCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { serverManagementApi, type CommandResult } from '../../../services/serverManagementApi';

interface TerminalTabProps {
  serverId: number;
  darkMode: boolean;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({ serverId, darkMode }) => {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check tmux availability when component mounts
  const { data: tmuxStatus, isLoading: checkingTmux, refetch: recheckTmux } = useQuery({
    queryKey: ['tmux-availability', serverId],
    queryFn: () => serverManagementApi.checkTmuxAvailability(serverId),
    retry: false
  });

  // Install tmux mutation
  const installTmuxMutation = useMutation({
    mutationFn: () => serverManagementApi.installTmux(serverId),
    onSuccess: () => {
      recheckTmux();
    }
  });

  // Auto-scroll to bottom when command history changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Auto-focus input when component mounts or tmux becomes available
  useEffect(() => {
    if (tmuxStatus?.isAvailable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [tmuxStatus?.isAvailable]);

  // Cleanup tmux session when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      serverManagementApi.cleanupTerminalSession(serverId).catch(err => {
        console.error('Failed to cleanup terminal session:', err);
      });
    };
  }, [serverId]);

  const executeCommandMutation = useMutation({
    mutationFn: (cmd: string) => serverManagementApi.executeCommand(serverId, cmd),
    onSuccess: (result: CommandResult, cmd: string) => {
      // Add the command to the result for display purposes
      setCommandHistory(prev => [...prev, { ...result, command: cmd }]);
      setCommand('');
      // Refocus input after command execution
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    },
  });

  const handleExecuteCommand = () => {
    if (!command.trim()) return;
    executeCommandMutation.mutate(command.trim());
  };

  // Clean terminal output by removing shell prompts and excessive whitespace
  const cleanOutput = (output: string): string => {
    if (!output) return '';

    // Split into lines
    let lines = output.split('\n');

    // Remove lines that are just shell prompts (e.g., "user@host:~$" or "blaze@HpElitedeskDebian:~$")
    lines = lines.filter(line => {
      const trimmed = line.trim();
      // Match common shell prompt patterns
      const isPrompt = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+:.*[$#]\s*$/.test(trimmed);
      return !isPrompt;
    });

    // Join back and trim excessive blank lines
    let cleaned = lines.join('\n');

    // Remove leading and trailing whitespace
    cleaned = cleaned.trim();

    // Replace multiple consecutive newlines with max 2
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned;
  };

  // Show tmux installation prompt if not available
  if (checkingTmux) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Checking tmux availability...
          </p>
        </div>
      </div>
    );
  }

  if (tmuxStatus && !tmuxStatus.isAvailable) {
    return (
      <div className="p-6">
        <div className={`rounded-xl border p-6 ${
          darkMode ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start space-x-3">
            <AlertCircle className={`w-6 h-6 flex-shrink-0 ${
              darkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                tmux is not installed
              </h3>
              <p className={`text-sm mb-4 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                The persistent terminal feature requires tmux to be installed on the remote server.
                Would you like to install it now?
              </p>
              <p className={`text-xs mb-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {tmuxStatus.message}
              </p>
              <button
                onClick={() => installTmuxMutation.mutate()}
                disabled={installTmuxMutation.isPending}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {installTmuxMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Installing tmux...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Install tmux
                  </>
                )}
              </button>
              {installTmuxMutation.isError && (
                <p className={`mt-2 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  Failed to install tmux. Please check server permissions and try again.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Remote Terminal
          </h3>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-xs ${
          darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
        }`}>
          <Info className="w-3 h-3" />
          <span>Persistent tmux session {tmuxStatus?.version && `(${tmuxStatus.version})`}</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className={`mb-4 p-3 rounded-lg border ${
        darkMode ? 'bg-blue-900/20 border-blue-600/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        <p className="text-sm">
          This terminal uses a persistent tmux session. You can navigate directories and run multi-line commands.
          The session persists until you close this modal.
        </p>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        onClick={() => inputRef.current?.focus()}
        className={`h-96 p-4 mb-4 rounded-lg border font-mono text-sm overflow-y-auto cursor-text ${
          darkMode
            ? 'bg-gray-900/50 border-gray-700/50 text-green-400'
            : 'bg-gray-50 border-gray-200 text-gray-900'
        }`}
        style={{ scrollBehavior: 'smooth' }}
      >
        {commandHistory.length === 0 ? (
          <div className="flex items-center space-x-2">
            <Terminal className={`w-4 h-4 opacity-50 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`} />
            <p className={darkMode ? 'text-gray-500' : 'text-gray-600'}>
              Terminal ready. Enter commands below...
            </p>
          </div>
        ) : (
          commandHistory.map((result: CommandResult, index: number) => {
            const cleanedOutput = cleanOutput(result.output);
            const cleanedError = cleanOutput(result.error);
            const hasOutput = cleanedOutput || cleanedError;

            return (
              <div key={index} className="mb-2">
                {/* Command prompt with command */}
                <div className={`flex items-start ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  <span className="select-none mr-1">$</span>
                  <span className="flex-1">{result.command || ''}</span>
                </div>
                {/* Command output */}
                {hasOutput && (
                  <div className={`whitespace-pre-wrap mt-1 mb-1 ${
                    cleanedError ? 'text-red-400' : darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {cleanedError || cleanedOutput}
                  </div>
                )}
                {/* Exit code for non-zero exits */}
                {result.exitCode !== undefined && result.exitCode !== 0 && (
                  <div className="text-red-400 text-xs">
                    [Exit code: {result.exitCode}]
                  </div>
                )}
              </div>
            );
          })
        )}
        {/* Show loading indicator while command is running */}
        {executeCommandMutation.isPending && (
          <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Executing...</span>
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="flex space-x-2">
        <input
          ref={inputRef}
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