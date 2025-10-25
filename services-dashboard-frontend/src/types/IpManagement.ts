// IP Management Types matching backend models

export interface Subnet {
  id: number;
  network: string; // e.g., "192.168.4.0/24"
  gateway: string;
  dhcpStart?: string;
  dhcpEnd?: string;
  dnsServers?: string;
  vlanId?: number;
  description?: string;
  location?: string;
  isMonitored: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkDevice {
  id: number;
  ipAddress: string;
  macAddress?: string;
  hostname?: string;
  vendor?: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  firstSeen: string;
  lastSeen: string;
  isDhcpAssigned: boolean;
  isStaticIp: boolean;
  notes?: string;
  tags?: string;
  subnetId?: number;
  managedServerId?: number;
  openPorts?: string; // JSON array
  operatingSystem?: string;
  lastResponseTime?: number;
  source: DiscoverySource;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceHistory {
  id: number;
  networkDeviceId: number;
  eventType: DeviceHistoryEventType;
  eventTime: string;
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;
  details?: string;
}

export interface IpReservation {
  id: number;
  ipAddress: string;
  macAddress?: string;
  description: string;
  purpose?: string;
  assignedTo?: string;
  isActive: boolean;
  expiresAt?: string;
  subnetId?: number;
  networkDeviceId?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface OmadaController {
  id: number;
  name: string;
  apiUrl: string;
  username: string;
  siteId?: string;
  isEnabled: boolean;
  syncClients: boolean;
  syncDhcp: boolean;
  syncIntervalMinutes: number;
  lastSyncTime?: string;
  lastSyncSuccess: boolean;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubnetSummary {
  subnetId: number;
  network: string;
  totalIps: number;
  usedIps: number;
  availableIps: number;
  onlineDevices: number;
  offlineDevices: number;
  reservedIps: number;
  dhcpRangeSize: number;
  usagePercentage: number;
}

export interface OmadaClient {
  mac: string;
  ip: string;
  name: string;
  active: boolean;
  wireless: boolean;
  deviceType: string;
}

export interface OmadaSyncResult {
  controllerId: number;
  success: boolean;
  errorMessage?: string;
  devicesSynced: number;
  errors: number;
  syncTime: string;
}

// Type definitions using union types instead of enums
export type DeviceType =
  | 'Unknown'
  | 'Computer'
  | 'Server'
  | 'Phone'
  | 'Tablet'
  | 'IoT'
  | 'NetworkDevice'
  | 'Printer'
  | 'Camera'
  | 'Storage'
  | 'Gaming'
  | 'SmartHome'
  | 'VirtualMachine'
  | 'Other';

export type DeviceStatus =
  | 'Online'
  | 'Offline'
  | 'Unknown';

export type DiscoverySource =
  | 'NetworkScan'
  | 'OmadaController'
  | 'ManualEntry'
  | 'SNMP'
  | 'ArpTable'
  | 'Docker';

export type DeviceHistoryEventType =
  | 'FirstSeen'
  | 'StatusChange'
  | 'IpChange'
  | 'MacChange'
  | 'HostnameChange'
  | 'Connected'
  | 'Disconnected'
  | 'Updated';

// Request/Response types
export interface CheckIpAvailabilityRequest {
  ipAddress: string;
  subnetId?: number;
}

export interface CheckIpAvailabilityResponse {
  isAvailable: boolean;
  ipAddress: string;
}

export interface GetNextAvailableIpResponse {
  ipAddress?: string;
}

export interface TestOmadaConnectionResponse {
  success: boolean;
  message: string;
}

// UI Helper types
export interface IpGridCell {
  ip: string;
  status: 'available' | 'used' | 'reserved' | 'dhcp' | 'gateway';
  device?: NetworkDevice;
  reservation?: IpReservation;
}

export interface DeviceTypeOption {
  value: DeviceType;
  label: string;
  icon: string;
}

export const DEVICE_TYPE_OPTIONS = [
  { value: 'Unknown' as const, label: 'Unknown', icon: '❓' },
  { value: 'Computer' as const, label: 'Computer', icon: '💻' },
  { value: 'Server' as const, label: 'Server', icon: '🖥️' },
  { value: 'VirtualMachine' as const, label: 'Virtual Machine', icon: '🖥️' },
  { value: 'Phone' as const, label: 'Phone', icon: '📱' },
  { value: 'Tablet' as const, label: 'Tablet', icon: '📱' },
  { value: 'IoT' as const, label: 'IoT Device', icon: '🔌' },
  { value: 'NetworkDevice' as const, label: 'Network Device', icon: '🌐' },
  { value: 'Printer' as const, label: 'Printer', icon: '🖨️' },
  { value: 'Camera' as const, label: 'Camera', icon: '📷' },
  { value: 'Storage' as const, label: 'Storage', icon: '💾' },
  { value: 'Gaming' as const, label: 'Gaming', icon: '🎮' },
  { value: 'SmartHome' as const, label: 'Smart Home', icon: '🏠' },
  { value: 'Other' as const, label: 'Other', icon: '📦' }
] as const;

export function getDeviceTypeIcon(type: DeviceType): string {
  return DEVICE_TYPE_OPTIONS.find(opt => opt.value === type)?.icon || '❓';
}

export function getDeviceStatusColor(status: DeviceStatus): string {
  switch (status) {
    case 'Online':
      return 'text-green-500';
    case 'Offline':
      return 'text-gray-400';
    default:
      return 'text-yellow-500';
  }
}
