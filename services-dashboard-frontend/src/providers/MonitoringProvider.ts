import React, { createContext, useContext } from 'react';
import { useAutoMonitoring } from '../hooks/AutoMonitoringHook';

interface MonitoringContextType {
  triggerConnectivityCheck: () => void;
  triggerHealthCheck: () => void;
  config: {
    enableServerConnectivityCheck: boolean;
    enableServerHealthCheck: boolean;
    enableServiceHealthCheck: boolean;
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
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({
  children,
  enableServerConnectivity = true,
  enableServerHealth = true,
  enableServiceHealth = true,
}) => {
  const monitoring = useAutoMonitoring({
    enableServerConnectivityCheck: enableServerConnectivity,
    enableServerHealthCheck: enableServerHealth,
    enableServiceHealthCheck: enableServiceHealth,
  });

  return React.createElement(
    MonitoringContext.Provider,
    { value: monitoring },
    children
  );
};
