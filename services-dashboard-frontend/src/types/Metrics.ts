export interface ContainerMetricDataPoint {
  timestamp: string;
  cpuPercentage: number;
  memoryUsageBytes: number;
  memoryPercentage: number;
  memoryLimitBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
}

export interface ContainerMetricsHistoryResponse {
  containerId: string;
  containerName: string;
  serverId: number;
  dataPoints: ContainerMetricDataPoint[];
}

export interface ContainerMetricsSummary {
  containerId: string;
  containerName: string;

  // Current values (most recent)
  currentCpuPercentage: number;
  currentMemoryUsageBytes: number;
  currentMemoryPercentage: number;
  memoryLimitBytes: number;
  currentNetworkRxBytes: number;
  currentNetworkTxBytes: number;

  // Averages over the period
  avgCpuPercentage: number;
  avgMemoryPercentage: number;

  // Peak values
  maxCpuPercentage: number;
  maxMemoryPercentage: number;

  // Historical data for charts
  history: ContainerMetricDataPoint[];
}

export interface ServerContainersMetricsResponse {
  serverId: number;
  serverName: string;
  lastUpdated: string;
  containers: ContainerMetricsSummary[];
}

export interface ServerMetricsSummary {
  serverId: number;
  serverName: string;
  hostAddress: string;
  status: string;
  containerCount: number;

  // Aggregated current values
  totalCpuPercentage: number;
  totalMemoryUsageBytes: number;
  totalMemoryLimitBytes: number;
  totalNetworkRxBytes: number;
  totalNetworkTxBytes: number;

  // Last update time
  lastMetricsUpdate: string | null;
}

export interface AllServersMetricsResponse {
  servers: ServerMetricsSummary[];
  timestamp: string;
}

// Chart-specific types for formatting
export interface ChartDataPoint {
  time: string;
  timestamp: number;
  cpu: number;
  memory: number;
  memoryUsed: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
}

export type TimeRange = '15m' | '30m' | '1h' | '3h' | '6h' | '12h' | '24h';
