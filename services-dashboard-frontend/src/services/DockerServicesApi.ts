import { BaseApiClient } from './BaseApiClient';

export interface DockerService {
  containerId: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
    ip: string;
  }>;
  createdAt: string;
  serverId: number;
  serverName: string;
  serverHostAddress: string;
  order: number;
  customIconUrl?: string;
  customIconData?: string;
  statusColor: string;
  isRunning: boolean;
  displayImage: string;
  imageTag: string;
}

export interface DockerServiceArrangementDto {
  serverId: number;
  containerId: string;
  containerName: string;
  order: number;
}

class DockerServicesApi extends BaseApiClient {
  constructor() {
    super({ serviceName: 'DockerServices' });
    
    console.log('DockerServicesApi constructor called');
    console.log('this instanceof BaseApiClient:', this instanceof BaseApiClient);
    console.log('BaseApiClient prototype:', Object.getPrototypeOf(BaseApiClient.prototype));
    console.log('this.request is function:', typeof this.request === 'function');
  }

  async getAllDockerServices(): Promise<DockerService[]> {
    console.log('getAllDockerServices called');
    console.log('this context:', this);
    console.log('this.request type:', typeof this.request);
    console.log('this.constructor.name:', this.constructor.name);
    
    if (typeof this.request !== 'function') {
      console.error('this.request is not a function');
      console.error('Available properties on this:', Object.keys(this));
      console.error('Prototype properties:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
      throw new Error('request method is not available on this instance');
    }
    
    try {
      return await this.request<DockerService[]>('get', '/dockerservices');
    } catch (error) {
      console.error('Error in getAllDockerServices:', error);
      throw error;
    }
  }

  async updateArrangements(arrangements: DockerServiceArrangementDto[]): Promise<void> {
    return await this.request<void>('post', '/dockerservices/arrange', arrangements);
  }

  async startContainer(serverId: number, containerId: string): Promise<void> {
    return await this.request<void>('post', `/dockerservices/${serverId}/containers/${containerId}/start`);
  }

  async stopContainer(serverId: number, containerId: string): Promise<void> {
    return await this.request<void>('post', `/dockerservices/${serverId}/containers/${containerId}/stop`);
  }

  async restartContainer(serverId: number, containerId: string): Promise<void> {
    return await this.request<void>('post', `/dockerservices/${serverId}/containers/${containerId}/restart`);
  }

  async updateServiceIcon(
    serverId: number,
    containerId: string,
    iconUrl?: string,
    iconData?: string,
    removeBackground?: boolean,
    downloadFromUrl?: boolean
  ): Promise<void> {
    return await this.request<void>('put', '/dockerservices/icon', {
      serverId,
      containerId,
      iconUrl,
      iconData,
      removeBackground: removeBackground || false,
      downloadFromUrl: downloadFromUrl || false
    });
  }
}

// Create the instance
console.log('Creating dockerServicesApi instance...');
const dockerServicesApiInstance = new DockerServicesApi();
console.log('dockerServicesApi instance created:', dockerServicesApiInstance);

// Export wrapper functions instead of methods to ensure proper binding
export const dockerServicesApi = {
  getAllDockerServices: (): Promise<DockerService[]> => {
    console.log('Wrapper getAllDockerServices called');
    console.log('Instance:', dockerServicesApiInstance);
    console.log('Instance.request type:', typeof dockerServicesApiInstance.request);
    return dockerServicesApiInstance.getAllDockerServices();
  },
  
  updateArrangements: (arrangements: DockerServiceArrangementDto[]): Promise<void> => {
    return dockerServicesApiInstance.updateArrangements(arrangements);
  },
  
  startContainer: (serverId: number, containerId: string): Promise<void> => {
    return dockerServicesApiInstance.startContainer(serverId, containerId);
  },
  
  stopContainer: (serverId: number, containerId: string): Promise<void> => {
    return dockerServicesApiInstance.stopContainer(serverId, containerId);
  },
  
  restartContainer: (serverId: number, containerId: string): Promise<void> => {
    return dockerServicesApiInstance.restartContainer(serverId, containerId);
  },

  updateServiceIcon: (
    serverId: number,
    containerId: string,
    iconUrl?: string,
    iconData?: string,
    removeBackground?: boolean,
    downloadFromUrl?: boolean
  ): Promise<void> => {
    return dockerServicesApiInstance.updateServiceIcon(serverId, containerId, iconUrl, iconData, removeBackground, downloadFromUrl);
  }
};