import React from 'react';
import { Construction } from 'lucide-react';

interface DeviceTrackerProps {
  darkMode?: boolean;
}

const DeviceTracker: React.FC<DeviceTrackerProps> = ({ darkMode = true }) => {

  return (
    <div className={`rounded-lg p-12 text-center ${
      darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <Construction className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
      <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Device Tracker - Coming Soon
      </h3>
      <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Track all network devices, view their status, and manage device information.
      </p>
      <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        <p>Features will include:</p>
        <ul className="mt-2 space-y-1">
          <li>• Device list with search and filtering</li>
          <li>• Real-time status monitoring</li>
          <li>• Device history and change tracking</li>
          <li>• MAC address lookup</li>
          <li>• Device type categorization</li>
        </ul>
      </div>
    </div>
  );
};

export default DeviceTracker;
