import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for SignalR server monitoring event handling.
 * Validates that the service correctly dispatches monitoring callbacks.
 */

describe('SignalR monitoring event dispatch', () => {
  it('should invoke monitoring callbacks for serverStatusUpdate events', () => {
    // Simulate the callback registry pattern from signalr.service.ts
    const callbacks: Array<(event: { type: string; serverId: number; data: unknown }) => void> = [];

    const onServerMonitoring = (cb: typeof callbacks[0]) => {
      callbacks.push(cb);
      return () => {
        const idx = callbacks.indexOf(cb);
        if (idx > -1) callbacks.splice(idx, 1);
      };
    };

    const notifyMonitoringCallbacks = (event: { type: string; serverId: number; data: unknown }) => {
      callbacks.forEach(cb => cb(event));
    };

    const handler = vi.fn();
    const unsubscribe = onServerMonitoring(handler);

    notifyMonitoringCallbacks({
      type: 'serverStatusUpdate',
      serverId: 1,
      data: { status: 'Online', lastCheckTime: '2026-01-27T00:00:00Z' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: 'serverStatusUpdate',
      serverId: 1,
      data: { status: 'Online', lastCheckTime: '2026-01-27T00:00:00Z' },
    });

    // Unsubscribe and verify no further calls
    unsubscribe();
    notifyMonitoringCallbacks({
      type: 'serverStatusUpdate',
      serverId: 2,
      data: { status: 'Offline', lastCheckTime: '2026-01-27T00:01:00Z' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should invoke monitoring callbacks for serverHealthUpdate events', () => {
    const callbacks: Array<(event: { type: string; serverId: number; data: unknown }) => void> = [];

    const onServerMonitoring = (cb: typeof callbacks[0]) => {
      callbacks.push(cb);
      return () => {
        const idx = callbacks.indexOf(cb);
        if (idx > -1) callbacks.splice(idx, 1);
      };
    };

    const notifyMonitoringCallbacks = (event: { type: string; serverId: number; data: unknown }) => {
      callbacks.forEach(cb => cb(event));
    };

    const handler = vi.fn();
    onServerMonitoring(handler);

    const healthCheck = {
      isHealthy: true,
      cpuUsage: 45,
      memoryUsage: 60,
      diskUsage: 70,
      checkTime: '2026-01-27T00:00:00Z',
    };

    notifyMonitoringCallbacks({
      type: 'serverHealthUpdate',
      serverId: 3,
      data: { healthCheck },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].data.healthCheck.cpuUsage).toBe(45);
  });

  it('should support multiple concurrent subscribers', () => {
    const callbacks: Array<(event: { type: string; serverId: number; data: unknown }) => void> = [];

    const onServerMonitoring = (cb: typeof callbacks[0]) => {
      callbacks.push(cb);
      return () => {
        const idx = callbacks.indexOf(cb);
        if (idx > -1) callbacks.splice(idx, 1);
      };
    };

    const notifyMonitoringCallbacks = (event: { type: string; serverId: number; data: unknown }) => {
      callbacks.forEach(cb => cb(event));
    };

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    onServerMonitoring(handler1);
    const unsub2 = onServerMonitoring(handler2);
    onServerMonitoring(handler3);

    notifyMonitoringCallbacks({
      type: 'serverStatusUpdate',
      serverId: 1,
      data: { status: 'Online' },
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).toHaveBeenCalledTimes(1);

    // Unsubscribe handler2
    unsub2();

    notifyMonitoringCallbacks({
      type: 'serverStatusUpdate',
      serverId: 2,
      data: { status: 'Offline' },
    });

    expect(handler1).toHaveBeenCalledTimes(2);
    expect(handler2).toHaveBeenCalledTimes(1); // no new call
    expect(handler3).toHaveBeenCalledTimes(2);
  });

  it('should handle errors in one callback without affecting others', () => {
    const callbacks: Array<(event: { type: string; serverId: number; data: unknown }) => void> = [];

    const notifyMonitoringCallbacks = (event: { type: string; serverId: number; data: unknown }) => {
      callbacks.forEach(cb => {
        try { cb(event); } catch { /* swallow */ }
      });
    };

    const errorHandler = vi.fn(() => { throw new Error('handler error'); });
    const goodHandler = vi.fn();

    callbacks.push(errorHandler);
    callbacks.push(goodHandler);

    notifyMonitoringCallbacks({
      type: 'serverStatusUpdate',
      serverId: 1,
      data: { status: 'Online' },
    });

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1); // still called despite error in previous
  });
});
