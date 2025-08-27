import React from 'react';
import { X, HelpCircle } from 'lucide-react';
import type { CreateServiceDto } from '../../types/Service.ts';

interface FormData extends CreateServiceDto {
  hostAddress?: string;
  serviceType?: 'docker' | 'external';
  banner?: string;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && (formData.serviceType === 'external' || formData.dockerImage)) {
      const serviceData: CreateServiceDto = {
        name: formData.name,
        description: formData.description,
        dockerImage: formData.serviceType === 'docker' ? formData.dockerImage : undefined,
        port: formData.port,
        healthCheckUrl: formData.healthCheckUrl,
        environment: formData.environment,
        hostAddress: formData.hostAddress
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
                    Environment
                  </label>
                  <select
                    name="environment"
                    value={formData.environment}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select Environment</option>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

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
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                          darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-800 text-white'
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
                      required
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
                      Port
                    </label>
                    <input
                      type="number"
                      name="port"
                      value={formData.port || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="8080"
                    />
                  </div>
                </div>
              )}

              {/* External service fields */}
              {formData.serviceType === 'external' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`flex items-center text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Host Address
                      <div className="group relative ml-1">
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 ${
                          darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-800 text-white'
                        }`}>
                          IP address or domain where the service is hosted
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      name="hostAddress"
                      value={formData.hostAddress || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="192.168.1.100 or example.com"
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
                      className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="3000"
                    />
                  </div>
                </div>
              )}

              {/* Common fields */}
              <div>
                <label className={`flex items-center text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Health Check URL
                  <div className="group relative ml-1">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-56 ${
                      darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-800 text-white'
                    }`}>
                      Full URL to check service health. Used to monitor uptime and availability.
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  name="healthCheckUrl"
                  value={formData.healthCheckUrl || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder={
                    formData.serviceType === 'external'
                      ? 'https://example.com/health'
                      : 'http://localhost:8080/health'
                  }
                />
              </div>

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
                  placeholder="Description of the service and its purpose..."
                />
              </div>
            </>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
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