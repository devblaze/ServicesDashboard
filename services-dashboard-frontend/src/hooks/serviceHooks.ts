import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/servicesApi';
import { queryKeys } from '../lib/query-keys';
import type { HostedService, CreateServiceDto } from '../types/Service';

interface EditFormData {
  name: string;
  description: string;
  port?: number;
  dockerImage?: string;
  serviceUrl?: string;
  containerId?: string;
  serverId?: number;
  hostAddress?: string;
  isDockerContainer: boolean;
}

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all,
    queryFn: () => apiClient.getServices()
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    queryFn: () => apiClient.getService(id),
    enabled: !!id
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceDto) => apiClient.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    }
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HostedService> }) =>
      apiClient.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    }
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    }
  });
}

export function useHealthCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.checkServiceHealth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    }
  });
}

export function useEditServiceForm() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    description: '',
    isDockerContainer: false,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HostedService> }) => {
      return apiClient.updateService(id, data);
    },
    onSuccess: (updatedService) => {
      // Update the services list cache
      queryClient.setQueryData(queryKeys.services.all, (oldServices: HostedService[] | undefined) => {
        if (!oldServices) return [updatedService];
        return oldServices.map(service =>
          service.id === updatedService.id ? updatedService : service
        );
      });

      // Update individual service cache - convert id to string
      queryClient.setQueryData(
        queryKeys.services.detail(updatedService.id.toString()), 
        updatedService
      );

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
    onError: (error) => {
      console.error('Failed to update service:', error);
    }
  });

  const updateFormData = (data: Partial<EditFormData>) => {
    setFormData((prev: EditFormData) => ({ ...prev, ...data }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isDockerContainer: false,
    });
  };

  const loadServiceData = (service: HostedService) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      port: service.port,
      dockerImage: service.dockerImage || '',
      serviceUrl: service.healthCheckUrl || '',
      containerId: '', // This might not be available in HostedService
      serverId: undefined, // This might not be available in HostedService
      hostAddress: service.hostAddress || '',
      // Safe access to isDockerContainer property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      isDockerContainer: (service as any).isDockerContainer || false,
    });
  };

  const handleSubmit = async (id: string, data: Partial<HostedService>) => {
    return updateMutation.mutateAsync({ id, data });
  };

  return {
    formData,
    updateFormData,
    resetForm,
    loadServiceData,
    handleSubmit,
    isLoading: updateMutation.isPending,
    error: updateMutation.error
  };
}