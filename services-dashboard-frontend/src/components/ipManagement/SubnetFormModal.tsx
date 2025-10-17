import React, { useState } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { ipManagementApi } from '../../services/ipManagementApi';
import type { Subnet } from '../../types/IpManagement';

interface SubnetFormModalProps {
  subnet: Subnet | null;
  darkMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SubnetFormModal: React.FC<SubnetFormModalProps> = ({ subnet, darkMode = true, onClose, onSuccess }) => {
  const isEdit = !!subnet;

  const [formData, setFormData] = useState({
    network: subnet?.network || '',
    gateway: subnet?.gateway || '',
    dhcpStart: subnet?.dhcpStart || '',
    dhcpEnd: subnet?.dhcpEnd || '',
    dnsServers: subnet?.dnsServers || '',
    vlanId: subnet?.vlanId?.toString() || '',
    description: subnet?.description || '',
    location: subnet?.location || '',
    isMonitored: subnet?.isMonitored ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => ipManagementApi.createSubnet({
      ...data,
      vlanId: data.vlanId ? parseInt(data.vlanId) : undefined,
      dhcpStart: data.dhcpStart || undefined,
      dhcpEnd: data.dhcpEnd || undefined,
      dnsServers: data.dnsServers || undefined,
      description: data.description || undefined,
      location: data.location || undefined,
      isMonitored: data.isMonitored,
    }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      setErrors({ general: error.response?.data?.message || 'Failed to create subnet' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => ipManagementApi.updateSubnet(subnet!.id, {
      ...data,
      vlanId: data.vlanId ? parseInt(data.vlanId) : undefined,
      dhcpStart: data.dhcpStart || undefined,
      dhcpEnd: data.dhcpEnd || undefined,
      dnsServers: data.dnsServers || undefined,
      description: data.description || undefined,
      location: data.location || undefined,
      isMonitored: data.isMonitored,
    }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      setErrors({ general: error.response?.data?.message || 'Failed to update subnet' });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate network (CIDR notation)
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!formData.network) {
      newErrors.network = 'Network is required';
    } else if (!cidrRegex.test(formData.network)) {
      newErrors.network = 'Must be in CIDR notation (e.g., 192.168.1.0/24)';
    }

    // Validate gateway
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!formData.gateway) {
      newErrors.gateway = 'Gateway is required';
    } else if (!ipRegex.test(formData.gateway)) {
      newErrors.gateway = 'Must be a valid IP address';
    }

    // Validate DHCP range if provided
    if (formData.dhcpStart && !ipRegex.test(formData.dhcpStart)) {
      newErrors.dhcpStart = 'Must be a valid IP address';
    }
    if (formData.dhcpEnd && !ipRegex.test(formData.dhcpEnd)) {
      newErrors.dhcpEnd = 'Must be a valid IP address';
    }

    // Validate VLAN ID if provided
    if (formData.vlanId && (parseInt(formData.vlanId) < 1 || parseInt(formData.vlanId) > 4094)) {
      newErrors.vlanId = 'VLAN ID must be between 1 and 4094';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`max-w-2xl w-full rounded-lg p-6 max-h-[90vh] overflow-y-auto ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isEdit ? 'Edit Subnet' : 'Add New Subnet'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm">
              {errors.general}
            </div>
          )}

          {/* Network (CIDR) */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Network (CIDR) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.network}
              onChange={(e) => handleChange('network', e.target.value)}
              placeholder="192.168.1.0/24"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.network ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
              } ${
                darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.network && <p className="text-red-500 text-sm mt-1">{errors.network}</p>}
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Use CIDR notation (e.g., 192.168.1.0/24)
            </p>
          </div>

          {/* Gateway */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Gateway IP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.gateway}
              onChange={(e) => handleChange('gateway', e.target.value)}
              placeholder="192.168.1.1"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.gateway ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
              } ${
                darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.gateway && <p className="text-red-500 text-sm mt-1">{errors.gateway}</p>}
          </div>

          {/* DHCP Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                DHCP Start
              </label>
              <input
                type="text"
                value={formData.dhcpStart}
                onChange={(e) => handleChange('dhcpStart', e.target.value)}
                placeholder="192.168.1.100"
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.dhcpStart ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
                } ${
                  darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.dhcpStart && <p className="text-red-500 text-sm mt-1">{errors.dhcpStart}</p>}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                DHCP End
              </label>
              <input
                type="text"
                value={formData.dhcpEnd}
                onChange={(e) => handleChange('dhcpEnd', e.target.value)}
                placeholder="192.168.1.200"
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.dhcpEnd ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
                } ${
                  darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.dhcpEnd && <p className="text-red-500 text-sm mt-1">{errors.dhcpEnd}</p>}
            </div>
          </div>

          {/* DNS Servers */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              DNS Servers
            </label>
            <input
              type="text"
              value={formData.dnsServers}
              onChange={(e) => handleChange('dnsServers', e.target.value)}
              placeholder="8.8.8.8, 8.8.4.4"
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Comma-separated list of DNS server IPs
            </p>
          </div>

          {/* VLAN ID */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              VLAN ID
            </label>
            <input
              type="number"
              value={formData.vlanId}
              onChange={(e) => handleChange('vlanId', e.target.value)}
              placeholder="100"
              min="1"
              max="4094"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.vlanId ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
              } ${
                darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.vlanId && <p className="text-red-500 text-sm mt-1">{errors.vlanId}</p>}
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Home Network"
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Location */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Building A, Floor 2"
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Is Monitored */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMonitored"
              checked={formData.isMonitored}
              onChange={(e) => handleChange('isMonitored', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isMonitored" className={`ml-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Enable monitoring for this subnet
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                isPending
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? 'Update Subnet' : 'Create Subnet'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubnetFormModal;
