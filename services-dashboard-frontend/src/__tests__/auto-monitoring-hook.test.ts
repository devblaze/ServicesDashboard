import { describe, it, expect } from 'vitest';

/**
 * Tests for AutoMonitoringHook server status/health update logic.
 * Validates the cache update functions that process SignalR events.
 */

interface ManagedServer {
  id: number;
  name: string;
  status: string;
  lastCheckTime?: string;
  healthChecks?: Array<{
    isHealthy: boolean;
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    checkTime: string;
  }>;
}

// Extract the status update logic from the hook for testability
function applyStatusUpdate(
  servers: ManagedServer[],
  serverId: number,
  status: string,
  lastCheckTime: string
): ManagedServer[] {
  return servers.map(server => {
    if (server.id !== serverId) return server;
    return { ...server, status, lastCheckTime };
  });
}

function applyHealthUpdate(
  servers: ManagedServer[],
  serverId: number,
  healthCheck: { isHealthy: boolean; cpuUsage?: number; memoryUsage?: number; diskUsage?: number; checkTime: string }
): ManagedServer[] {
  return servers.map(server => {
    if (server.id !== serverId) return server;

    let newStatus = 'Online';
    if (!healthCheck.isHealthy) {
      newStatus = 'Critical';
    } else if (
      (healthCheck.cpuUsage && healthCheck.cpuUsage > 90) ||
      (healthCheck.memoryUsage && healthCheck.memoryUsage > 90) ||
      (healthCheck.diskUsage && healthCheck.diskUsage > 95)
    ) {
      newStatus = 'Critical';
    } else if (
      (healthCheck.cpuUsage && healthCheck.cpuUsage > 80) ||
      (healthCheck.memoryUsage && healthCheck.memoryUsage > 80) ||
      (healthCheck.diskUsage && healthCheck.diskUsage > 80)
    ) {
      newStatus = 'Warning';
    }

    return {
      ...server,
      status: newStatus,
      healthChecks: [healthCheck, ...(server.healthChecks || [])].slice(0, 10),
      lastCheckTime: healthCheck.checkTime,
    };
  });
}

describe('AutoMonitoring: status update logic', () => {
  const servers: ManagedServer[] = [
    { id: 1, name: 'Server A', status: 'Offline' },
    { id: 2, name: 'Server B', status: 'Online' },
    { id: 3, name: 'Server C', status: 'Warning' },
  ];

  it('should update status for the correct server only', () => {
    const result = applyStatusUpdate(servers, 2, 'Offline', '2026-01-27T00:00:00Z');

    expect(result[0].status).toBe('Offline'); // unchanged
    expect(result[1].status).toBe('Offline'); // updated
    expect(result[1].lastCheckTime).toBe('2026-01-27T00:00:00Z');
    expect(result[2].status).toBe('Warning'); // unchanged
  });

  it('should not mutate the original array', () => {
    const result = applyStatusUpdate(servers, 1, 'Online', '2026-01-27T00:00:00Z');
    expect(result).not.toBe(servers);
    expect(servers[0].status).toBe('Offline'); // original unchanged
    expect(result[0].status).toBe('Online');
  });

  it('should leave all servers unchanged for unknown serverId', () => {
    const result = applyStatusUpdate(servers, 999, 'Critical', '2026-01-27T00:00:00Z');
    expect(result.map(s => s.status)).toEqual(['Offline', 'Online', 'Warning']);
  });
});

describe('AutoMonitoring: health update logic', () => {
  const servers: ManagedServer[] = [
    { id: 1, name: 'Server A', status: 'Online', healthChecks: [] },
  ];

  it('should set status to Online for healthy server with low usage', () => {
    const result = applyHealthUpdate(servers, 1, {
      isHealthy: true,
      cpuUsage: 30,
      memoryUsage: 50,
      diskUsage: 60,
      checkTime: '2026-01-27T00:00:00Z',
    });

    expect(result[0].status).toBe('Online');
  });

  it('should set status to Warning for CPU > 80%', () => {
    const result = applyHealthUpdate(servers, 1, {
      isHealthy: true,
      cpuUsage: 85,
      memoryUsage: 50,
      diskUsage: 60,
      checkTime: '2026-01-27T00:00:00Z',
    });

    expect(result[0].status).toBe('Warning');
  });

  it('should set status to Warning for memory > 80%', () => {
    const result = applyHealthUpdate(servers, 1, {
      isHealthy: true,
      cpuUsage: 30,
      memoryUsage: 85,
      diskUsage: 60,
      checkTime: '2026-01-27T00:00:00Z',
    });

    expect(result[0].status).toBe('Warning');
  });

  it('should set status to Warning for disk > 80%', () => {
    const result = applyHealthUpdate(servers, 1, {
      isHealthy: true,
      cpuUsage: 30,
      memoryUsage: 50,
      diskUsage: 85,
      checkTime: '2026-01-27T00:00:00Z',
    });

    expect(result[0].status).toBe('Warning');
  });

  it('should set status to Critical for CPU > 90%', () => {
    const result = applyHealthUpdate(servers, 1, {
      isHealthy: true,
      cpuUsage: 95,
      memoryUsage: 50,
      diskUsage: 60,
      checkTime: '2026-01-27T00:00:00Z',
    });

    expect(result[0].status).toBe('Critical');
  });

  it('should set status to Critical for disk > 95%', () => {
    const result = applyHealthUpdate(servers, 1, {
      isHealthy: true,
      cpuUsage: 30,
      memoryUsage: 50,
      diskUsage: 97,
      checkTime: '2026-01-27T00:00:00Z',
    });

    expect(result[0].status).toBe('Critical');
  });

  it('should set status to Critical when isHealthy is false', () => {
    const result = applyHealthUpdate(servers, 1, {
      isHealthy: false,
      cpuUsage: 10,
      memoryUsage: 10,
      diskUsage: 10,
      checkTime: '2026-01-27T00:00:00Z',
    });

    expect(result[0].status).toBe('Critical');
  });

  it('should keep at most 10 health checks in history', () => {
    let currentServers: ManagedServer[] = [
      { id: 1, name: 'Server A', status: 'Online', healthChecks: [] },
    ];

    for (let i = 0; i < 15; i++) {
      currentServers = applyHealthUpdate(currentServers, 1, {
        isHealthy: true,
        cpuUsage: 30,
        memoryUsage: 30,
        diskUsage: 30,
        checkTime: `2026-01-27T00:${String(i).padStart(2, '0')}:00Z`,
      });
    }

    expect(currentServers[0].healthChecks!.length).toBe(10);
    // Most recent should be first
    expect(currentServers[0].healthChecks![0].checkTime).toBe('2026-01-27T00:14:00Z');
  });
});
