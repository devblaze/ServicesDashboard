import * as signalR from '@microsoft/signalr';

export type ScanNotificationType = 'started' | 'progress' | 'completed' | 'error' | 'hostDiscovered' | 'serviceDiscovered';

export interface ScanNotification {
  scanId: string;
  type: ScanNotificationType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private notificationCallbacks: ((notification: ScanNotification) => void)[] = [];
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  constructor() {
    this.initializeConnection();
  }

  private getHubUrl(): string {
    // Get the base URL from environment or default
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';
    return `${baseUrl}/hubs/discovery`;
  }

  private async initializeConnection() {
    try {
      this.connectionState = 'connecting';

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.getHubUrl(), {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Register event handlers
      this.registerEventHandlers();

      // Start the connection
      await this.hubConnection.start();
      this.connectionState = 'connected';
      console.log('SignalR connected successfully');
    } catch (error) {
      console.error('Error initializing SignalR connection:', error);
      this.connectionState = 'error';
      // Retry after 5 seconds
      setTimeout(() => this.initializeConnection(), 5000);
    }
  }

  private registerEventHandlers() {
    if (!this.hubConnection) return;

    // Handle scan started
    this.hubConnection.on('ReceiveScanStarted', (scanId: string, target: string, scanType: string) => {
      console.log(`Scan started: ${scanId} for ${target} (${scanType})`);
      this.notifyCallbacks({
        scanId,
        type: 'started',
        data: { target, scanType }
      });
    });

    // Handle scan progress
    this.hubConnection.on('ReceiveScanProgress', (scanId: string, progress: number, message: string) => {
      console.log(`Scan progress: ${scanId} - ${progress}% - ${message}`);
      this.notifyCallbacks({
        scanId,
        type: 'progress',
        data: { progress, message }
      });
    });

    // Handle scan completed
    this.hubConnection.on('ReceiveScanCompleted', (scanId: string, totalHosts: number, totalServices: number) => {
      console.log(`Scan completed: ${scanId} - Found ${totalHosts} hosts and ${totalServices} services`);
      this.notifyCallbacks({
        scanId,
        type: 'completed',
        data: { totalHosts, totalServices }
      });
    });

    // Handle scan error
    this.hubConnection.on('ReceiveScanError', (scanId: string, error: string) => {
      console.error(`Scan error: ${scanId} - ${error}`);
      this.notifyCallbacks({
        scanId,
        type: 'error',
        data: { error }
      });
    });

    // Handle host discovered
    this.hubConnection.on('ReceiveHostDiscovered', (scanId: string, host: string, openPorts: number) => {
      console.log(`Host discovered: ${host} with ${openPorts} open ports`);
      this.notifyCallbacks({
        scanId,
        type: 'hostDiscovered',
        data: { host, openPorts }
      });
    });

    // Handle service discovered
    this.hubConnection.on('ReceiveServiceDiscovered', (scanId: string, host: string, port: number, serviceName: string) => {
      console.log(`Service discovered: ${serviceName} on ${host}:${port}`);
      this.notifyCallbacks({
        scanId,
        type: 'serviceDiscovered',
        data: { host, port, serviceName }
      });
    });

    // Handle reconnecting
    this.hubConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      this.connectionState = 'connecting';
    });

    // Handle reconnected
    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId);
      this.connectionState = 'connected';
    });

    // Handle close
    this.hubConnection.onclose((error) => {
      console.log('SignalR connection closed', error);
      this.connectionState = 'disconnected';
      // Try to reconnect after 5 seconds
      setTimeout(() => this.initializeConnection(), 5000);
    });
  }

  private notifyCallbacks(notification: ScanNotification) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  // Public methods
  public async subscribeToScan(scanId: string): Promise<void> {
    if (this.hubConnection && this.connectionState === 'connected') {
      try {
        await this.hubConnection.invoke('SubscribeToScan', scanId);
        console.log(`Subscribed to scan ${scanId}`);
      } catch (error) {
        console.error(`Error subscribing to scan ${scanId}:`, error);
      }
    }
  }

  public async unsubscribeFromScan(scanId: string): Promise<void> {
    if (this.hubConnection && this.connectionState === 'connected') {
      try {
        await this.hubConnection.invoke('UnsubscribeFromScan', scanId);
        console.log(`Unsubscribed from scan ${scanId}`);
      } catch (error) {
        console.error(`Error unsubscribing from scan ${scanId}:`, error);
      }
    }
  }

  public onNotification(callback: (notification: ScanNotification) => void): () => void {
    this.notificationCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  public getConnectionState(): string {
    return this.connectionState;
  }

  public async disconnect(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionState = 'disconnected';
    }
  }
}

// Export singleton instance
export const signalRService = new SignalRService();