export type VMOperationStatus =
  | 'Pending'
  | 'DownloadingImage'
  | 'PreparingCloudInit'
  | 'CreatingDisk'
  | 'DefiningVM'
  | 'StartingVM'
  | 'WaitingForBoot'
  | 'ConfiguringNetwork'
  | 'Ready'
  | 'Failed'
  | 'Cancelled';

export type VMOperationType = 'Create' | 'Start' | 'Stop' | 'Delete' | 'Restart';

export type VMPreset = 'Small' | 'Medium' | 'Large' | 'Custom';

export type VmOsType = 'Ubuntu2404' | 'Ubuntu2204' | 'Debian12' | 'KaliLinux';

export interface VMOperation {
  id: number;
  operationId: string;
  hostServerId: number;
  createdServerId?: number;
  vmName: string;
  operationType: VMOperationType;
  status: VMOperationStatus;
  preset: VMPreset;
  osType: VmOsType;
  username?: string;
  ramMb: number;
  vCpus: number;
  diskSizeGb: number;
  ipAddress?: string;
  sshConnectionString?: string;
  progressPercent: number;
  currentStage?: string;
  errorMessage?: string;
  operationLog?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  hostServer?: {
    id: number;
    name: string;
    hostAddress: string;
  };
  createdServer?: {
    id: number;
    name: string;
    hostAddress: string;
  };
}

export interface CreateVMRequest {
  hostServerId: number;
  vmName: string;
  osType: VmOsType;
  preset: VMPreset;
  username: string;
  password: string;
  diskSizeGb?: number;
}

export interface CloudImage {
  id: number;
  osType: VmOsType;
  displayName: string;
  downloadUrl: string;
  fileName: string;
  checksum?: string;
  checksumType?: string;
  fileSizeBytes?: number;
  version?: string;
  isDownloaded: boolean;
  lastDownloadedAt?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnraidServerInfo {
  id: number;
  name: string;
  hostAddress: string;
  status: string;
}

export interface VMPresetInfo {
  preset: VMPreset;
  label: string;
  ramMb: number;
  vCpus: number;
  description: string;
}

export const VM_PRESETS: Record<VMPreset, { ram: number; vcpus: number; label: string; description: string }> = {
  Small: { ram: 4096, vcpus: 2, label: 'Small', description: '4GB RAM, 2 vCPUs' },
  Medium: { ram: 8192, vcpus: 4, label: 'Medium', description: '8GB RAM, 4 vCPUs' },
  Large: { ram: 16384, vcpus: 8, label: 'Large', description: '16GB RAM, 8 vCPUs' },
  Custom: { ram: 0, vcpus: 0, label: 'Custom', description: 'Custom Configuration' }
};

export const OS_IMAGES: Record<VmOsType, { label: string; description: string }> = {
  Ubuntu2404: { label: 'Ubuntu 24.04 LTS', description: 'Noble Numbat - Latest LTS' },
  Ubuntu2204: { label: 'Ubuntu 22.04 LTS', description: 'Jammy Jellyfish - Stable LTS' },
  Debian12: { label: 'Debian 12', description: 'Bookworm - Stable' },
  KaliLinux: { label: 'Kali Linux', description: 'Security Testing Distribution' }
};

export const VM_STATUS_INFO: Record<VMOperationStatus, { label: string; color: string; isActive: boolean }> = {
  Pending: { label: 'Pending', color: 'gray', isActive: true },
  DownloadingImage: { label: 'Downloading Image', color: 'blue', isActive: true },
  PreparingCloudInit: { label: 'Preparing Cloud-Init', color: 'blue', isActive: true },
  CreatingDisk: { label: 'Creating Disk', color: 'blue', isActive: true },
  DefiningVM: { label: 'Defining VM', color: 'blue', isActive: true },
  StartingVM: { label: 'Starting VM', color: 'blue', isActive: true },
  WaitingForBoot: { label: 'Waiting for Boot', color: 'yellow', isActive: true },
  ConfiguringNetwork: { label: 'Configuring Network', color: 'yellow', isActive: true },
  Ready: { label: 'Ready', color: 'green', isActive: false },
  Failed: { label: 'Failed', color: 'red', isActive: false },
  Cancelled: { label: 'Cancelled', color: 'gray', isActive: false }
};
