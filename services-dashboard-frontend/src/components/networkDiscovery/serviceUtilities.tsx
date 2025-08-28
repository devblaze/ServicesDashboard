import React from 'react';
import {
  Globe,
  Server,
  Shield,
  Network,
  Clock,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

export const formatResponseTime = (responseTime: string | number) => {
  try {
    const responseTimeStr = String(responseTime);
    const parts = responseTimeStr.split(':');
    if (parts.length === 3) {
      const seconds = parseFloat(parts[2]);
      return `${(seconds * 1000).toFixed(0)}ms`;
    }
    if (typeof responseTime === 'number') {
      return `${responseTime.toFixed(0)}ms`;
    }
    return responseTimeStr;
  } catch {
    return String(responseTime);
  }
};

export const getServiceIcon = (serviceType: string) => {
  switch (serviceType.toLowerCase()) {
    case 'http':
    case 'https':
    case 'http alt':
    case 'https alt':
      return React.createElement(Globe, { className: "w-5 h-5" });
    case 'ssh':
      return React.createElement(Shield, { className: "w-5 h-5" });
    case 'mysql':
    case 'postgresql':
    case 'sql server':
    case 'mongodb':
    case 'redis':
    case 'elasticsearch':
      return React.createElement(Server, { className: "w-5 h-5" });
    default:
      return React.createElement(Network, { className: "w-5 h-5" });
  }
};

export const getServiceTypeColor = (serviceType: string, darkMode: boolean = true) => {
  switch (serviceType.toLowerCase()) {
    case 'http':
    case 'https':
    case 'http alt':
    case 'https alt':
      return darkMode ? 'text-green-400 bg-green-900/20 border-green-600/30' : 'text-green-600 bg-green-50 border-green-200';
    case 'ssh':
      return darkMode ? 'text-purple-400 bg-purple-900/20 border-purple-600/30' : 'text-purple-600 bg-purple-50 border-purple-200';
    case 'mysql':
    case 'postgresql':
    case 'sql server':
    case 'mongodb':
    case 'redis':
    case 'elasticsearch':
      return darkMode ? 'text-blue-400 bg-blue-900/20 border-blue-600/30' : 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return darkMode ? 'text-gray-400 bg-gray-800/20 border-gray-600/30' : 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getScanStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return React.createElement(Clock, { className: "w-4 h-4 text-yellow-500" });
    case 'running':
      return React.createElement(Loader2, { className: "w-4 h-4 text-blue-500 animate-spin" });
    case 'completed':
      return React.createElement(CheckCircle, { className: "w-4 h-4 text-green-500" });
    case 'failed':
      return React.createElement(XCircle, { className: "w-4 h-4 text-red-500" });
    default:
      return React.createElement(Clock, { className: "w-4 h-4 text-gray-500" });
  }
};