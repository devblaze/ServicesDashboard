interface DockerService {
  containerId: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
    ip?: string;
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

export const mockDockerServices: DockerService[] = [
  {
    containerId: 'a1b2c3d4e5f6',
    name: 'servicesdashboard-backend',
    image: 'servicesdashboard-backend:latest',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 5050, publicPort: 5050, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
    serverId: 1,
    serverName: 'Production Server 1',
    serverHostAddress: 'prod-1.example.com',
    order: 0,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'servicesdashboard-backend',
    imageTag: 'latest',
  },
  {
    containerId: 'b2c3d4e5f6g7',
    name: 'servicesdashboard-frontend',
    image: 'servicesdashboard-frontend:latest',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 5173, publicPort: 5173, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
    serverId: 1,
    serverName: 'Production Server 1',
    serverHostAddress: 'prod-1.example.com',
    order: 1,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'servicesdashboard-frontend',
    imageTag: 'latest',
  },
  {
    containerId: 'c3d4e5f6g7h8',
    name: 'postgres-main',
    image: 'postgres:16',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 5432, publicPort: 5432, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60000).toISOString(),
    serverId: 1,
    serverName: 'Production Server 1',
    serverHostAddress: 'prod-1.example.com',
    order: 2,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'postgres',
    imageTag: '16',
  },
  {
    containerId: 'd4e5f6g7h8i9',
    name: 'nginx-proxy',
    image: 'nginx:alpine',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 80, publicPort: 80, type: 'tcp', ip: '0.0.0.0' },
      { privatePort: 443, publicPort: 443, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60000).toISOString(),
    serverId: 1,
    serverName: 'Production Server 1',
    serverHostAddress: 'prod-1.example.com',
    order: 3,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'nginx',
    imageTag: 'alpine',
  },
  {
    containerId: 'e5f6g7h8i9j0',
    name: 'redis-cache',
    image: 'redis:7-alpine',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 6379, publicPort: 6379, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60000).toISOString(),
    serverId: 2,
    serverName: 'Cache Server',
    serverHostAddress: 'cache-1.example.com',
    order: 4,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'redis',
    imageTag: '7-alpine',
  },
  {
    containerId: 'f6g7h8i9j0k1',
    name: 'mongodb-primary',
    image: 'mongo:7',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 27017, publicPort: 27017, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60000).toISOString(),
    serverId: 2,
    serverName: 'Cache Server',
    serverHostAddress: 'cache-1.example.com',
    order: 5,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'mongo',
    imageTag: '7',
  },
  {
    containerId: 'g7h8i9j0k1l2',
    name: 'rabbitmq-broker',
    image: 'rabbitmq:3-management',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 5672, publicPort: 5672, type: 'tcp', ip: '0.0.0.0' },
      { privatePort: 15672, publicPort: 15672, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60000).toISOString(),
    serverId: 3,
    serverName: 'Message Queue Server',
    serverHostAddress: 'mq-1.example.com',
    order: 6,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'rabbitmq',
    imageTag: '3-management',
  },
  {
    containerId: 'h8i9j0k1l2m3',
    name: 'elasticsearch-node1',
    image: 'elasticsearch:8.11.0',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 9200, publicPort: 9200, type: 'tcp', ip: '0.0.0.0' },
      { privatePort: 9300, publicPort: 9300, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 70 * 24 * 60 * 60000).toISOString(),
    serverId: 3,
    serverName: 'Message Queue Server',
    serverHostAddress: 'mq-1.example.com',
    order: 7,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'elasticsearch',
    imageTag: '8.11.0',
  },
  {
    containerId: 'i9j0k1l2m3n4',
    name: 'grafana-monitoring',
    image: 'grafana/grafana:latest',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 3000, publicPort: 3000, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60000).toISOString(),
    serverId: 4,
    serverName: 'Monitoring Server',
    serverHostAddress: 'monitor-1.example.com',
    order: 8,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'grafana/grafana',
    imageTag: 'latest',
  },
  {
    containerId: 'j0k1l2m3n4o5',
    name: 'prometheus-metrics',
    image: 'prometheus/prometheus:latest',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 9090, publicPort: 9090, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60000).toISOString(),
    serverId: 4,
    serverName: 'Monitoring Server',
    serverHostAddress: 'monitor-1.example.com',
    order: 9,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'prometheus/prometheus',
    imageTag: 'latest',
  },
  {
    containerId: 'k1l2m3n4o5p6',
    name: 'traefik-lb',
    image: 'traefik:v2.10',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 80, publicPort: 8080, type: 'tcp', ip: '0.0.0.0' },
      { privatePort: 8080, publicPort: 8081, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60000).toISOString(),
    serverId: 5,
    serverName: 'Load Balancer',
    serverHostAddress: 'lb-1.example.com',
    order: 10,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'traefik',
    imageTag: 'v2.10',
  },
  {
    containerId: 'l2m3n4o5p6q7',
    name: 'portainer-mgmt',
    image: 'portainer/portainer-ce:latest',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 9443, publicPort: 9443, type: 'tcp', ip: '0.0.0.0' },
      { privatePort: 8000, publicPort: 8000, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 65 * 24 * 60 * 60000).toISOString(),
    serverId: 5,
    serverName: 'Load Balancer',
    serverHostAddress: 'lb-1.example.com',
    order: 11,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'portainer/portainer-ce',
    imageTag: 'latest',
  },
  {
    containerId: 'm3n4o5p6q7r8',
    name: 'jenkins-ci',
    image: 'jenkins/jenkins:lts',
    status: 'running',
    state: 'running',
    ports: [
      { privatePort: 8080, publicPort: 8082, type: 'tcp', ip: '0.0.0.0' },
      { privatePort: 50000, publicPort: 50000, type: 'tcp', ip: '0.0.0.0' }
    ],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60000).toISOString(),
    serverId: 5,
    serverName: 'Load Balancer',
    serverHostAddress: 'lb-1.example.com',
    order: 12,
    statusColor: 'green',
    isRunning: true,
    displayImage: 'jenkins/jenkins',
    imageTag: 'lts',
  },
  {
    containerId: 'n4o5p6q7r8s9',
    name: 'minio-storage',
    image: 'minio/minio:latest',
    status: 'exited',
    state: 'exited',
    ports: [
      { privatePort: 9000, type: 'tcp' },
      { privatePort: 9001, type: 'tcp' }
    ],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60000).toISOString(),
    serverId: 2,
    serverName: 'Cache Server',
    serverHostAddress: 'cache-1.example.com',
    order: 13,
    statusColor: 'red',
    isRunning: false,
    displayImage: 'minio/minio',
    imageTag: 'latest',
  },
  {
    containerId: 'o5p6q7r8s9t0',
    name: 'sonarqube-analysis',
    image: 'sonarqube:community',
    status: 'exited',
    state: 'exited',
    ports: [
      { privatePort: 9000, type: 'tcp' }
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60000).toISOString(),
    serverId: 3,
    serverName: 'Message Queue Server',
    serverHostAddress: 'mq-1.example.com',
    order: 14,
    statusColor: 'red',
    isRunning: false,
    displayImage: 'sonarqube',
    imageTag: 'community',
  },
];
