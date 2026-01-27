import {useEffect, useCallback} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {signalRService} from '../services/signalr.service';
import {serverManagementApi} from '../services/serverManagementApi';
import type {ServerMonitoringEvent} from '../services/signalr.service';
import type {ManagedServer} from '../types/ServerManagement';

interface AutoMonitoringConfig {
    enableServerConnectivityCheck: boolean;
    enableServerHealthCheck: boolean;
    enableServiceHealthCheck: boolean;
}

const DEFAULT_CONFIG: AutoMonitoringConfig = {
    enableServerConnectivityCheck: true,
    enableServerHealthCheck: true,
    enableServiceHealthCheck: true,
};

export const useAutoMonitoring = (config: Partial<AutoMonitoringConfig> = {}) => {
    const queryClient = useQueryClient();
    const finalConfig = {...DEFAULT_CONFIG, ...config};

    // Handle server monitoring events pushed from the backend via SignalR
    const handleMonitoringEvent = useCallback((event: ServerMonitoringEvent) => {
        if (!finalConfig.enableServerConnectivityCheck && event.type === 'serverStatusUpdate') return;
        if (!finalConfig.enableServerHealthCheck && event.type === 'serverHealthUpdate') return;

        if (event.type === 'serverStatusUpdate') {
            const {status, lastCheckTime} = event.data;

            queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
                if (!oldServers) return oldServers;

                return oldServers.map(server => {
                    if (server.id !== event.serverId) return server;
                    return {
                        ...server,
                        status,
                        lastCheckTime,
                    };
                });
            });
        }

        if (event.type === 'serverHealthUpdate') {
            const {healthCheck} = event.data;

            queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
                if (!oldServers) return oldServers;

                return oldServers.map(server => {
                    if (server.id !== event.serverId) return server;

                    // Determine status from health check
                    let newStatus: ManagedServer['status'] = 'Online';
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
            });
        }
    }, [queryClient, finalConfig.enableServerConnectivityCheck, finalConfig.enableServerHealthCheck]);

    // Subscribe to SignalR server monitoring events
    useEffect(() => {
        const unsubscribe = signalRService.onServerMonitoring(handleMonitoringEvent);
        return () => {
            unsubscribe();
        };
    }, [handleMonitoringEvent]);

    // Manual trigger functions (call existing API endpoints on demand)
    const triggerConnectivityCheck = async () => {
        const servers = queryClient.getQueryData<ManagedServer[]>(['managed-servers']);
        if (!servers || servers.length === 0) return;

        const results = await Promise.allSettled(
            servers.map(async (server) => {
                const isOnline = await serverManagementApi.testServerConnection(server);
                return {serverId: server.id, isOnline};
            })
        );

        queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
            if (!oldServers) return oldServers;
            return oldServers.map(server => {
                const resultIndex = servers.findIndex(s => s.id === server.id);
                const result = results[resultIndex];
                if (result.status === 'fulfilled') {
                    return {
                        ...server,
                        status: result.value.isOnline ? 'Online' : 'Offline',
                        lastCheckTime: new Date().toISOString(),
                    };
                }
                return {...server, status: 'Offline' as const, lastCheckTime: new Date().toISOString()};
            });
        });
    };

    const triggerHealthCheck = async () => {
        const servers = queryClient.getQueryData<ManagedServer[]>(['managed-servers']);
        if (!servers || servers.length === 0) return;

        const onlineServers = servers.filter(s => s.status === 'Online');
        await Promise.allSettled(
            onlineServers.map(server => serverManagementApi.performHealthCheck(server.id))
        );
        // Results will arrive via SignalR
    };

    return {
        triggerConnectivityCheck,
        triggerHealthCheck,
        config: finalConfig,
    };
};
