import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Terminal, Loader2, Info, Download, AlertCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { serverManagementApi } from '../../../services/serverManagementApi';

interface TerminalTabProps {
  serverId: number;
  darkMode: boolean;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({ serverId, darkMode }) => {
  const [command, setCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastOutputRef = useRef<string>('');

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

  // Function to fetch and update terminal output
  const pollTerminalOutput = useCallback(async () => {
    try {
      const result = await serverManagementApi.getTerminalOutput(serverId);
      if (result.sessionExists && result.output !== lastOutputRef.current) {
        lastOutputRef.current = result.output;
        setTerminalOutput(result.output);
      }
    } catch (error) {
      console.error('Error polling terminal output:', error);
    }
  }, [serverId]);

  // Start polling when component mounts and tmux is available
  useEffect(() => {
    if (tmuxStatus?.isAvailable) {
      // Initial fetch
      pollTerminalOutput();

      // Start polling interval
      pollingIntervalRef.current = setInterval(pollTerminalOutput, 500);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [tmuxStatus?.isAvailable, pollTerminalOutput]);

  // Auto-scroll to bottom when terminal output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Auto-focus input when component mounts or tmux becomes available
  useEffect(() => {
    if (tmuxStatus?.isAvailable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [tmuxStatus?.isAvailable]);

  // Cleanup tmux session when component unmounts
  useEffect(() => {
    return () => {
      serverManagementApi.cleanupTerminalSession(serverId).catch(err => {
        console.error('Failed to cleanup terminal session:', err);
      });
    };
  }, [serverId]);

  const executeCommandMutation = useMutation({
    mutationFn: (cmd: string) => serverManagementApi.executeCommand(serverId, cmd),
    onMutate: () => {
      setIsExecuting(true);
    },
    onSuccess: (_result, cmd) => {
      // Add to command history
      setCommandHistory(prev => {
        const newHistory = [...prev.filter(c => c !== cmd), cmd];
        return newHistory.slice(-50); // Keep last 50 commands
      });
      setHistoryIndex(-1);
      setCommand('');

      // Poll immediately after command execution
      setTimeout(pollTerminalOutput, 100);

      // Continue polling for a bit longer to catch output
      setTimeout(() => setIsExecuting(false), 2000);
    },
    onError: () => {
      setIsExecuting(false);
    }
  });

  const handleExecuteCommand = () => {
    if (!command.trim()) return;
    executeCommandMutation.mutate(command.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Send Ctrl+C to terminal
      executeCommandMutation.mutate('\x03');
    }
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
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Remote Terminal
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {isExecuting && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
              darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
            }`}>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Running...</span>
            </div>
          )}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-xs ${
            darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
          }`}>
            <Info className="w-3 h-3" />
            <span>tmux {tmuxStatus?.version && `(${tmuxStatus.version})`}</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className={`mb-4 p-3 rounded-lg border text-sm ${
        darkMode ? 'bg-blue-900/20 border-blue-600/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        Persistent tmux session with live output. Use arrow keys for command history. Ctrl+C to interrupt.
      </div>

      {/* Terminal Output - Full tmux pane view */}
      <div
        ref={terminalRef}
        onClick={() => inputRef.current?.focus()}
        className={`flex-1 min-h-[400px] p-4 mb-4 rounded-lg border font-mono text-sm overflow-y-auto cursor-text whitespace-pre-wrap ${
          darkMode
            ? 'bg-gray-900 border-gray-700 text-green-400'
            : 'bg-gray-900 border-gray-700 text-green-400'
        }`}
        style={{
          scrollBehavior: 'smooth',
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
          lineHeight: '1.4'
        }}
      >
        {terminalOutput || (
          <div className="text-gray-500">
            Terminal session starting... Enter commands below.
          </div>
        )}
      </div>

      {/* Command Input - Terminal style */}
      <div className={`flex items-center space-x-2 p-2 rounded-lg border ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-900 border-gray-700'
      }`}>
        <span className="text-green-400 font-mono text-sm select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          disabled={executeCommandMutation.isPending}
          autoComplete="off"
          spellCheck={false}
          className={`flex-1 bg-transparent border-none outline-none font-mono text-sm ${
            darkMode ? 'text-white placeholder-gray-500' : 'text-white placeholder-gray-500'
          }`}
          style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
            caretColor: '#22c55e'
          }}
        />
        <button
          onClick={handleExecuteCommand}
          disabled={!command.trim() || executeCommandMutation.isPending}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            darkMode
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {executeCommandMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Run'
          )}
        </button>
      </div>
    </div>
  );
};
