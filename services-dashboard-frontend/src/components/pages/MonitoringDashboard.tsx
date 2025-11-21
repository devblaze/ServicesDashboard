import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Network,
  RefreshCw,
  Clock,
  ChevronRight,
  AlertCircle,
  Pin,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { metricsApi } from '../../services/metricsApi';
import type {
  ServerMetricsSummary,
  ContainerMetricsSummary,
  TimeRange,
  ChartDataPoint,
} from '../../types/Metrics';

interface MonitoringDashboardProps {
  darkMode?: boolean;
}

// Chart colors for container comparison
const CHART_COLORS = [
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
];

// Helper function to format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Helper to convert TimeRange to minutes
const timeRangeToMinutes = (range: TimeRange): number => {
  const map: Record<TimeRange, number> = {
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '3h': 180,
    '6h': 360,
    '12h': 720,
    '24h': 1440,
  };
  return map[range];
};

// Format time for chart axis
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Custom Tooltip Component with Portal rendering and intelligent positioning
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  darkMode: boolean;
  metricType: 'cpu' | 'memory';
  chartId: string;
  pinnedTooltip: {chartId: string; data: any; position: {x: number; y: number}} | null;
  onPin: (chartId: string, data: any, position: {x: number; y: number}) => void;
  coordinate?: { x: number; y: number };
  viewBox?: any;
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  darkMode,
  metricType,
  chartId,
  pinnedTooltip,
  onPin,
  coordinate,
  viewBox,
  chartRef
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, placement: 'bottom' as 'top' | 'bottom' });
  const [isVisible, setIsVisible] = useState(false);

  const isPinned = pinnedTooltip?.chartId === chartId;
  const displayData = isPinned ? pinnedTooltip.data : { payload, label };
  const savedPosition = isPinned ? pinnedTooltip.position : null;

  useEffect(() => {
    // Use saved position if pinned, otherwise calculate from coordinate
    const sourceCoord = savedPosition || coordinate;
    if (!sourceCoord) return;

    const updatePosition = () => {
      if (!tooltipRef.current) return;

      const tooltipHeight = tooltipRef.current.offsetHeight;
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Use the source coordinates directly (they're already in viewport space when saved)
      let viewportX = sourceCoord.x;
      let viewportY = sourceCoord.y;

      // If not using saved position, convert chart coordinates to viewport coordinates
      if (!savedPosition && coordinate && chartRef?.current) {
        // Get the chart container's position in viewport
        const chartRect = chartRef.current.getBoundingClientRect();

        // Convert chart-relative coordinates to viewport coordinates
        viewportX = chartRect.left + coordinate.x;
        viewportY = chartRect.top + coordinate.y;
      }

      // Calculate if tooltip would overflow bottom of viewport
      const spaceBelow = viewportHeight - viewportY;
      const spaceAbove = viewportY;

      // Position tooltip above if not enough space below
      const placement = spaceBelow < tooltipHeight + 20 && spaceAbove > tooltipHeight ? 'top' : 'bottom';

      let x = viewportX - tooltipWidth / 2;
      let y = placement === 'top' ? viewportY - tooltipHeight - 20 : viewportY + 20;

      // Keep tooltip within horizontal bounds
      if (x < 10) x = 10;
      if (x + tooltipWidth > viewportWidth - 10) x = viewportWidth - tooltipWidth - 10;

      // Keep tooltip within vertical bounds
      if (y < 10) y = 10;
      if (y + tooltipHeight > viewportHeight - 10) y = viewportHeight - tooltipHeight - 10;

      setPosition({ x, y, placement });
      setIsVisible(true);
    };

    // Small delay to ensure tooltip is rendered before calculating position
    requestAnimationFrame(updatePosition);
  }, [active, coordinate, isPinned, displayData, savedPosition, viewBox]);

  if (!active && !isPinned) return null;
  if (!displayData.payload || displayData.payload.length === 0) return null;

  // Sort payload by value (highest first)
  const sortedPayload = [...displayData.payload].sort((a, b) => (b.value || 0) - (a.value || 0));

  const handlePinToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPinned) {
      // Unpin
      onPin('', null, { x: 0, y: 0 });
    } else if (coordinate && chartRef?.current) {
      // Pin - Calculate viewport coordinates for pinning
      const chartRect = chartRef.current.getBoundingClientRect();
      const viewportX = chartRect.left + coordinate.x;
      const viewportY = chartRect.top + coordinate.y;

      onPin(chartId, { payload: displayData.payload, label: displayData.label }, { x: viewportX, y: viewportY });
    }
  };

  const tooltipContent = (
    <div
      ref={tooltipRef}
      data-tooltip="true"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        border: `2px solid ${isPinned ? (darkMode ? '#06b6d4' : '#0891b2') : (darkMode ? '#374151' : '#e5e7eb')}`,
        borderRadius: '8px',
        padding: '12px',
        maxHeight: '400px',
        overflowY: 'auto',
        boxShadow: isPinned ? '0 20px 40px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.3)',
        minWidth: '220px',
        cursor: 'default',
        zIndex: 999999,
        pointerEvents: 'auto',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.1s ease-in-out',
      }}
    >
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center justify-between gap-2">
          <p className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{displayData.label}</p>
          <button
            onClick={handlePinToggle}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isPinned
                ? darkMode
                  ? 'bg-cyan-900 text-cyan-300 hover:bg-cyan-800'
                  : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isPinned ? (
              <>
                <X className="w-3 h-3" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="w-3 h-3" />
                Pin
              </>
            )}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {sortedPayload.map((entry, index) => {
          const containerName = entry.name.replace(metricType === 'cpu' ? '_cpu' : '_memory', '');
          return (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: entry.color,
                    flexShrink: 0,
                  }}
                />
                <span className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {containerName}
                </span>
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {entry.value.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render tooltip in a portal at document root
  return createPortal(tooltipContent, document.body);
};

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ darkMode = true }) => {
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [pinnedTooltip, setPinnedTooltip] = useState<{chartId: string; data: any; position: {x: number; y: number}} | null>(null);

  // Refs for comparison charts
  const cpuChartRef = useRef<HTMLDivElement>(null);
  const memoryChartRef = useRef<HTMLDivElement>(null);

  const minutes = timeRangeToMinutes(timeRange);

  // Handle clicking outside to dismiss pinned tooltip
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside tooltip (not on any element with data-tooltip attribute)
      const target = e.target as HTMLElement;
      if (pinnedTooltip && !target.closest('[data-tooltip]')) {
        setPinnedTooltip(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [pinnedTooltip]);

  // Fetch all servers metrics
  const {
    data: serversData,
    isLoading: serversLoading,
    error: serversError,
    refetch: refetchServers,
  } = useQuery({
    queryKey: ['servers-metrics', minutes],
    queryFn: () => metricsApi.getAllServersMetrics(minutes),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch selected server containers
  const {
    data: containersData,
    isLoading: containersLoading,
  } = useQuery({
    queryKey: ['server-containers-metrics', selectedServerId, minutes],
    queryFn: () => metricsApi.getServerContainersMetrics(selectedServerId!, minutes),
    enabled: selectedServerId !== null,
    refetchInterval: 30000,
  });

  // Prepare chart data for selected container
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!selectedContainerId || !containersData) return [];

    const container = containersData.containers.find(
      (c) => c.containerId === selectedContainerId
    );
    if (!container) return [];

    return container.history.map((point) => ({
      time: formatTime(point.timestamp),
      timestamp: new Date(point.timestamp).getTime(),
      cpu: point.cpuPercentage,
      memory: point.memoryPercentage,
      memoryUsed: point.memoryUsageBytes,
      memoryLimit: point.memoryLimitBytes,
      networkRx: point.networkRxBytes,
      networkTx: point.networkTxBytes,
    }));
  }, [selectedContainerId, containersData]);

  // Prepare comparison chart data for all containers
  const comparisonChartData = React.useMemo(() => {
    if (!containersData || containersData.containers.length === 0) return [];

    // Get all unique timestamps across all containers
    const timestampSet = new Set<number>();
    containersData.containers.forEach(container => {
      container.history.forEach(point => {
        timestampSet.add(new Date(point.timestamp).getTime());
      });
    });

    const sortedTimestamps = Array.from(timestampSet).sort();

    // Build chart data with all containers
    return sortedTimestamps.map(timestamp => {
      const dataPoint: any = {
        time: formatTime(new Date(timestamp).toISOString()),
        timestamp: timestamp,
      };

      // Add data for each container
      containersData.containers.forEach(container => {
        const historyPoint = container.history.find(
          h => new Date(h.timestamp).getTime() === timestamp
        );
        if (historyPoint) {
          dataPoint[`${container.containerName}_cpu`] = historyPoint.cpuPercentage;
          dataPoint[`${container.containerName}_memory`] = historyPoint.memoryPercentage;
        }
      });

      return dataPoint;
    });
  }, [containersData]);

  // Get selected server data
  const selectedServerData = serversData?.servers.find(s => s.serverId === selectedServerId);

  const selectedContainer = containersData?.containers.find(
    (c) => c.containerId === selectedContainerId
  );

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '15m', label: '15 min' },
    { value: '30m', label: '30 min' },
    { value: '1h', label: '1 hour' },
    { value: '3h', label: '3 hours' },
    { value: '6h', label: '6 hours' },
    { value: '12h', label: '12 hours' },
    { value: '24h', label: '24 hours' },
  ];

  return (
    <div className="w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className={`w-8 h-8 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Monitoring Dashboard
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Container metrics and resource usage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {timeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Refresh button */}
            <button
              onClick={() => refetchServers()}
              className={`p-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white'
                  : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-900'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server List Panel */}
          <div
            className={`rounded-xl border backdrop-blur-sm shadow-xl ${
              darkMode ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}
          >
            <div className={`p-5 border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <Server className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Servers
                </h2>
              </div>
              {serversData && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {serversData.servers.length} server{serversData.servers.length !== 1 ? 's' : ''} monitored
                </p>
              )}
            </div>

            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '300px' }}>
              {serversLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className={`w-6 h-6 animate-spin ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              ) : serversError ? (
                <div className="flex items-center justify-center py-8 text-red-500">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Error loading servers
                </div>
              ) : serversData?.servers.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No servers with metrics
                </div>
              ) : (
                serversData?.servers.map((server) => (
                  <ServerListItem
                    key={server.serverId}
                    server={server}
                    isSelected={selectedServerId === server.serverId}
                    onClick={() => {
                      setSelectedServerId(server.serverId);
                      setSelectedContainerId(null);
                    }}
                    darkMode={darkMode}
                  />
                ))
              )}
            </div>
          </div>

          {/* Container List Panel */}
          <div
            className={`rounded-xl border backdrop-blur-sm shadow-xl ${
              darkMode ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}
          >
            <div className={`p-5 border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <Cpu className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Containers
                </h2>
              </div>
              {containersData && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {containersData.containers.length} container{containersData.containers.length !== 1 ? 's' : ''} running
                </p>
              )}
            </div>

            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '300px' }}>
              {!selectedServerId ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select a server
                </div>
              ) : containersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className={`w-6 h-6 animate-spin ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              ) : containersData?.containers.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No container metrics
                </div>
              ) : (
                containersData?.containers.map((container) => (
                  <ContainerListItem
                    key={container.containerId}
                    container={container}
                    isSelected={selectedContainerId === container.containerId}
                    onClick={() => setSelectedContainerId(container.containerId)}
                    darkMode={darkMode}
                  />
                ))
              )}
            </div>
          </div>

          {/* Current Stats Panel */}
          <div
            className={`rounded-xl border backdrop-blur-sm shadow-xl ${
              darkMode ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}
          >
            <div className={`p-5 border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <Activity className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Current Stats
                </h2>
              </div>
            </div>

            <div className="p-4" style={{ minHeight: '300px' }}>
              {selectedContainer ? (
                <div className="space-y-4">
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedContainer.containerName}
                  </h3>

                  <StatCard
                    icon={<Cpu className="w-5 h-5" />}
                    label="CPU"
                    value={`${selectedContainer.currentCpuPercentage.toFixed(1)}%`}
                    subValue={`Avg: ${selectedContainer.avgCpuPercentage.toFixed(1)}% | Max: ${selectedContainer.maxCpuPercentage.toFixed(1)}%`}
                    darkMode={darkMode}
                    color="cyan"
                  />

                  <StatCard
                    icon={<HardDrive className="w-5 h-5" />}
                    label="Memory"
                    value={`${selectedContainer.currentMemoryPercentage.toFixed(1)}%`}
                    subValue={`${formatBytes(selectedContainer.currentMemoryUsageBytes)} / ${formatBytes(selectedContainer.memoryLimitBytes)}`}
                    darkMode={darkMode}
                    color="purple"
                  />

                  <StatCard
                    icon={<Network className="w-5 h-5" />}
                    label="Network I/O"
                    value={`↓ ${formatBytes(selectedContainer.currentNetworkRxBytes)}`}
                    subValue={`↑ ${formatBytes(selectedContainer.currentNetworkTxBytes)}`}
                    darkMode={darkMode}
                    color="green"
                  />
                </div>
              ) : selectedServerData ? (
                <div className="space-y-4">
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedServerData.serverName}
                  </h3>

                  <StatCard
                    icon={<Server className="w-5 h-5" />}
                    label="Containers"
                    value={`${selectedServerData.containerCount}`}
                    subValue={`Running on ${selectedServerData.hostAddress}`}
                    darkMode={darkMode}
                    color="cyan"
                  />

                  <StatCard
                    icon={<Cpu className="w-5 h-5" />}
                    label="Total CPU"
                    value={`${selectedServerData.totalCpuPercentage.toFixed(1)}%`}
                    subValue={`Across all containers`}
                    darkMode={darkMode}
                    color="cyan"
                  />

                  <StatCard
                    icon={<HardDrive className="w-5 h-5" />}
                    label="Total Memory"
                    value={formatBytes(selectedServerData.totalMemoryUsageBytes)}
                    subValue={`Limit: ${formatBytes(selectedServerData.totalMemoryLimitBytes)}`}
                    darkMode={darkMode}
                    color="purple"
                  />

                  <StatCard
                    icon={<Network className="w-5 h-5" />}
                    label="Total Network I/O"
                    value={`↓ ${formatBytes(selectedServerData.totalNetworkRxBytes)}`}
                    subValue={`↑ ${formatBytes(selectedServerData.totalNetworkTxBytes)}`}
                    darkMode={darkMode}
                    color="green"
                  />
                </div>
              ) : (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select a server to view stats
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {selectedContainer && chartData.length > 0 && (
          <div className="mt-6 space-y-8">
            {/* CPU & Memory Chart */}
            <div
              className={`rounded-xl border backdrop-blur-sm shadow-xl p-6 ${
                darkMode ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  CPU & Memory Usage
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={darkMode ? '#374151' : '#e5e7eb'}
                  />
                  <XAxis
                    dataKey="time"
                    stroke={darkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={darkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={12}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      color: darkMode ? '#ffffff' : '#000000',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    name="CPU"
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    name="Memory"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Network I/O Chart */}
            <div
              className={`rounded-xl border backdrop-blur-sm shadow-xl p-6 ${
                darkMode ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Network className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Network I/O (Cumulative)
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={darkMode ? '#374151' : '#e5e7eb'}
                  />
                  <XAxis
                    dataKey="time"
                    stroke={darkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={darkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={12}
                    tickFormatter={(value) => formatBytes(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      color: darkMode ? '#ffffff' : '#000000',
                    }}
                    formatter={(value: number) => [formatBytes(value), '']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="networkRx"
                    stroke="#10b981"
                    fill="#10b98133"
                    strokeWidth={2}
                    name="Received"
                  />
                  <Area
                    type="monotone"
                    dataKey="networkTx"
                    stroke="#f59e0b"
                    fill="#f59e0b33"
                    strokeWidth={2}
                    name="Transmitted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Container Comparison Charts - Show when server selected but no specific container */}
        {selectedServerId && !selectedContainerId && containersData && containersData.containers.length > 0 && comparisonChartData.length > 0 && (
          <div className="mt-6 space-y-8">
            {/* CPU Comparison Chart */}
            <div
              className={`rounded-xl border backdrop-blur-sm shadow-xl p-6 ${
                darkMode ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Cpu className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Container CPU Usage Comparison
                </h3>
              </div>
              <div ref={cpuChartRef}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={comparisonChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={darkMode ? '#374151' : '#e5e7eb'}
                    />
                    <XAxis
                      dataKey="time"
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip
                        darkMode={darkMode}
                        metricType="cpu"
                        chartId="cpu-comparison"
                        pinnedTooltip={pinnedTooltip}
                        onPin={(chartId, data, position) => setPinnedTooltip(chartId ? {chartId, data, position} : null)}
                        chartRef={cpuChartRef}
                      />}
                      wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      position={{ y: 0 }}
                    />
                  {containersData.containers.map((container, index) => (
                    <Line
                      key={container.containerId}
                      type="monotone"
                      dataKey={`${container.containerName}_cpu`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={container.containerName}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* Memory Comparison Chart */}
            <div
              className={`rounded-xl border backdrop-blur-sm shadow-xl p-6 ${
                darkMode ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <HardDrive className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Container Memory Usage Comparison
                </h3>
              </div>
              <div ref={memoryChartRef}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={comparisonChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={darkMode ? '#374151' : '#e5e7eb'}
                    />
                    <XAxis
                      dataKey="time"
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip
                        darkMode={darkMode}
                        metricType="memory"
                        chartId="memory-comparison"
                        pinnedTooltip={pinnedTooltip}
                        onPin={(chartId, data, position) => setPinnedTooltip(chartId ? {chartId, data, position} : null)}
                        chartRef={memoryChartRef}
                      />}
                      wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      position={{ y: 0 }}
                    />
                  {containersData.containers.map((container, index) => (
                    <Line
                      key={container.containerId}
                      type="monotone"
                      dataKey={`${container.containerName}_memory`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={container.containerName}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Server list item component
interface ServerListItemProps {
  server: ServerMetricsSummary;
  isSelected: boolean;
  onClick: () => void;
  darkMode: boolean;
}

const ServerListItem: React.FC<ServerListItemProps> = ({
  server,
  isSelected,
  onClick,
  darkMode,
}) => {
  const statusColor =
    server.status === 'Online'
      ? 'bg-green-500'
      : server.status === 'Offline'
      ? 'bg-red-500'
      : 'bg-yellow-500';

  const cpuPercentage = Math.min(server.totalCpuPercentage, 100);
  const cpuColor = cpuPercentage > 80 ? 'bg-red-500' : cpuPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl mb-2 transition-all duration-200 ${
        isSelected
          ? darkMode
            ? 'bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
            : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-400 shadow-lg'
          : darkMode
          ? 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600'
          : 'bg-white/50 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Server className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${statusColor} ring-2 ${darkMode ? 'ring-gray-800' : 'ring-white'}`}></span>
          </div>
          <div>
            <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {server.serverName}
            </span>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {server.containerCount} containers
            </div>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 ${isSelected ? (darkMode ? 'text-cyan-400' : 'text-cyan-600') : (darkMode ? 'text-gray-500' : 'text-gray-400')}`} />
      </div>

      {/* CPU Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>CPU</span>
          <span className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{server.totalCpuPercentage.toFixed(1)}%</span>
        </div>
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full ${cpuColor} transition-all duration-300 rounded-full`}
            style={{ width: `${cpuPercentage}%` }}
          ></div>
        </div>
      </div>

      {server.lastMetricsUpdate && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <Clock className="w-3 h-3" />
          {new Date(server.lastMetricsUpdate).toLocaleTimeString()}
        </div>
      )}
    </button>
  );
};

// Container list item component
interface ContainerListItemProps {
  container: ContainerMetricsSummary;
  isSelected: boolean;
  onClick: () => void;
  darkMode: boolean;
}

const ContainerListItem: React.FC<ContainerListItemProps> = ({
  container,
  isSelected,
  onClick,
  darkMode,
}) => {
  const cpuPercentage = Math.min(container.currentCpuPercentage, 100);
  const memPercentage = Math.min(container.currentMemoryPercentage, 100);

  const cpuColor = cpuPercentage > 80 ? 'bg-red-500' : cpuPercentage > 60 ? 'bg-yellow-500' : 'bg-cyan-500';
  const memColor = memPercentage > 80 ? 'bg-red-500' : memPercentage > 60 ? 'bg-yellow-500' : 'bg-purple-500';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl mb-2 transition-all duration-200 ${
        isSelected
          ? darkMode
            ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
            : 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-400 shadow-lg'
          : darkMode
          ? 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600'
          : 'bg-white/50 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Cpu className={`w-4 h-4 flex-shrink-0 ${isSelected ? (darkMode ? 'text-purple-400' : 'text-purple-600') : (darkMode ? 'text-gray-400' : 'text-gray-600')}`} />
          <span className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {container.containerName}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? (darkMode ? 'text-purple-400' : 'text-purple-600') : (darkMode ? 'text-gray-500' : 'text-gray-400')}`} />
      </div>

      {/* CPU Progress Bar */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>CPU</span>
          <span className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{container.currentCpuPercentage.toFixed(1)}%</span>
        </div>
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full ${cpuColor} transition-all duration-300 rounded-full`}
            style={{ width: `${cpuPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Memory Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memory</span>
          <span className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{container.currentMemoryPercentage.toFixed(1)}%</span>
        </div>
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full ${memColor} transition-all duration-300 rounded-full`}
            style={{ width: `${memPercentage}%` }}
          ></div>
        </div>
      </div>
    </button>
  );
};

// Stat card component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  darkMode: boolean;
  color: 'cyan' | 'purple' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
  darkMode,
  color,
}) => {
  const colorConfig = {
    cyan: {
      gradient: darkMode
        ? 'from-cyan-900/30 to-blue-900/30 border-cyan-700/30'
        : 'from-cyan-50 to-blue-50 border-cyan-200',
      iconBg: darkMode ? 'bg-cyan-900/50' : 'bg-cyan-100',
      iconColor: darkMode ? 'text-cyan-400' : 'text-cyan-600',
      glow: darkMode ? 'shadow-cyan-500/10' : 'shadow-cyan-200/50',
    },
    purple: {
      gradient: darkMode
        ? 'from-purple-900/30 to-pink-900/30 border-purple-700/30'
        : 'from-purple-50 to-pink-50 border-purple-200',
      iconBg: darkMode ? 'bg-purple-900/50' : 'bg-purple-100',
      iconColor: darkMode ? 'text-purple-400' : 'text-purple-600',
      glow: darkMode ? 'shadow-purple-500/10' : 'shadow-purple-200/50',
    },
    green: {
      gradient: darkMode
        ? 'from-green-900/30 to-emerald-900/30 border-green-700/30'
        : 'from-green-50 to-emerald-50 border-green-200',
      iconBg: darkMode ? 'bg-green-900/50' : 'bg-green-100',
      iconColor: darkMode ? 'text-green-400' : 'text-green-600',
      glow: darkMode ? 'shadow-green-500/10' : 'shadow-green-200/50',
    },
  };

  const config = colorConfig[color];

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br ${config.gradient} border ${config.glow} shadow-lg transition-all duration-200 hover:scale-105`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-lg ${config.iconBg}`}>
          <span className={config.iconColor}>{icon}</span>
        </div>
        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {subValue}
      </div>
    </div>
  );
};

export default MonitoringDashboard;
