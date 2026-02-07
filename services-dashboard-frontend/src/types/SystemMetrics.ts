// System-level metrics data point
export interface SystemMetricsDataPoint {
  timestamp: string;
  networkRxBytesPerSec: number;
  networkTxBytesPerSec: number;
  networkRxBytes: number;
  networkTxBytes: number;
  cpuTemperature: number | null;
  gpuTemperature: number | null;
}

// Temperature data point for charts
export interface TemperatureDataPoint {
  timestamp: string;
  cpuTemperature: number | null;
  gpuTemperature: number | null;
}

// Network interface data point
export interface NetworkInterfaceDataPoint {
  timestamp: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

// Network interface summary
export interface NetworkInterfaceSummary {
  interfaceName: string;
  interfaceType: 'physical' | 'bridge' | 'docker' | 'wireless' | 'virtual';
  currentRxBytesPerSec: number;
  currentTxBytesPerSec: number;
  avgRxBytesPerSec: number;
  avgTxBytesPerSec: number;
  maxRxBytesPerSec: number;
  maxTxBytesPerSec: number;
  history: NetworkInterfaceDataPoint[];
}

// Network metrics summary
export interface NetworkMetricsSummary {
  currentRxBytesPerSec: number;
  currentTxBytesPerSec: number;
  avgRxBytesPerSec: number;
  avgTxBytesPerSec: number;
  maxRxBytesPerSec: number;
  maxTxBytesPerSec: number;
  totalRxBytes: number;
  totalTxBytes: number;
  history: SystemMetricsDataPoint[];
}

// Temperature metrics summary
export interface TemperatureMetricsSummary {
  currentCpuTemperature: number | null;
  currentGpuTemperature: number | null;
  avgCpuTemperature: number | null;
  maxCpuTemperature: number | null;
  avgGpuTemperature: number | null;
  maxGpuTemperature: number | null;
  history: TemperatureDataPoint[];
}

// Server system metrics response
export interface ServerSystemMetricsResponse {
  serverId: number;
  serverName: string;
  serverType: 'unraid' | 'linux';
  lastUpdated: string;
  network: NetworkMetricsSummary;
  temperatures: TemperatureMetricsSummary;
  interfaces: NetworkInterfaceSummary[];
}

// Disk history data point
export interface DiskHistoryDataPoint {
  timestamp: string;
  usedBytes: number;
  usagePercentage: number;
  temperature: number | null;
}

// Disk information
export interface DiskInfo {
  diskName: string;
  diskType: 'array' | 'cache' | 'parity' | 'system' | 'data';
  device: string | null;
  mountPoint: string | null;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercentage: number;
  temperature: number | null;
  status: string | null;
  history: DiskHistoryDataPoint[];
}

// Disk metrics summary
export interface DiskMetricsSummary {
  // Unraid array
  arrayTotalBytes: number;
  arrayUsedBytes: number;
  arrayFreeBytes: number;
  arrayUsagePercentage: number;

  // Unraid cache
  cacheTotalBytes: number | null;
  cacheUsedBytes: number | null;
  cacheFreeBytes: number | null;
  cacheUsagePercentage: number | null;

  // Unraid parity
  parityTotalBytes: number | null;

  // Generic Linux
  systemTotalBytes: number;
  systemUsedBytes: number;
  systemFreeBytes: number;
  systemUsagePercentage: number;
}

// Server disk metrics response
export interface ServerDiskMetricsResponse {
  serverId: number;
  serverName: string;
  serverType: 'unraid' | 'linux';
  lastUpdated: string;
  summary: DiskMetricsSummary;
  disks: DiskInfo[];
}

// Chart data types for the frontend
export interface NetworkChartDataPoint {
  time: string;
  timestamp: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

export interface TemperatureChartDataPoint {
  time: string;
  timestamp: number;
  cpu: number | null;
  gpu: number | null;
}

export interface DiskChartDataPoint {
  name: string;
  type: string;
  total: number;
  used: number;
  free: number;
  percentage: number;
  temperature: number | null;
}
