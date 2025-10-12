import React from 'react';
import { X, HelpCircle } from 'lucide-react';
import { ServerDropdown } from '../networkDiscovery/ServerDropdown.tsx';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { CreateServiceDto } from '../../types/Service.ts';

interface FormData extends CreateServiceDto {
  hostAddress?: string;
  serviceType?: 'docker' | 'external';
  banner?: string;
  serviceUrl?: string;
  containerId?: string;
  serverId?: number;
}

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateServiceDto) => void;
  formData: FormData;
  onFormDataChange: (data: Partial<FormData>) => void;
  isLoading?: boolean;
  darkMode?: boolean;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  isLoading = false,
  darkMode = true
}) => {
  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFormDataChange({
      [name]: name === 'port' ? (value ? parseInt(value) : undefined) : value
    });
  };

  const handleServerSelect = (serverId: number | undefined) => {
    onFormDataChange({ serverId });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && (formData.serviceType === 'external' || formData.dockerImage)) {
      // Create the service data, only including properties that exist on CreateServiceDto
      const serviceData: CreateServiceDto = {
        name: formData.name,
        description: formData.description,
        dockerImage: formData.serviceType === 'docker' ? formData.dockerImage : undefined,
        port: formData.port,
        isDockerContainer: formData.serviceType === 'docker',
        // Add these if they exist on CreateServiceDto, otherwise remove them
        healthCheckUrl: formData.serviceUrl, // Map serviceUrl to healthCheckUrl if that's the correct property
        // serverId: formData.serverId, // Include only if this exists on CreateServiceDto
        // containerId: formData.containerId, // Include only if this exists on CreateServiceDto
      };
      onSubmit(serviceData);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isFormValid = formData.name &&
    (formData.serviceType === 'external' ||
     (formData.serviceType === 'docker' && formData.dockerImage));

  // Handle ESC key to close modal
  useEscapeKey(onClose, isOpen && !isLoading);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
      onClick={handleBackdropClick}
    >
      <div className={`w-full max-w-2xl rounded-xl border shadow-xl ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Modal Header */}
        <div className={`p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Add New Service
            </h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Service Type Selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Service Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onFormDataChange({ serviceType: 'docker', dockerImage: '', hostAddress: '' })}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  formData.serviceType === 'docker'
                    ? darkMode
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-blue-500 bg-blue-50 text-blue-600'
                    : darkMode
                      ? 'border-gray-600 hover:border-gray-500 text-gray-300'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                }`}
              >
                <div className="font-medium mb-1">🐳 Docker Service</div>
                <div className="text-xs opacity-75">Service running in Docker container</div>
              </button>
              
              <button
                type="button"
                onClick={() => onFormDataChange({ serviceType: 'external', dockerImage: undefined })}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  formData.serviceType === 'external'
                    ? darkMode
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-blue-500 bg-blue-50 text-blue-600'
                    : darkMode
                      ? 'border-gray-600 hover:border-gray-500 text-gray-300'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                }`}
              >
                <div className="font-medium mb-1">🌐 External Service</div>
                <div className="text-xs opacity-75">Service hosted elsewhere</div>
              </button>
            </div>
          </div>

          {formData.serviceType && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Service Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="My Service"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Port
                  </label>
                  <input
                    type="number"
                    name="port"
                    value={formData.port || ''}
                    onChange={handleInputChange}
                    min="1"
                    max="65535"
                    className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="80"
                  />
                </div>
              </div>

              {/* Server Selection */}
              <ServerDropdown
                selectedServerId={formData.serverId}
                onServerSelect={handleServerSelect}
                darkMode={darkMode}
                placeholder="Select server (optional for external services)"
              />

              {/* Docker-specific fields */}
              {formData.serviceType === 'docker' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`flex items-center text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Docker Image *
                      <div className="group relative ml-1">
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 ${
                          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'
                        }`}>
                          e.g., nginx:latest, node:18-alpine
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      name="dockerImage"
                      value={formData.dockerImage || ''}
                      onChange={handleInputChange}
                      required={formData.serviceType === 'docker'}
                      className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="nginx:latest"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Container ID
                    </label>
                    <input
                      type="text"
                      name="containerId"
                      value={formData.containerId || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="abc123def456..."
                    />
                  </div>
                </div>
              )}

              {/* Service URL */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Service URL
                </label>
                <input
                  type="url"
                  name="serviceUrl"
                  value={formData.serviceUrl || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="https://myservice.com"
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Brief description of the service..."
                />
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isFormValid && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Adding...' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};