import {useEffect, useRef} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {serverManagementApi} from '../services/serverManagementApi';
import type {ManagedServer} from '../types/ServerManagement';
import type {HostedService} from '../types/Service';
import {ServiceStatus} from '../types/ServiceStatus';

interface AutoMonitoringConfig {
    enableServerConnectivityCheck: boolean;
    enableServerHealthCheck: boolean;
    enableServiceHealthCheck: boolean;
    connectivityCheckInterval: number; // in milliseconds
    healthCheckInterval: number; // in milliseconds
}

const DEFAULT_CONFIG: AutoMonitoringConfig = {
    enableServerConnectivityCheck: true,
    enableServerHealthCheck: true,
    enableServiceHealthCheck: true,
    connectivityCheckInterval: 60 * 1000, // 1 minute
    healthCheckInterval: 5 * 60 * 1000, // 5 minutes
};

export const useAutoMonitoring = (config: Partial<AutoMonitoringConfig> = {}) => {
    const queryClient = useQueryClient();
    const finalConfig = {...DEFAULT_CONFIG, ...config};

    // Use refs to store interval IDs
    const connectivityIntervalRef = useRef<number | undefined>(undefined);
    const healthIntervalRef = useRef<number | undefined>(undefined);

    // Server connectivity check (every 1 minute)
    const performConnectivityChecks = async () => {
        try {
            const servers = queryClient.getQueryData<ManagedServer[]>(['managed-servers']);
            if (!servers || servers.length === 0) return;

            console.log('🔄 Performing connectivity checks for', servers.length, 'servers');

            const connectivityPromises = servers.map(async (server) => {
                try {
                    const isOnline = await serverManagementApi.testServerConnection(server);
                    return {serverId: server.id, isOnline, timestamp: new Date().toISOString()};
                } catch (error) {
                    console.warn(`❌ Connectivity check failed for ${server.name}:`, error);
                    return {serverId: server.id, isOnline: false, timestamp: new Date().toISOString()};
                }
            });

            const results = await Promise.allSettled(connectivityPromises);

            // Update server statuses in cache
            queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
                if (!oldServers) return oldServers;

                return oldServers.map(server => {
                    const resultIndex = servers.findIndex(s => s.id === server.id);
                    const result = results[resultIndex];

                    if (result.status === 'fulfilled') {
                        const {isOnline} = result.value;
                        return {
                            ...server,
                            status: isOnline ? 'Online' : 'Offline',
                            lastCheckTime: result.value.timestamp
                        };
                    }

                    // If connectivity check failed, mark as unknown
                    return {
                        ...server,
                        status: 'Unknown' as const,
                        lastCheckTime: new Date().toISOString()
                    };
                });
            });

            console.log('✅ Connectivity checks completed');
        } catch (error) {
            console.error('❌ Error during connectivity checks:', error);
        }
    };

    // Health checks (every 5 minutes)
    const performHealthChecks = async () => {
        try {
            // Server health checks
            if (finalConfig.enableServerHealthCheck) {
                const servers = queryClient.getQueryData<ManagedServer[]>(['managed-servers']);
                if (servers && servers.length > 0) {
                    console.log('🏥 Performing health checks for', servers.length, 'servers');

                    const onlineServers = servers.filter(s => s.status === 'Online');

                    const healthPromises = onlineServers.map(async (server) => {
                        try {
                            const healthCheck = await serverManagementApi.performHealthCheck(server.id);
                            return {serverId: server.id, healthCheck, success: true};
                        } catch (error) {
                            console.warn(`❌ Health check failed for ${server.name}:`, error);
                            return {
                                serverId: server.id,
                                healthCheck: null,
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            };
                        }
                    });

                    const results = await Promise.allSettled(healthPromises);

                    // Update servers with health check results
                    queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
                        if (!oldServers) return oldServers;

                        return oldServers.map(server => {
                            const resultIndex = onlineServers.findIndex(s => s.id === server.id);
                            if (resultIndex === -1) return server;

                            const result = results[resultIndex];

                            if (result.status === 'fulfilled' && result.value.success && result.value.healthCheck) {
                                const healthCheck = result.value.healthCheck;

                                // Determine new status based on health metrics
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
                                    healthChecks: [healthCheck, ...(server.healthChecks || [])].slice(0, 10), // Keep last 10
                                    lastCheckTime: healthCheck.checkTime
                                };
                            }

                            return server;
                        });
                    });

                    console.log('✅ Server health checks completed');
                }
            }

            // Service health checks
            if (finalConfig.enableServiceHealthCheck) {
                const services = queryClient.getQueryData<HostedService[]>(['services']);
                if (services && services.length > 0) {
                    console.log('🔗 Performing service health checks for', services.length, 'services');

                    const servicesWithHealthUrls = services.filter(s => s.healthCheckUrl);

                    const serviceHealthPromises = servicesWithHealthUrls.map(async (service) => {
                        try {
                            // Create AbortController for timeout
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                            const response = await fetch(service.healthCheckUrl!, {
                                method: 'GET',
                                signal: controller.signal,
                                headers: {
                                    'Accept': 'application/json,text/plain,*/*'
                                }
                            });

                            clearTimeout(timeoutId);
                            const isHealthy = response.ok;
                            const responseTime = performance.now();

                            return {
                                serviceId: service.id,
                                isHealthy,
                                httpStatusCode: response.status,
                                responseTime: Math.round(responseTime),
                                timestamp: new Date().toISOString(),
                                success: true
                            };
                        } catch (error) {
                            console.warn(`❌ Service health check failed for ${service.name}:`, error);
                            return {
                                serviceId: service.id,
                                isHealthy: false,
                                httpStatusCode: 0,
                                responseTime: null,
                                timestamp: new Date().toISOString(),
                                success: false,
                                error: error instanceof Error ? error.message : 'Network error'
                            };
                        }
                    });

                    const results = await Promise.allSettled(serviceHealthPromises);

                    // Update services with health check results
                    queryClient.setQueryData(['services'], (oldServices: HostedService[] | undefined) => {
                        if (!oldServices) return oldServices;

                        return oldServices.map(service => {
                            const resultIndex = servicesWithHealthUrls.findIndex(s => s.id === service.id);
                            if (resultIndex === -1) return service;

                            const result = results[resultIndex];

                            if (result.status === 'fulfilled') {
                                const healthResult = result.value;

                                // Determine service status based on health check
                                let newStatus: ServiceStatus = service.status;
                                if (healthResult.success && healthResult.isHealthy) {
                                    newStatus = ServiceStatus.Running;
                                } else if (healthResult.success && !healthResult.isHealthy) {
                                    newStatus = ServiceStatus.Failed;
                                } else {
                                    newStatus = ServiceStatus.Unknown;
                                }

                                return {
                                    ...service,
                                    status: newStatus, // This should now work correctly
                                    lastHealthCheck: healthResult.timestamp,
                                    uptime: healthResult.isHealthy ? (service.uptime || 0) + (finalConfig.healthCheckInterval / 1000) : 0
                                };
                            }

                            return service;
                        });
                    });

                    console.log('✅ Service health checks completed');
                }
            }

        } catch (error) {
            console.error('❌ Error during health checks:', error);
        }
    };

    // Setup intervals
    useEffect(() => {
        if (finalConfig.enableServerConnectivityCheck) {
            // Run connectivity check immediately, then every interval
            performConnectivityChecks();
            connectivityIntervalRef.current = window.setInterval(
                performConnectivityChecks,
                finalConfig.connectivityCheckInterval
            );
        }

        if (finalConfig.enableServerHealthCheck || finalConfig.enableServiceHealthCheck) {
            // Run health checks after a short delay, then every interval
            setTimeout(() => {
                performHealthChecks();
                healthIntervalRef.current = window.setInterval(
                    performHealthChecks,
                    finalConfig.healthCheckInterval
                );
            }, 5000); // 5 second delay before first health check
        }

        // Cleanup on unmount
        return () => {
            if (connectivityIntervalRef.current) {
                clearInterval(connectivityIntervalRef.current);
            }
            if (healthIntervalRef.current) {
                clearInterval(healthIntervalRef.current);
            }
        };
    }, [
        finalConfig.enableServerConnectivityCheck,
        finalConfig.enableServerHealthCheck,
        finalConfig.enableServiceHealthCheck,
        finalConfig.connectivityCheckInterval,
        finalConfig.healthCheckInterval
    ]);

    // Manual trigger functions
    const triggerConnectivityCheck = () => {
        performConnectivityChecks();
    };

    const triggerHealthCheck = () => {
        performHealthChecks();
    };

    return {
        triggerConnectivityCheck,
        triggerHealthCheck,
        config: finalConfig
    };
};