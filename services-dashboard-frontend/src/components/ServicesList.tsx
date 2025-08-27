import { useState } from 'react';
import { useServices } from '../hooks/serviceHooks';
import { Plus, RefreshCw } from 'lucide-react';
import { AddServiceModal } from './modals/AddServiceModal';
import { ServiceCard } from './cards/ServiceCard';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { ErrorDisplay } from './ui/ErrorDisplay';
import { EmptyState } from './ui/EmptyState';
import { useAddServiceForm } from '../hooks/useAddServiceForm';
import type { HostedService, CreateServiceDto } from '../types/Service.ts';

interface ServicesListProps {
  darkMode?: boolean;
}

export function ServicesList({ darkMode = true }: ServicesListProps) {
  const { data: services, isLoading, error, refetch } = useServices();
  const [showAddModal, setShowAddModal] = useState(false);
  
  const {
    formData,
    updateFormData,
    resetForm,
    handleSubmit,
    isLoading: isSubmitting
  } = useAddServiceForm();

  const handleOpenModal = () => {
    console.log('Opening modal...'); // Debug log
    resetForm();
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    console.log('Closing modal...'); // Debug log
    setShowAddModal(false);
    resetForm();
  };

  const handleModalSubmit = (data: CreateServiceDto) => {
    console.log('Submitting service data:', data); // Debug log
    handleSubmit(data);
    setShowAddModal(false);
  };

  const handleHealthCheck = (service: HostedService) => {
    console.log('Health check for service:', service.name);
    // TODO: Implement health check functionality
  };

  const handleDeleteService = (service: HostedService) => {
    console.log('Delete service:', service.name);
    // TODO: Implement delete functionality
  };

  console.log('ServicesList render - showAddModal:', showAddModal); // Debug log
  console.log('Services data:', services); // Debug log

  if (isLoading) {
    return <LoadingSpinner darkMode={darkMode} message="Loading services..." />;
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        darkMode={darkMode} 
        onRetry={refetch}
        title="Error loading services"
      />
    );
  }

  if (!services || services.length === 0) {
    console.log('Rendering EmptyState'); // Debug log
    return (
      <>
        <EmptyState darkMode={darkMode} onAddService={handleOpenModal} />
        {/* Always render the modal, even in empty state */}
        <AddServiceModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
          formData={formData}
          onFormDataChange={updateFormData}
          isLoading={isSubmitting}
          darkMode={darkMode}
        />
      </>
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
        <div className="flex space-x-3">
          <button
            onClick={handleOpenModal}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </button>
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
      </div>
      
      {/* Services Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service: HostedService) => (
          <ServiceCard
            key={service.id}
            service={service}
            darkMode={darkMode}
            onHealthCheck={handleHealthCheck}
            onDelete={handleDeleteService}
          />
        ))}
      </div>

      {/* Add Service Modal */}
      <AddServiceModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        formData={formData}
        onFormDataChange={updateFormData}
        isLoading={isSubmitting}
        darkMode={darkMode}
      />
    </div>
  );
}

export default ServicesList;