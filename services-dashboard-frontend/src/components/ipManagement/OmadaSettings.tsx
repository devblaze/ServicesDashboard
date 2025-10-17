import React from 'react';
import { Construction } from 'lucide-react';

interface OmadaSettingsProps {
  darkMode?: boolean;
}

const OmadaSettings: React.FC<OmadaSettingsProps> = ({ darkMode = true }) => {

  return (
    <div className={`rounded-lg p-12 text-center ${
      darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <Construction className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
      <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Omada Controller Integration - Coming Soon
      </h3>
      <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Connect to your TP-Link Omada Controller to automatically sync network clients.
      </p>
      <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        <p>Features will include:</p>
        <ul className="mt-2 space-y-1">
          <li>• Configure Omada Controller connection (URL: {window.location.hostname === 'localhost' ? '192.168.1.1' : 'your-controller-ip'})</li>
          <li>• Test connection and authenticate</li>
          <li>• Automatic client synchronization</li>
          <li>• Pull DHCP lease information</li>
          <li>• View connected clients</li>
          <li>• Schedule automatic syncs</li>
        </ul>
      </div>
    </div>
  );
};

export default OmadaSettings;
