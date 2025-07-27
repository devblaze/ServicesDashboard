import { useServices } from '../hooks/serviceHooks';
import type { HostedService } from '../types/ServiceInterfaces';

interface ServicesListProps {
  darkMode?: boolean;
}

export function ServicesList({ darkMode = false }: ServicesListProps) {
  const { data: services, isLoading, error } = useServices();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Loading services...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border rounded-lg p-4 ${
        darkMode 
          ? 'bg-red-900 border-red-700' 
          : 'bg-red-50 border-red-200'
      }`}>
        <h3 className={`font-medium ${
          darkMode ? 'text-red-200' : 'text-red-800'
        }`}>
          Error loading services
        </h3>
        <p className={`text-sm mt-1 ${
          darkMode ? 'text-red-300' : 'text-red-600'
        }`}>
          {error.message || 'Failed to fetch services'}
        </p>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className={`text-lg font-medium mb-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          No services found
        </h3>
        <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
          Add your first service to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className={`text-xl font-semibold mb-4 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Services
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service: HostedService) => (
          <div
            key={service.id}
            className={`border rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`text-lg font-medium mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {service.name}
                </h3>
                <p className={`text-sm mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {service.description || 'No description'}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <span className={`w-20 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Status:
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        service.status === 'Running'
                          ? 'bg-green-100 text-green-800'
                          : service.status === 'Stopped'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className={`w-20 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Image:
                    </span>
                    <span className={`font-mono text-xs ${
                      darkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {service.dockerImage}
                    </span>
                  </div>
                  
                  {service.port && (
                    <div className="flex items-center">
                      <span className={`w-20 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Port:
                      </span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                        {service.port}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <span className={`w-20 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Env:
                    </span>
                    <span className={`capitalize ${
                      darkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {service.environment}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'Running' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            </div>
            
            <div className={`mt-4 pt-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-100'
            }`}>
              <div className={`flex justify-between items-center text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <span>Created: {new Date(service.createdAt).toLocaleDateString()}</span>
                <span>Updated: {new Date(service.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServicesList;