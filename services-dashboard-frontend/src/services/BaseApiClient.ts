import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

interface ApiClientConfig {
  serviceName?: string;
  timeout?: number;
}

interface ErrorResponseData {
  message?: string;
  errors?: Record<string, string[]>;
}

class BaseApiClient {
  protected client: AxiosInstance;
  private serviceName: string;
  
  constructor(config: ApiClientConfig = {}) {
    this.serviceName = config.serviceName || 'API';
    
    this.client = axios.create({
      baseURL: this.getApiBaseUrl(),
      timeout: config.timeout || 120000, // Increased to 2 minutes for network scans
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: httpsAgent is not needed in browser environment
      // Browser automatically handles HTTPS certificates
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

    // 2. Check for VITE_API_URL (typically /api for proxy configuration)
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    // 3. Check for regular API base URL
    if (import.meta.env.VITE_API_BASE_URL) {
      const url = import.meta.env.VITE_API_BASE_URL;
      return url.endsWith('/api') ? url : `${url}/api`;
    }
    
    // 3. Auto-detect based on current location
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      const currentProtocol = window.location.protocol;
      const currentPort = this.getBackendPort();
      
      // If we're on an .orb.local domain, construct the backend URL
      if (currentHost.includes('.orb.local')) {
        const parts = currentHost.split('.');
        if (parts.length >= 3) {
          // Assume backend service is named 'servicesdashboard'
          return `${currentProtocol}//servicesdashboard.${parts.slice(1).join('.')}/api`;
        }
      }
      
      // For localhost, match the protocol (HTTP/HTTPS) and use appropriate port
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        return `${currentProtocol}//${currentHost}:${currentPort}/api`;
      }
    }
    
    // 4. Default fallback
    return this.getDefaultApiUrl();
  }

  private getBackendPort(): number {
    // Check environment variables for custom backend port
    if (import.meta.env.VITE_API_PORT) {
      return parseInt(import.meta.env.VITE_API_PORT);
    }

    // If frontend is running on HTTPS, assume backend is too
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      return isHttps ? 5051 : 5050; // Docker backend runs on port 5050
    }

    return 5050;
  }

  private getDefaultApiUrl(): string {
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const port = isHttps ? 5051 : 5050;
      const protocol = isHttps ? 'https' : 'http';
      return `${protocol}://localhost:${port}/api`;
    }
    return 'http://localhost:5050/api';
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config: any) => {
        if (import.meta.env.DEV) {
          console.log(`🚀 ${this.serviceName}: ${config.method?.toUpperCase()} ${config.url}`);
          console.log(`🔍 Full URL: ${config.baseURL}${config.url}`);
          if (config.timeout !== this.client.defaults.timeout) {
            console.log(`⏱️ Custom timeout: ${config.timeout}ms`);
          }
        }
        return config;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => {
        console.error(`${this.serviceName} Request Error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any) => {
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
    const responseData = error.response?.data as ErrorResponseData | undefined;
    const message = responseData?.message || error.message;
    
    console.error(`❌ ${this.serviceName} Error: ${status || 'Network'}`, message);

    // Log additional helpful information
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request Timeout - Operation took longer than expected');
      console.error('💡 This is common for network discovery operations');
      console.error('💡 The operation might still be running on the server');
      console.error('💡 Try scanning smaller network ranges or fewer ports');
    } else if (status === 500) {
      console.error('🔥 Server Error - Check backend logs for details');
      console.error('Response data:', error.response?.data);
    } else if (status === 403) {
      console.error('🚫 Forbidden - Check server authentication/authorization');
    } else if (status === 404) {
      console.error('🔍 Not Found - Check if endpoint exists and server is running');
    } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.error(`🌐 Network Error - Cannot connect to server at ${this.client.defaults.baseURL}`);
      console.error('💡 Troubleshooting tips:');
      console.error('   - Check if your backend server is running');
      console.error('   - Verify the correct port (HTTP: 5000, HTTPS: 5001)');
      console.error('   - Ensure CORS is properly configured on your backend');
    } else if (error.message.includes('ERR_SSL_PROTOCOL_ERROR')) {
      console.error('🔒 SSL Protocol Error - Check if HTTP/HTTPS mismatch');
      console.error('💡 Try switching between HTTP and HTTPS protocols');
    } else if (error.message.includes('ERR_CERT_AUTHORITY_INVALID')) {
      console.error('🔐 Certificate Error - Self-signed certificate detected');
      console.error('💡 This is normal for localhost HTTPS development');
      console.error('💡 Your browser should show a security warning you can bypass');
    }
  }

  // Generic request method with type safety and custom timeout support
  async request<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    customTimeout?: number
  ): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        method,
        url,
        data,
        params,
      };
      
      // Apply custom timeout if provided
      if (customTimeout) {
        config.timeout = customTimeout;
      }
      
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      console.error(`Request failed: ${method.toUpperCase()} ${url}`, error);
      throw error;
    }
  }
}

export { BaseApiClient };
export type { ApiClientConfig };