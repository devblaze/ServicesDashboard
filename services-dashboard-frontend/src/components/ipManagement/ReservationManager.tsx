import React from 'react';
import { Construction } from 'lucide-react';

interface ReservationManagerProps {
  darkMode?: boolean;
}

const ReservationManager: React.FC<ReservationManagerProps> = ({ darkMode = true }) => {

  return (
    <div className={`rounded-lg p-12 text-center ${
      darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <Construction className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
      <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        IP Reservation Manager - Coming Soon
      </h3>
      <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Reserve static IP addresses for your devices to prevent DHCP conflicts.
      </p>
      <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        <p>Features will include:</p>
        <ul className="mt-2 space-y-1">
          <li>• Create and manage IP reservations</li>
          <li>• Assign reservations to specific MAC addresses</li>
          <li>• Set expiration dates for temporary reservations</li>
          <li>• View all reserved IPs across subnets</li>
          <li>• Quick reserve from IP grid</li>
        </ul>
      </div>
    </div>
  );
};

export default ReservationManager;
