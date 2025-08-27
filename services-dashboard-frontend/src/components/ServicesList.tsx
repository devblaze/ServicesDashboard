import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/servicesApi';
import type {CreateServiceDto} from '../types/Service.ts';

interface ServiceFormData extends CreateServiceDto {
  hostAddress?: string;
  serviceType?: 'docker' | 'external';
  banner?: string;
}

const initialFormData: ServiceFormData = {
  name: '',
  description: '',
  dockerImage: '',
  port: undefined,
  environment: undefined,
  hostAddress: '',
  serviceType: undefined,
  banner: ''
};

export const useAddServiceForm = () => {
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const queryClient = useQueryClient();

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const updateFormData = (data: Partial<ServiceFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const addServiceMutation = useMutation({
    mutationFn: (serviceData: CreateServiceDto) => apiClient.createService(serviceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to add service:', error);
    }
  });

  const handleSubmit = (serviceData: CreateServiceDto) => {
    addServiceMutation.mutate(serviceData);
  };

  return {
    formData,
    updateFormData,
    resetForm,
    handleSubmit,
    isLoading: addServiceMutation.isPending,
    error: addServiceMutation.error,
    isSuccess: addServiceMutation.isSuccess
  };
};