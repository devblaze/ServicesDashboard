import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { queryKeys } from "../lib/query-keys";

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all,  // Use it as an array, not a function
    queryFn: () => apiClient.getServices()
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

export function useCheckServiceHealth() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.checkServiceHealth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    }
  });
}