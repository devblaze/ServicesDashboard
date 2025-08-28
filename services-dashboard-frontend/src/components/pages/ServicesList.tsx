import { useState } from 'react';
import { useServices, useEditServiceForm } from '../../hooks/serviceHooks.ts';
import { useMonitoring } from '../../providers/MonitoringProvider.ts';
import { Plus, RefreshCw, Activity } from 'lucide-react';
import { AddServiceModal } from '../modals/AddServiceModal.tsx';
import { EditServiceModal } from '../modals/EditServiceModal.tsx';
import { ServiceCard } from '../cards/ServiceCard.tsx';
import { LoadingSpinner } from '../ui/LoadingSpinner.tsx';
import { ErrorDisplay } from '../ui/ErrorDisplay.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { useAddServiceForm } from '../../hooks/useAddServiceForm.ts';
import type { HostedService, CreateServiceDto } from '../../types/Service.ts';

interface ServicesListProps {
  darkMode?: boolean;
}

export function ServicesList({ darkMode = true }: ServicesListProps) {
  const { data: services, isLoading, error, refetch } = useServices();
  const { triggerHealthCheck } = useMonitoring();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<HostedService | null>(null);

  const {
    formData: addFormData,
    updateFormData: updateAddFormData,
    resetForm: resetAddForm,
    handleSubmit: handleAddSubmit,
    isLoading: isSubmittingAdd
  } = useAddServiceForm();

  const {
    formData: editFormData,
    updateFormData: updateEditFormData,
    resetForm: resetEditForm,
    handleSubmit: handleEditSubmit,
    isLoading: isSubmittingEdit,
    loadServiceData
  } = useEditServiceForm();

  const handleOpenAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    resetAddForm();
  };

  const handleOpenEditModal = (service: HostedService) => {
    setEditingService(service);
    loadServiceData(service);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingService(null);
    resetEditForm();
  };

  const handleAddModalSubmit = (data: CreateServiceDto) => {
    handleAddSubmit(data);
    setShowAddModal(false);
  };

  const handleEditModalSubmit = async (data: Partial<HostedService>) => {
    if (editingService) {
      await handleEditSubmit(editingService.id.toString(), data);
      setShowEditModal(false);
      setEditingService(null);
    }
  };

  const handleHealthCheck = (service: HostedService) => {
    console.log('Manual health check for service:', service.name);
    triggerHealthCheck();
  };

  const handleDeleteService = (service: HostedService) => {
    console.log('Delete service:', service.name);
    // TODO: Implement delete functionality
  };

  const handleManualRefresh = () => {
    refetch();
    triggerHealthCheck();
  };

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
    return (
      <>
        <EmptyState darkMode={darkMode} onAddService={handleOpenAddModal} />
        <AddServiceModal
          isOpen={showAddModal}
          onClose={handleCloseAddModal}
          onSubmit={handleAddModalSubmit}
          formData={addFormData}
          onFormDataChange={updateAddFormData}
          isLoading={isSubmittingAdd}
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
          <div className="flex items-center space-x-4 mt-1">
            <p className={`${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {services.length} service{services.length !== 1 ? 's' : ''} found
            </p>
            <div className={`flex items-center space-x-2 text-xs px-2 py-1 rounded-full ${
              darkMode 
                ? 'bg-blue-900/30 text-blue-400 border border-blue-600/30'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}>
              <Activity className="w-3 h-3" />
              <span>Auto health checks every 5 min</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleOpenAddModal}
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
            onClick={handleManualRefresh}
            className={`inline-flex items-center px-4 py-2 rounded-lg border font-medium transition-colors duration-200 ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh & Check Health
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
            onEdit={() => handleOpenEditModal(service)}
          />
        ))}
      </div>

      {/* Add Service Modal */}
      <AddServiceModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        onSubmit={handleAddModalSubmit}
        formData={addFormData}
        onFormDataChange={updateAddFormData}
        isLoading={isSubmittingAdd}
        darkMode={darkMode}
      />

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSubmit={handleEditModalSubmit}
          service={editingService}
          formData={editFormData}
          onFormDataChange={updateEditFormData}
          isLoading={isSubmittingEdit}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

export default ServicesList;