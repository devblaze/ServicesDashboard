import { useServices } from '../hooks/serviceHooks';
import { Server, Activity, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, Square } from 'lucide-react';
import type { HostedService } from '../types/ServiceInterfaces';
import { ServiceStatus } from '../types/ServiceStatus';

interface ServicesListProps {
  darkMode?: boolean;
}

export function ServicesList({ darkMode = false }: ServicesListProps) {
  const { data: services, isLoading, error, refetch } = useServices();

  const getStatusConfig = (status: ServiceStatus) => {
    const configs = {
      [ServiceStatus.Running]: {
        icon: CheckCircle,
        className: darkMode 
          ? 'bg-green-900/50 text-green-300 border border-green-800' 
          : 'bg-green-100 text-green-800 border border-green-200',
        label: 'Running',
        dotColor: 'bg-green-400'
      },
      [ServiceStatus.Stopped]: {
        icon: Square,
        className: darkMode 
          ? 'bg-red-900/50 text-red-300 border border-red-800' 
          : 'bg-red-100 text-red-800 border border-red-200',
        label: 'Stopped',
        dotColor: 'bg-red-400'
      },
      [ServiceStatus.Failed]: {
        icon: AlertCircle,
        className: darkMode 
          ? 'bg-red-900/50 text-red-300 border border-red-800' 
          : 'bg-red-100 text-red-800 border border-red-200',
        label: 'Failed',
        dotColor: 'bg-red-400'
      },
      [ServiceStatus.Unknown]: {
        icon: Clock,
        className: darkMode 
          ? 'bg-gray-800 text-gray-300 border border-gray-700' 
          : 'bg-gray-100 text-gray-800 border border-gray-200',
        label: 'Unknown',
        dotColor: 'bg-gray-400'
      }
    };
    return configs[status];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <span className={`text-lg ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Loading services...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg p-6 border transition-colors duration-200 ${
        darkMode 
          ? 'bg-red-900/20 border-red-800 text-red-200' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-start">
          <AlertCircle className={`w-5 h-5 mr-3 mt-0.5 ${
            darkMode ? 'text-red-400' : 'text-red-500'
          }`} />
          <div>
            <h3 className="font-semibold text-lg mb-2">Error loading services</h3>
            <p className={`mb-4 ${
              darkMode ? 'text-red-300' : 'text-red-700'
            }`}>
              {error.message || 'Failed to fetch services'}
            </p>
            <button
              onClick={() => refetch()}
              className={`inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                darkMode
                  ? 'bg-red-800 hover:bg-red-700 text-red-100'
                  : 'bg-red-100 hover:bg-red-200 text-red-800'
              }`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className={`text-center p-12 rounded-lg border transition-colors duration-200 ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <Server className={`w-16 h-16 mx-auto mb-4 ${
          darkMode ? 'text-gray-500' : 'text-gray-400'
        }`} />
        <h3 className={`text-xl font-semibold mb-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          No services found
        </h3>
        <p className={`text-lg mb-6 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Add your first service to get started.
        </p>
        <button className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
          darkMode
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}>
          <Server className="w-5 h-5 mr-2" />
          Add Your First Service
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Services
          </h2>
          <p className={`mt-1 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {services.length} service{services.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className={`inline-flex items-center px-4 py-2 rounded-lg border font-medium transition-colors duration-200 ${
            darkMode
              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>
      
      {/* Services Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service: HostedService) => {
          const statusConfig = getStatusConfig(service.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <div
              key={service.id}
              className={`rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center flex-1">
                    <div className={`p-2 rounded-lg mr-3 ${
                      darkMode ? 'bg-blue-900/50' : 'bg-blue-100'
                    }`}>
                      <Server className={`w-5 h-5 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-semibold truncate ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {service.name}
                      </h3>
                      <p className={`text-sm mt-1 line-clamp-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {service.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${statusConfig.dotColor} flex-shrink-0`}></div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </span>
                </div>

                {/* Service Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Image:
                    </span>
                    <span className={`text-sm font-mono truncate max-w-40 ${
                      darkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {service.dockerImage}
                    </span>
                  </div>
                  
                  {service.port && (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Port:
                      </span>
                      <span className={`text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-900'
                      }`}>
                        {service.port}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Environment:
                    </span>
                    <span className={`text-sm capitalize ${
                      darkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {service.environment}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className={`px-6 py-4 border-t ${
                darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Created: {new Date(service.createdAt).toLocaleDateString()}
                  </span>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Updated: {new Date(service.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    darkMode
                      ? 'bg-green-900/50 text-green-300 hover:bg-green-900/70'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}>
                    <Activity className="w-4 h-4 mr-1" />
                    Health Check
                  </button>
                  <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    darkMode
                      ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ServicesList;