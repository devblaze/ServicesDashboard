import React, { useEffect, useState } from 'react';
import { X, Wifi, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { signalRService } from '../services/signalr.service';
import type { ScanNotification } from '../services/signalr.service';

interface NotificationItem {
  id: string;
  scanId: string;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  progress?: number;
}

interface ScanNotificationsProps {
  onNavigateToDiscovery?: () => void;
}

export const ScanNotifications: React.FC<ScanNotificationsProps> = ({ onNavigateToDiscovery }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to SignalR notifications
    const unsubscribe = signalRService.onNotification(handleNotification);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleNotification = (notification: ScanNotification) => {
    const newNotification: NotificationItem = {
      id: `${notification.scanId}-${Date.now()}`,
      scanId: notification.scanId,
      type: 'info',
      title: '',
      message: '',
      timestamp: new Date(),
    };

    switch (notification.type) {
      case 'started':
        newNotification.type = 'info';
        newNotification.title = 'Scan Started';
        newNotification.message = `Scanning ${notification.data.target} (${notification.data.scanType})`;
        break;

      case 'progress':
        newNotification.type = 'info';
        newNotification.title = 'Scan Progress';
        newNotification.message = notification.data.message;
        newNotification.progress = notification.data.progress;
        break;

      case 'completed':
        newNotification.type = 'success';
        newNotification.title = 'Scan Completed';
        newNotification.message = `Found ${notification.data.totalHosts} hosts and ${notification.data.totalServices} services`;
        break;

      case 'error':
        newNotification.type = 'error';
        newNotification.title = 'Scan Error';
        newNotification.message = notification.data.error;
        break;

      case 'serviceDiscovered':
        newNotification.type = 'info';
        newNotification.title = 'Service Discovered';
        newNotification.message = `${notification.data.serviceName} on ${notification.data.host}:${notification.data.port}`;
        break;

      case 'hostDiscovered':
        newNotification.type = 'info';
        newNotification.title = 'Host Discovered';
        newNotification.message = `${notification.data.host} with ${notification.data.openPorts} open ports`;
        break;
    }

    setNotifications(prev => {
      // Remove old progress notifications for the same scan
      const filtered = notification.type === 'progress'
        ? prev.filter(n => !(n.scanId === notification.scanId && n.title === 'Scan Progress'))
        : prev;

      // Add new notification at the beginning
      return [newNotification, ...filtered].slice(0, 10); // Keep max 10 notifications
    });

    // Auto-expand on new scan start
    if (notification.type === 'started') {
      setIsExpanded(true);
    }
  };

  const handleNotificationClick = (scanId: string) => {
    // Trigger navigation to Discovery tab if callback is provided
    if (onNavigateToDiscovery) {
      onNavigateToDiscovery();
    }
    // Store the scan ID in session storage for the Discovery page to pick up
    sessionStorage.setItem('currentScanId', scanId);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setIsExpanded(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      default:
        return <Activity className="h-5 w-5 text-blue-400" />;
    }
  };

  // Don't render if no notifications
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed view */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-800 text-white rounded-lg px-4 py-2 shadow-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
        >
          <Wifi className="h-5 w-5 animate-pulse" />
          <span>{notifications.length} scan update{notifications.length !== 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="bg-gray-800 rounded-lg shadow-xl w-96 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <Wifi className="h-5 w-5" />
              <span>Scan Notifications</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearNotifications}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Clear
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className="px-4 py-3 border-b border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => handleNotificationClick(notification.scanId)}
              >
                <div className="flex items-start space-x-3">
                  {getIcon(notification.type)}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {notification.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {notification.message}
                    </div>
                    {notification.progress !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${notification.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {notification.progress}%
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};