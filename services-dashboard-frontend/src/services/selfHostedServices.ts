import axios from 'axios';
import type {
  SelfHostedService,
  SelfHostedServiceFilters,
  PortConflictResult,
  PortAllocation
} from '../types/SelfHostedService';

const baseURL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? '/api' : '/api'
);

const client = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SelfHostedServicesResponse {
  services: SelfHostedService[];
  totalCount: number;
  success: boolean;
  errorMessage?: string;
}

export interface PortSuggestionRequest {
  serverId: number;
  count: number;
  rangeStart?: number;
  rangeEnd?: number;
}

export interface PortSuggestionResponse {
  suggestedPorts: number[];
}

export interface DetectConflictsRequest {
  serverId: number;
  ports: number[];
}

// Get all self-hosted services (Docker + Deployments)
export const getAllSelfHostedServices = async (
  filters?: SelfHostedServiceFilters
): Promise<SelfHostedServicesResponse> => {
  const params = new URLSearchParams();

  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.serverId) params.append('serverId', filters.serverId.toString());
  if (filters?.repositoryId) params.append('repositoryId', filters.repositoryId.toString());
  if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);

  const queryString = params.toString();
  const url = `/selfhostedservices${queryString ? `?${queryString}` : ''}`;

  const response = await client.get<SelfHostedServicesResponse>(url);
  return response.data;
};

// Port Management APIs
export const detectPortConflicts = async (
  request: DetectConflictsRequest
): Promise<PortConflictResult> => {
  const response = await client.post<PortConflictResult>(
    '/portmanagement/detect-conflicts',
    request
  );
  return response.data;
};

export const suggestAvailablePorts = async (
  request: PortSuggestionRequest
): Promise<PortSuggestionResponse> => {
  const response = await client.post<PortSuggestionResponse>(
    '/portmanagement/suggest-ports',
    request
  );
  return response.data;
};

export const getAllocatedPorts = async (
  serverId: number
): Promise<PortAllocation[]> => {
  const response = await client.get<PortAllocation[]>(
    `/portmanagement/allocated-ports/${serverId}`
  );
  return response.data;
};
