import axios, { type AxiosInstance, type AxiosError } from 'axios';

export interface ApiClientConfig {
  serviceName?: string;
  timeout?: number;
  retries?: number;
}

class BaseApiClient {
  protected client: AxiosInstance;
  private serviceName: string;
  
  constructor(config: ApiClientConfig = {}) {
    this.serviceName = config.serviceName || 'API';
    
    this.client = axios.create({
      baseURL: this.getApiBaseUrl(),
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private getApiBaseUrl(): string {
    // Dynamic URL detection for OrbStack/Docker environments
    
    // 1. Check for external API URL (for OrbStack browser requests)
    if (import.meta.env.VITE_EXTERNAL_API_BASE_URL) {
      const url = import.meta.env.VITE_EXTERNAL_API_BASE_URL;
      return url.endsWith('/api') ? url : `${url}/api`;
    }
    
    // 2. Check for regular API base URL
    if (import.meta.env.VITE_API_BASE_URL) {
      const url = import.meta.env.VITE_API_BASE_URL;
      return url.endsWith('/api') ? url : `${url}/api`;
    }
    
    // 3. Auto-detect based on current location
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      
      // If we're on an .orb.local domain, construct the backend URL
      if (currentHost.includes('.orb.local')) {
        const parts = currentHost.split('.');
        if (parts.length >= 3) {
          // Assume backend service is named 'servicesdashboard'
          return `http://servicesdashboard.${parts.slice(1).join('.')}/api`;
        }
      }
    }
    
    // 4. Default fallback
    return 'http://localhost:5000/api';
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (import.meta.env.DEV) {
          console.log(`🚀 ${this.serviceName}: ${config.method?.toUpperCase()} ${config.url}`);
          console.log(`🔍 Full URL: ${config.baseURL}${config.url}`);
        }
        return config;
      },
      (error) => {
        console.error(`${this.serviceName} Request Error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (import.meta.env.DEV) {
          console.log(`✅ ${this.serviceName}: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError): void {
    const status = error.response?.status;
    const message = (error.response?.data as any)?.message || error.message;
    
    console.error(`❌ ${this.serviceName} Error: ${status || 'Network'}`, message);

    // Log additional helpful information
    if (status === 500) {
      console.error('🔥 Server Error - Check backend logs for details');
      console.error('Response data:', error.response?.data);
    } else if (status === 403) {
      console.error('🚫 Forbidden - Check server authentication/authorization');
    } else if (status === 404) {
      console.error('🔍 Not Found - Check if endpoint exists and server is running');
    } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.error(`🌐 Network Error - Cannot connect to server at ${this.client.defaults.baseURL}`);
    } else if (error.message.includes('ERR_SSL_PROTOCOL_ERROR')) {
      console.error('🔒 SSL Protocol Error - Check if HTTP/HTTPS mismatch');
    }
  }

  // Generic request method with type safety
  protected async request<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url,
        data,
        params,
      });
      return response.data;
    } catch (error) {
      console.error(`Request failed: ${method.toUpperCase()} ${url}`, error);
      throw error;
    }
  }
}

export { BaseApiClient };