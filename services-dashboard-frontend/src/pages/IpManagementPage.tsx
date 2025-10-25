import React, { useState } from 'react';
import { Network, Server, Shield, Settings, List } from 'lucide-react';
import SubnetManager from '../components/ipManagement/SubnetManager';
import IpOverview from '../components/ipManagement/IpOverview';
import DeviceTracker from '../components/ipManagement/DeviceTracker';
import ReservationManager from '../components/ipManagement/ReservationManager';
import OmadaSettings from '../components/ipManagement/OmadaSettings';

type Tab = 'subnets' | 'overview' | 'devices' | 'reservations' | 'omada';

interface IpManagementPageProps {
  darkMode?: boolean;
}

const IpManagementPage: React.FC<IpManagementPageProps> = ({ darkMode = true }) => {
  const [activeTab, setActiveTab] = useState<Tab>('subnets');

  const tabs = [
    { id: 'subnets' as Tab, label: 'Subnets', icon: Network },
    { id: 'overview' as Tab, label: 'IP Overview', icon: List },
    { id: 'devices' as Tab, label: 'Fixed IPs', icon: Server },
    { id: 'reservations' as Tab, label: 'Reservations', icon: Shield },
    { id: 'omada' as Tab, label: 'Omada', icon: Settings },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            IP Address Management
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Track fixed IPs from Docker containers, VMs, and network devices across all your servers
          </p>
        </div>

        {/* Tab Navigation */}
        <div className={`border-b mb-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-1 py-4 border-b-2 font-medium transition-colors
                    ${isActive
                      ? darkMode
                        ? 'border-blue-500 text-blue-400'
                        : 'border-blue-600 text-blue-600'
                      : darkMode
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'subnets' && <SubnetManager darkMode={darkMode} />}
          {activeTab === 'overview' && <IpOverview darkMode={darkMode} />}
          {activeTab === 'devices' && <DeviceTracker darkMode={darkMode} />}
          {activeTab === 'reservations' && <ReservationManager darkMode={darkMode} />}
          {activeTab === 'omada' && <OmadaSettings darkMode={darkMode} />}
        </div>
      </div>
    </div>
  );
};

export default IpManagementPage;
