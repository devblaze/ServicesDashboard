import React, { createContext, useContext } from 'react';
import { useAutoMonitoring } from '../hooks/AutoMonitoringHook';

interface MonitoringContextType {
  triggerConnectivityCheck: () => void;
  triggerHealthCheck: () => void;
  config: {
    enableServerConnectivityCheck: boolean;
    enableServerHealthCheck: boolean;
    enableServiceHealthCheck: boolean;
    connectivityCheckInterval: number;
    healthCheckInterval: number;
  };
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};

interface MonitoringProviderProps {
  children: React.ReactNode;
  enableServerConnectivity?: boolean;
  enableServerHealth?: boolean;
  enableServiceHealth?: boolean;
  connectivityInterval?: number; // in minutes
  healthInterval?: number; // in minutes
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({
  children,
  enableServerConnectivity = true,
  enableServerHealth = true,
  enableServiceHealth = true,
  connectivityInterval = 1, // 1 minute default
  healthInterval = 5 // 5 minutes default
}) => {
  const monitoring = useAutoMonitoring({
    enableServerConnectivityCheck: enableServerConnectivity,
    enableServerHealthCheck: enableServerHealth,
    enableServiceHealthCheck: enableServiceHealth,
    connectivityCheckInterval: connectivityInterval * 60 * 1000,
    healthCheckInterval: healthInterval * 60 * 1000
  });

  return React.createElement(
    MonitoringContext.Provider,
    { value: monitoring },
    children
  );
};