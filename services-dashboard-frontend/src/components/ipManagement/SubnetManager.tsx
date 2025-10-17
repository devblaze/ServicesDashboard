import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Trash2, Edit, Eye, Network } from 'lucide-react';
import { ipManagementApi } from '../../services/ipManagementApi';
import type { Subnet } from '../../types/IpManagement';
import SubnetFormModal from './SubnetFormModal';
import IpGridVisualization from './IpGridVisualization';

interface SubnetManagerProps {
  darkMode?: boolean;
}

const SubnetManager: React.FC<SubnetManagerProps> = ({ darkMode = true }) => {
  const queryClient = useQueryClient();
  const [selectedSubnet, setSelectedSubnet] = useState<Subnet | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<Subnet | null>(null);
  const [showIpGrid, setShowIpGrid] = useState(false);

  // Fetch subnets
  const { data: subnets = [], isLoading, refetch } = useQuery({
    queryKey: ['ip-subnets'],
    queryFn: () => ipManagementApi.getAllSubnets(),
  });

  // Fetch subnet summaries for each subnet
  const subnetSummaries = useQuery({
    queryKey: ['subnet-summaries', subnets.map(s => s.id)],
    queryFn: async () => {
      const summaries = await Promise.all(
        subnets.map(subnet => ipManagementApi.getSubnetSummary(subnet.id))
      );
      return summaries;
    },
    enabled: subnets.length > 0,
  });

  // Delete subnet mutation
  const deleteSubnetMutation = useMutation({
    mutationFn: (id: number) => ipManagementApi.deleteSubnet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-subnets'] });
      if (selectedSubnet && selectedSubnet.id === (deleteSubnetMutation.variables as number)) {
        setSelectedSubnet(null);
      }
    },
  });

  const handleEdit = (subnet: Subnet) => {
    setEditingSubnet(subnet);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this subnet?')) {
      deleteSubnetMutation.mutate(id);
    }
  };

  const handleViewIpGrid = (subnet: Subnet) => {
    setSelectedSubnet(subnet);
    setShowIpGrid(true);
  };

  const getSummaryForSubnet = (subnetId: number) => {
    return subnetSummaries.data?.find(s => s.subnetId === subnetId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (showIpGrid && selectedSubnet) {
    return (
      <div>
        <button
          onClick={() => {
            setShowIpGrid(false);
            setSelectedSubnet(null);
          }}
          className={`mb-4 px-4 py-2 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          ← Back to Subnets
        </button>
        <IpGridVisualization subnet={selectedSubnet} darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div>
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Subnets
          </h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {subnets.length} subnet{subnets.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => refetch()}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingSubnet(null);
              setShowForm(true);
            }}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Subnet
          </button>
        </div>
      </div>

      {/* Subnets Grid */}
      {subnets.length === 0 ? (
        <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
          darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
        }`}>
          <Network className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            No Subnets Configured
          </h3>
          <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Add your first subnet to start managing IP addresses
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Add Subnet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {subnets.map(subnet => {
            const summary = getSummaryForSubnet(subnet.id);
            return (
              <div
                key={subnet.id}
                className={`rounded-lg border p-6 ${
                  darkMode
                    ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                    : 'bg-white border-gray-200 hover:shadow-lg'
                } transition-all cursor-pointer`}
                onClick={() => handleViewIpGrid(subnet)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {subnet.network}
                    </h3>
                    {subnet.description && (
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {subnet.description}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(subnet)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-blue-400'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-blue-600'
                      }`}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(subnet.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-red-600'
                      }`}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                {summary && (
                  <div className="space-y-3">
                    {/* Usage Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          IP Usage
                        </span>
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {summary.usedIps} / {summary.totalIps} ({summary.usagePercentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            summary.usagePercentage > 90
                              ? 'bg-red-500'
                              : summary.usagePercentage > 75
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${summary.usagePercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`text-center p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className={`text-lg font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {summary.onlineDevices}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Online
                        </div>
                      </div>
                      <div className={`text-center p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className={`text-lg font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {summary.availableIps}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Available
                        </div>
                      </div>
                      <div className={`text-center p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className={`text-lg font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {summary.reservedIps}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Reserved
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="pt-3 border-t border-gray-700 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Gateway:</span>
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{subnet.gateway}</span>
                      </div>
                      {subnet.dhcpStart && subnet.dhcpEnd && (
                        <div className="flex justify-between text-sm">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>DHCP Range:</span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {subnet.dhcpStart} - {subnet.dhcpEnd}
                          </span>
                        </div>
                      )}
                      {subnet.vlanId && (
                        <div className="flex justify-between text-sm">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>VLAN:</span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{subnet.vlanId}</span>
                        </div>
                      )}
                    </div>

                    {/* View IP Grid Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewIpGrid(subnet);
                      }}
                      className={`w-full mt-2 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        darkMode
                          ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                      }`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View IP Grid
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Subnet Form Modal */}
      {showForm && (
        <SubnetFormModal
          subnet={editingSubnet}
          darkMode={darkMode}
          onClose={() => {
            setShowForm(false);
            setEditingSubnet(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingSubnet(null);
            queryClient.invalidateQueries({ queryKey: ['ip-subnets'] });
          }}
        />
      )}
    </div>
  );
};

export default SubnetManager;
