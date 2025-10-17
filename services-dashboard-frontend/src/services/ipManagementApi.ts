import { BaseApiClient } from './BaseApiClient';
import type {
  Subnet,
  SubnetSummary,
  NetworkDevice,
  DeviceHistory,
  IpReservation,
  OmadaController,
  OmadaClient,
  OmadaSyncResult,
  CheckIpAvailabilityRequest,
  CheckIpAvailabilityResponse,
  GetNextAvailableIpResponse,
  TestOmadaConnectionResponse
} from '../types/IpManagement';
import {
  mockSubnets,
  mockNetworkDevices,
  mockIpReservations,
  mockOmadaControllers,
} from '../mocks/mockIpManagement';

const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true';

class IpManagementApi extends BaseApiClient {
  constructor() {
    super({ serviceName: 'IP Management API' });
  }

  // ============= Subnet Management =============

  async getAllSubnets(): Promise<Subnet[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('[Demo Mode] Fetched all subnets');
      return [...mockSubnets];
    }
    return this.request<Subnet[]>('get', '/ip-management/subnets');
  }

  async getSubnet(id: number): Promise<Subnet> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const subnet = mockSubnets.find(s => s.id === id);
      if (!subnet) throw new Error(`Subnet ${id} not found`);
      console.log(`[Demo Mode] Fetched subnet ${id}`);
      return { ...subnet };
    }
    return this.request<Subnet>('get', `/ip-management/subnets/${id}`);
  }

  async createSubnet(subnet: Omit<Subnet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subnet> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newSubnet: Subnet = {
        ...subnet,
        id: Math.max(...mockSubnets.map(s => s.id)) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('[Demo Mode] Created subnet:', newSubnet.network);
      return newSubnet;
    }
    return this.request<Subnet>('post', '/ip-management/subnets', subnet);
  }

  async updateSubnet(id: number, subnet: Partial<Subnet>): Promise<Subnet> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 450));
      const existing = mockSubnets.find(s => s.id === id);
      if (!existing) throw new Error(`Subnet ${id} not found`);
      const updated = {
        ...existing,
        ...subnet,
        id,
        updatedAt: new Date().toISOString(),
      };
      console.log(`[Demo Mode] Updated subnet ${id}`);
      return updated;
    }
    return this.request<Subnet>('put', `/ip-management/subnets/${id}`, subnet);
  }

  async deleteSubnet(id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log(`[Demo Mode] Deleted subnet ${id}`);
      return;
    }
    return this.request<void>('delete', `/ip-management/subnets/${id}`);
  }

  async getSubnetSummary(id: number): Promise<SubnetSummary> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const subnet = mockSubnets.find(s => s.id === id);
      if (!subnet) throw new Error(`Subnet ${id} not found`);

      const devices = mockNetworkDevices.filter(d => d.subnetId === id);
      const reservations = mockIpReservations.filter(r => r.subnetId === id);

      // Calculate CIDR range
      const [, cidrBits] = subnet.network.split('/');
      const totalIps = Math.pow(2, 32 - parseInt(cidrBits));
      const usableIps = totalIps - 2; // Exclude network and broadcast

      const takenIps = devices.length;
      const availableIps = usableIps - takenIps;
      const reservedIps = reservations.length;
      const onlineDevices = devices.filter(d => d.status === 'Online').length;
      const offlineDevices = devices.filter(d => d.status === 'Offline').length;

      // Calculate DHCP range size
      let dhcpRangeSize = 0;
      if (subnet.dhcpStart && subnet.dhcpEnd) {
        const dhcpStart = parseInt(subnet.dhcpStart.split('.')[3]);
        const dhcpEnd = parseInt(subnet.dhcpEnd.split('.')[3]);
        dhcpRangeSize = dhcpEnd - dhcpStart + 1;
      }

      const usagePercentage = usableIps > 0 ? (takenIps / usableIps) * 100 : 0;

      console.log(`[Demo Mode] Fetched subnet summary for ${id}`);
      return {
        subnetId: id,
        network: subnet.network,
        totalIps: usableIps,
        usedIps: takenIps,
        availableIps,
        reservedIps,
        onlineDevices,
        offlineDevices,
        dhcpRangeSize,
        usagePercentage,
      };
    }
    return this.request<SubnetSummary>('get', `/ip-management/subnets/${id}/summary`);
  }

  async getAvailableIps(id: number, avoidDhcpRange: boolean = true): Promise<string[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const subnet = mockSubnets.find(s => s.id === id);
      if (!subnet) throw new Error(`Subnet ${id} not found`);

      const devices = mockNetworkDevices.filter(d => d.subnetId === id);
      const takenIps = new Set(devices.map(d => d.ipAddress));

      // Generate all IPs in subnet
      const [baseIp, cidrBits] = subnet.network.split('/');
      const parts = baseIp.split('.').map(Number);
      const totalIps = Math.pow(2, 32 - parseInt(cidrBits));

      const availableIps: string[] = [];
      for (let i = 1; i < totalIps - 1; i++) {
        const ip = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3] + i}`;

        // Skip DHCP range if requested
        if (avoidDhcpRange && subnet.dhcpStart && subnet.dhcpEnd) {
          const dhcpStart = parseInt(subnet.dhcpStart.split('.')[3]);
          const dhcpEnd = parseInt(subnet.dhcpEnd.split('.')[3]);
          const currentLast = parts[3] + i;
          if (currentLast >= dhcpStart && currentLast <= dhcpEnd) continue;
        }

        if (!takenIps.has(ip) && ip !== subnet.gateway) {
          availableIps.push(ip);
        }
      }

      console.log(`[Demo Mode] Fetched ${availableIps.length} available IPs for subnet ${id}`);
      return availableIps;
    }
    return this.request<string[]>(
      'get',
      `/ip-management/subnets/${id}/available-ips`,
      undefined,
      { avoidDhcpRange }
    );
  }

  async getNextAvailableIp(id: number, avoidDhcpRange: boolean = true): Promise<string | null> {
    if (isDemoMode()) {
      const availableIps = await this.getAvailableIps(id, avoidDhcpRange);
      return availableIps.length > 0 ? availableIps[0] : null;
    }
    const response = await this.request<GetNextAvailableIpResponse>(
      'get',
      `/ip-management/subnets/${id}/next-available-ip`,
      undefined,
      { avoidDhcpRange }
    );
    return response.ipAddress || null;
  }

  // ============= Device Management =============

  async getAllDevices(subnetId?: number): Promise<NetworkDevice[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      let devices = [...mockNetworkDevices];
      if (subnetId) {
        devices = devices.filter(d => d.subnetId === subnetId);
      }
      console.log(`[Demo Mode] Fetched ${devices.length} devices` + (subnetId ? ` for subnet ${subnetId}` : ''));
      return devices;
    }
    return this.request<NetworkDevice[]>(
      'get',
      '/ip-management/devices',
      undefined,
      subnetId ? { subnetId } : undefined
    );
  }

  async getDevice(id: number): Promise<NetworkDevice> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const device = mockNetworkDevices.find(d => d.id === id);
      if (!device) throw new Error(`Device ${id} not found`);
      console.log(`[Demo Mode] Fetched device ${id}`);
      return { ...device };
    }
    return this.request<NetworkDevice>('get', `/ip-management/devices/${id}`);
  }

  async getDeviceByIp(ipAddress: string): Promise<NetworkDevice> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 350));
      const device = mockNetworkDevices.find(d => d.ipAddress === ipAddress);
      if (!device) throw new Error(`Device with IP ${ipAddress} not found`);
      console.log(`[Demo Mode] Fetched device by IP: ${ipAddress}`);
      return { ...device };
    }
    return this.request<NetworkDevice>('get', `/ip-management/devices/by-ip/${ipAddress}`);
  }

  async createDevice(device: Omit<NetworkDevice, 'id' | 'createdAt' | 'updatedAt' | 'firstSeen' | 'lastSeen'>): Promise<NetworkDevice> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 550));
      const newDevice: NetworkDevice = {
        ...device,
        id: Math.max(...mockNetworkDevices.map(d => d.id)) + 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('[Demo Mode] Created device:', newDevice.hostname || newDevice.ipAddress);
      return newDevice;
    }
    return this.request<NetworkDevice>('post', '/ip-management/devices', device);
  }

  async updateDevice(id: number, device: Partial<NetworkDevice>): Promise<NetworkDevice> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 450));
      const existing = mockNetworkDevices.find(d => d.id === id);
      if (!existing) throw new Error(`Device ${id} not found`);
      const updated = {
        ...existing,
        ...device,
        id,
        updatedAt: new Date().toISOString(),
      };
      console.log(`[Demo Mode] Updated device ${id}`);
      return updated;
    }
    return this.request<NetworkDevice>('put', `/ip-management/devices/${id}`, device);
  }

  async deleteDevice(id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log(`[Demo Mode] Deleted device ${id}`);
      return;
    }
    return this.request<void>('delete', `/ip-management/devices/${id}`);
  }

  async getDeviceHistory(id: number, limit: number = 50): Promise<DeviceHistory[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log(`[Demo Mode] Fetched device history for ${id} (limited to ${limit})`);
      // Return empty history for demo mode
      return [];
    }
    return this.request<DeviceHistory[]>(
      'get',
      `/ip-management/devices/${id}/history`,
      undefined,
      { limit }
    );
  }

  async getDeviceConflicts(subnetId?: number): Promise<NetworkDevice[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`[Demo Mode] Fetched device conflicts` + (subnetId ? ` for subnet ${subnetId}` : ''));
      // Return empty conflicts for demo mode
      return [];
    }
    return this.request<NetworkDevice[]>(
      'get',
      '/ip-management/devices/conflicts',
      undefined,
      subnetId ? { subnetId } : undefined
    );
  }

  async checkIpAvailability(request: CheckIpAvailabilityRequest): Promise<CheckIpAvailabilityResponse> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const device = mockNetworkDevices.find(d =>
        d.ipAddress === request.ipAddress && d.subnetId === request.subnetId
      );
      const isAvailable = !device;
      console.log(`[Demo Mode] Checked IP ${request.ipAddress}: ${isAvailable ? 'available' : 'taken'}`);
      return {
        isAvailable,
        ipAddress: request.ipAddress,
      };
    }
    return this.request<CheckIpAvailabilityResponse>(
      'post',
      '/ip-management/devices/check-availability',
      request
    );
  }

  // ============= IP Reservation Management =============

  async getAllReservations(subnetId?: number): Promise<IpReservation[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 450));
      let reservations = [...mockIpReservations];
      if (subnetId) {
        reservations = reservations.filter(r => r.subnetId === subnetId);
      }
      console.log(`[Demo Mode] Fetched ${reservations.length} reservations` + (subnetId ? ` for subnet ${subnetId}` : ''));
      return reservations;
    }
    return this.request<IpReservation[]>(
      'get',
      '/ip-management/reservations',
      undefined,
      subnetId ? { subnetId } : undefined
    );
  }

  async getReservation(id: number): Promise<IpReservation> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const reservation = mockIpReservations.find(r => r.id === id);
      if (!reservation) throw new Error(`Reservation ${id} not found`);
      console.log(`[Demo Mode] Fetched reservation ${id}`);
      return { ...reservation };
    }
    return this.request<IpReservation>('get', `/ip-management/reservations/${id}`);
  }

  async createReservation(reservation: Omit<IpReservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<IpReservation> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 550));
      const newReservation: IpReservation = {
        ...reservation,
        id: Math.max(...mockIpReservations.map(r => r.id)) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('[Demo Mode] Created reservation:', newReservation.description || newReservation.ipAddress);
      return newReservation;
    }
    return this.request<IpReservation>('post', '/ip-management/reservations', reservation);
  }

  async updateReservation(id: number, reservation: Partial<IpReservation>): Promise<IpReservation> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 450));
      const existing = mockIpReservations.find(r => r.id === id);
      if (!existing) throw new Error(`Reservation ${id} not found`);
      const updated = {
        ...existing,
        ...reservation,
        id,
        updatedAt: new Date().toISOString(),
      };
      console.log(`[Demo Mode] Updated reservation ${id}`);
      return updated;
    }
    return this.request<IpReservation>('put', `/ip-management/reservations/${id}`, reservation);
  }

  async deleteReservation(id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log(`[Demo Mode] Deleted reservation ${id}`);
      return;
    }
    return this.request<void>('delete', `/ip-management/reservations/${id}`);
  }

  // ============= Omada Controller Management =============

  async getAllOmadaControllers(): Promise<OmadaController[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('[Demo Mode] Fetched all Omada controllers');
      return [...mockOmadaControllers];
    }
    return this.request<OmadaController[]>('get', '/ip-management/omada-controllers');
  }

  async getOmadaController(id: number): Promise<OmadaController> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const controller = mockOmadaControllers.find(c => c.id === id);
      if (!controller) throw new Error(`Omada controller ${id} not found`);
      console.log(`[Demo Mode] Fetched Omada controller ${id}`);
      return { ...controller };
    }
    return this.request<OmadaController>('get', `/ip-management/omada-controllers/${id}`);
  }

  async createOmadaController(controller: Omit<OmadaController, 'id' | 'createdAt' | 'updatedAt'>): Promise<OmadaController> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const newController: OmadaController = {
        ...controller,
        id: Math.max(...mockOmadaControllers.map(c => c.id)) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('[Demo Mode] Created Omada controller:', newController.name);
      return newController;
    }
    return this.request<OmadaController>('post', '/ip-management/omada-controllers', controller);
  }

  async updateOmadaController(id: number, controller: Partial<OmadaController>): Promise<OmadaController> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const existing = mockOmadaControllers.find(c => c.id === id);
      if (!existing) throw new Error(`Omada controller ${id} not found`);
      const updated = {
        ...existing,
        ...controller,
        id,
        updatedAt: new Date().toISOString(),
      };
      console.log(`[Demo Mode] Updated Omada controller ${id}`);
      return updated;
    }
    return this.request<OmadaController>('put', `/ip-management/omada-controllers/${id}`, controller);
  }

  async deleteOmadaController(id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log(`[Demo Mode] Deleted Omada controller ${id}`);
      return;
    }
    return this.request<void>('delete', `/ip-management/omada-controllers/${id}`);
  }

  async testOmadaConnection(id: number): Promise<TestOmadaConnectionResponse> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Longer delay to simulate network test
      const controller = mockOmadaControllers.find(c => c.id === id);
      if (!controller) throw new Error(`Omada controller ${id} not found`);

      const isSuccess = controller.lastSyncSuccess;
      console.log(`[Demo Mode] Tested Omada controller ${id} connection: ${isSuccess ? 'success' : 'failed'}`);

      return {
        success: isSuccess,
        message: isSuccess
          ? 'Connection successful'
          : controller.lastSyncError || 'Connection failed',
      };
    }
    return this.request<TestOmadaConnectionResponse>(
      'post',
      `/ip-management/omada-controllers/${id}/test-connection`
    );
  }

  async syncOmadaClients(id: number): Promise<OmadaSyncResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay to simulate sync
      const controller = mockOmadaControllers.find(c => c.id === id);
      if (!controller) throw new Error(`Omada controller ${id} not found`);

      const isSuccess = controller.lastSyncSuccess;
      const devicesSynced = isSuccess ? Math.floor(Math.random() * 15) + 5 : 0;
      const errors = isSuccess ? 0 : 1;

      console.log(`[Demo Mode] Synced Omada controller ${id}: ${devicesSynced} synced`);

      return {
        controllerId: id,
        success: isSuccess,
        errorMessage: isSuccess ? undefined : controller.lastSyncError || 'Sync failed',
        devicesSynced,
        errors,
        syncTime: new Date().toISOString(),
      };
    }
    return this.request<OmadaSyncResult>(
      'post',
      `/ip-management/omada-controllers/${id}/sync`
    );
  }

  async getOmadaClients(id: number): Promise<OmadaClient[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`[Demo Mode] Fetched Omada clients for controller ${id}`);
      // Return a few demo Omada clients
      return [
        {
          mac: '00:1B:44:11:3A:B7',
          name: 'Admin Laptop',
          ip: '192.168.1.50',
          active: true,
          wireless: true,
          deviceType: 'Computer',
        },
        {
          mac: '5C:F9:DD:5A:72:11',
          name: 'iPhone',
          ip: '192.168.1.110',
          active: true,
          wireless: true,
          deviceType: 'Phone',
        },
        {
          mac: '00:1B:44:11:3A:C2',
          name: 'Database Server',
          ip: '192.168.1.15',
          active: true,
          wireless: false,
          deviceType: 'Server',
        },
      ];
    }
    return this.request<OmadaClient[]>(
      'get',
      `/ip-management/omada-controllers/${id}/clients`
    );
  }
}

export const ipManagementApi = new IpManagementApi();
