import type { LogAnalysisResult } from '../services/serverManagementApi';

// Generate realistic server logs based on server ID
export const generateMockServerLogs = (serverId: number, lines: number = 100): string => {
  const logTemplates = {
    1: [
      // Production Server 1 - Mix of normal operations with some concerns
      '[INFO] 2024-01-15 10:23:45 systemd[1]: Started PostgreSQL database server.',
      '[INFO] 2024-01-15 10:23:47 postgres[1234]: database system is ready to accept connections',
      '[INFO] 2024-01-15 10:25:12 nginx[2345]: 192.168.1.50 - - "GET /api/health HTTP/1.1" 200 45',
      '[WARN] 2024-01-15 10:30:22 kernel: CPU usage high on core 2: 85%',
      '[INFO] 2024-01-15 10:35:01 systemd[1]: Started Daily backup service.',
      '[INFO] 2024-01-15 10:35:15 backup[3456]: Starting database backup to /backups/prod_db_20240115.sql.gz',
      '[INFO] 2024-01-15 10:38:42 backup[3456]: Backup completed successfully: 2.3 GB',
      '[WARN] 2024-01-15 10:45:00 disk-monitor: Disk usage on /var: 78% (warning threshold: 80%)',
      '[INFO] 2024-01-15 11:00:00 cron[1]: (root) CMD (/usr/bin/health-check)',
      '[INFO] 2024-01-15 11:15:23 docker[4567]: Container frontend-app restarted successfully',
      '[ERROR] 2024-01-15 11:20:15 nginx[2345]: upstream timed out (110: Connection timed out) while connecting to upstream',
      '[INFO] 2024-01-15 11:20:16 nginx[2345]: upstream server recovered, resuming normal operation',
      '[INFO] 2024-01-15 11:30:00 systemd[1]: Started Update package database.',
      '[INFO] 2024-01-15 11:45:12 sshd[5678]: Accepted publickey for admin from 192.168.1.200 port 52341',
      '[WARN] 2024-01-15 12:00:00 system: Load average: 4.52 (high)',
      '[INFO] 2024-01-15 12:15:00 logrotate[6789]: /var/log/syslog rotated',
    ],
    2: [
      // Cache Server - Redis and MongoDB logs
      '[INFO] 2024-01-15 10:20:00 redis[1234]: Server initialized',
      '[INFO] 2024-01-15 10:20:01 redis[1234]: Ready to accept connections on port 6379',
      '[INFO] 2024-01-15 10:25:30 redis[1234]: 1000 changes in 60 seconds. Saving...',
      '[INFO] 2024-01-15 10:25:32 redis[1234]: Background saving started by pid 2345',
      '[INFO] 2024-01-15 10:25:35 redis[1234]: Background saving completed successfully',
      '[INFO] 2024-01-15 10:30:00 mongod[3456]: [initandlisten] MongoDB starting : port=27017',
      '[INFO] 2024-01-15 10:30:05 mongod[3456]: [initandlisten] waiting for connections',
      '[WARN] 2024-01-15 10:45:00 redis[1234]: Memory usage: 1.8GB (75% of max)',
      '[INFO] 2024-01-15 11:00:00 redis[1234]: 50 clients connected',
      '[WARN] 2024-01-15 11:15:00 mongod[3456]: Slow query detected: 2500ms on collection users',
      '[INFO] 2024-01-15 11:30:00 redis[1234]: DB saved on disk',
      '[ERROR] 2024-01-15 11:45:00 mongod[3456]: Connection refused from 192.168.1.250 (authentication failed)',
      '[INFO] 2024-01-15 12:00:00 system: CPU temperature: 65°C',
      '[INFO] 2024-01-15 12:15:00 redis[1234]: Evicted 500 keys due to maxmemory policy',
      '[WARN] 2024-01-15 12:30:00 system: High memory usage detected: 7.2GB/8GB (90%)',
    ],
    3: [
      // Message Queue Server - RabbitMQ and Elasticsearch
      '[INFO] 2024-01-15 10:15:00 rabbitmq[1234]: Server startup complete; 0 plugins started.',
      '[INFO] 2024-01-15 10:15:05 rabbitmq[1234]: Management plugin started. Port: 15672',
      '[INFO] 2024-01-15 10:20:00 elasticsearch[2345]: [node-1] started',
      '[INFO] 2024-01-15 10:20:10 elasticsearch[2345]: Cluster health status changed from [YELLOW] to [GREEN]',
      '[INFO] 2024-01-15 10:30:00 rabbitmq[1234]: accepting AMQP connection from 192.168.1.100',
      '[WARN] 2024-01-15 10:45:00 rabbitmq[1234]: Queue "webhooks.dlq" has 1250 messages',
      '[INFO] 2024-01-15 11:00:00 elasticsearch[2345]: [node-1] indices [logs-2024.01.15] created',
      '[INFO] 2024-01-15 11:15:00 rabbitmq[1234]: Message published to exchange "events" routing_key "user.signup"',
      '[ERROR] 2024-01-15 11:30:00 rabbitmq[1234]: Consumer crash detected on queue "notifications"',
      '[INFO] 2024-01-15 11:30:15 rabbitmq[1234]: Consumer reconnected to queue "notifications"',
      '[WARN] 2024-01-15 11:45:00 elasticsearch[2345]: GC overhead detected: Young Gen GC took 850ms',
      '[INFO] 2024-01-15 12:00:00 elasticsearch[2345]: Indexing rate: 500 docs/sec',
      '[INFO] 2024-01-15 12:15:00 rabbitmq[1234]: Virtual host "/" has 25 connections',
      '[WARN] 2024-01-15 12:30:00 rabbitmq[1234]: Disk free space below threshold: 4.5GB remaining',
    ],
    4: [
      // Monitoring Server - Grafana and Prometheus
      '[INFO] 2024-01-15 10:10:00 grafana[1234]: Starting Grafana server',
      '[INFO] 2024-01-15 10:10:05 grafana[1234]: HTTP Server listening on port 3000',
      '[INFO] 2024-01-15 10:12:00 prometheus[2345]: Starting Prometheus Server',
      '[INFO] 2024-01-15 10:12:05 prometheus[2345]: Server is ready to receive web requests',
      '[INFO] 2024-01-15 10:15:00 prometheus[2345]: Scrape target up: prod-server-1:9100',
      '[INFO] 2024-01-15 10:15:01 prometheus[2345]: Scrape target up: cache-server:9100',
      '[INFO] 2024-01-15 10:30:00 grafana[1234]: User admin logged in from 192.168.1.200',
      '[INFO] 2024-01-15 10:45:00 prometheus[2345]: TSDB retention: deleted 50000 samples older than 15 days',
      '[WARN] 2024-01-15 11:00:00 grafana[1234]: Dashboard query took 5000ms (threshold: 3000ms)',
      '[INFO] 2024-01-15 11:15:00 prometheus[2345]: Active time series: 125000',
      '[INFO] 2024-01-15 11:30:00 alertmanager[3456]: Alert fired: HighCPUUsage on prod-server-1',
      '[INFO] 2024-01-15 11:30:30 alertmanager[3456]: Notification sent via email to ops@example.com',
      '[INFO] 2024-01-15 11:45:00 grafana[1234]: Created snapshot: production-dashboard-20240115',
      '[INFO] 2024-01-15 12:00:00 prometheus[2345]: Compaction completed in 2.5s',
      '[INFO] 2024-01-15 12:15:00 grafana[1234]: 15 active user sessions',
    ],
    5: [
      // Load Balancer - Traefik with warnings
      '[INFO] 2024-01-15 10:00:00 traefik[1234]: Starting Traefik version 2.10',
      '[INFO] 2024-01-15 10:00:05 traefik[1234]: Configuration loaded from /etc/traefik/traefik.yml',
      '[INFO] 2024-01-15 10:00:10 traefik[1234]: Server listening on :80',
      '[INFO] 2024-01-15 10:00:11 traefik[1234]: Server listening on :443',
      '[INFO] 2024-01-15 10:15:00 traefik[1234]: Router "api-router" created',
      '[WARN] 2024-01-15 10:30:00 traefik[1234]: High request rate detected: 1500 req/s',
      '[ERROR] 2024-01-15 10:35:00 traefik[1234]: Backend "backend-api" health check failed (timeout)',
      '[WARN] 2024-01-15 10:35:15 traefik[1234]: Backend "backend-api" marked as down',
      '[INFO] 2024-01-15 10:36:00 traefik[1234]: Backend "backend-api" health check succeeded',
      '[INFO] 2024-01-15 10:36:01 traefik[1234]: Backend "backend-api" marked as up',
      '[WARN] 2024-01-15 11:00:00 system: SSL certificate for api.example.com expires in 25 days',
      '[ERROR] 2024-01-15 11:15:00 traefik[1234]: Rate limit exceeded for client 203.0.113.50',
      '[INFO] 2024-01-15 11:30:00 traefik[1234]: Access log: 203.0.113.100 "GET /api/users" 200 125ms',
      '[WARN] 2024-01-15 11:45:00 traefik[1234]: Retry attempts exhausted for backend "analytics-service"',
      '[ERROR] 2024-01-15 12:00:00 traefik[1234]: Circuit breaker opened for "mobile-api" (5 consecutive failures)',
      '[WARN] 2024-01-15 12:15:00 system: CPU usage sustained above 80% for 15 minutes',
      '[INFO] 2024-01-15 12:30:00 traefik[1234]: Active connections: 450',
    ],
  };

  const serverLogs = logTemplates[serverId as keyof typeof logTemplates] || logTemplates[1];

  // Generate the requested number of log lines
  const numLines = Math.min(lines, 100);
  const logs: string[] = [];

  // Repeat and vary the log templates to fill the requested lines
  for (let i = 0; i < numLines; i++) {
    const logIndex = i % serverLogs.length;
    const log = serverLogs[logIndex];

    // Add some time variation
    const now = new Date();
    const minutesAgo = numLines - i;
    const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
    const timeStr = timestamp.toISOString().replace('T', ' ').substring(0, 19);

    // Replace the timestamp in the log
    const updatedLog = log.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/, timeStr);
    logs.push(updatedLog);
  }

  return logs.join('\n');
};

// Generate AI-powered log analysis based on server
export const generateMockLogAnalysis = (serverId: number): LogAnalysisResult => {
  const analysisTemplates: Record<number, LogAnalysisResult> = {
    1: {
      summary: 'Production Server 1 is operating normally with minor performance concerns. Detected occasional upstream timeouts and elevated CPU usage during peak hours. Backup operations are completing successfully.',
      issues: [
        {
          type: 'Performance',
          severity: 'Medium',
          description: 'Upstream connection timeout detected',
          logLine: '[ERROR] nginx[2345]: upstream timed out (110: Connection timed out) while connecting to upstream',
          lineNumber: 11,
        },
        {
          type: 'Performance',
          severity: 'Low',
          description: 'High CPU usage on core 2',
          logLine: '[WARN] kernel: CPU usage high on core 2: 85%',
          lineNumber: 4,
        },
        {
          type: 'Storage',
          severity: 'Low',
          description: 'Disk usage approaching warning threshold',
          logLine: '[WARN] disk-monitor: Disk usage on /var: 78% (warning threshold: 80%)',
          lineNumber: 8,
        },
      ],
      recommendations: [
        'Consider implementing connection pooling to reduce upstream timeouts',
        'Monitor CPU usage patterns and consider load balancing if sustained high usage continues',
        'Schedule disk cleanup or expand /var partition - currently at 78% capacity',
        'Nginx upstream timeout errors recovered quickly - monitor for patterns',
        'Database backups completing successfully - no action needed',
        'Consider implementing caching layer to reduce load on upstream services',
      ],
      confidence: 0.89,
      analyzedAt: new Date().toISOString(),
    },
    2: {
      summary: 'Cache Server showing signs of memory pressure. Redis is approaching maximum memory allocation and MongoDB detected a slow query. Memory usage at 90% requires immediate attention.',
      issues: [
        {
          type: 'Memory',
          severity: 'High',
          description: 'Critical memory usage detected',
          logLine: '[WARN] system: High memory usage detected: 7.2GB/8GB (90%)',
          lineNumber: 15,
        },
        {
          type: 'Memory',
          severity: 'Medium',
          description: 'Redis memory usage at 75% of maximum',
          logLine: '[WARN] redis[1234]: Memory usage: 1.8GB (75% of max)',
          lineNumber: 8,
        },
        {
          type: 'Performance',
          severity: 'Medium',
          description: 'MongoDB slow query detected',
          logLine: '[WARN] mongod[3456]: Slow query detected: 2500ms on collection users',
          lineNumber: 10,
        },
        {
          type: 'Security',
          severity: 'Low',
          description: 'Failed authentication attempt from external IP',
          logLine: '[ERROR] mongod[3456]: Connection refused from 192.168.1.250 (authentication failed)',
          lineNumber: 12,
        },
      ],
      recommendations: [
        'URGENT: Increase server RAM or optimize memory usage - currently at 90%',
        'Configure Redis maxmemory-policy to handle memory limits more gracefully',
        'Review and optimize MongoDB query on users collection (2500ms is excessive)',
        'Consider implementing Redis key expiration policies to reduce memory footprint',
        'Add index to MongoDB users collection to improve query performance',
        'Monitor failed authentication attempts from 192.168.1.250 - potential security concern',
        'Redis is actively evicting keys - review eviction policy and key TTLs',
      ],
      confidence: 0.92,
      analyzedAt: new Date().toISOString(),
    },
    3: {
      summary: 'Message Queue Server is functioning but shows concerning trends. Dead letter queue accumulation and low disk space require attention. Elasticsearch cluster health is good.',
      issues: [
        {
          type: 'Queue',
          severity: 'High',
          description: 'Dead letter queue accumulation',
          logLine: '[WARN] rabbitmq[1234]: Queue "webhooks.dlq" has 1250 messages',
          lineNumber: 6,
        },
        {
          type: 'Storage',
          severity: 'High',
          description: 'Low disk space warning',
          logLine: '[WARN] rabbitmq[1234]: Disk free space below threshold: 4.5GB remaining',
          lineNumber: 14,
        },
        {
          type: 'Application',
          severity: 'Medium',
          description: 'Consumer crash and recovery',
          logLine: '[ERROR] rabbitmq[1234]: Consumer crash detected on queue "notifications"',
          lineNumber: 9,
        },
        {
          type: 'Performance',
          severity: 'Low',
          description: 'Elasticsearch GC overhead detected',
          logLine: '[WARN] elasticsearch[2345]: GC overhead detected: Young Gen GC took 850ms',
          lineNumber: 11,
        },
      ],
      recommendations: [
        'CRITICAL: Investigate and resolve dead letter queue messages (1250 messages in webhooks.dlq)',
        'Free up disk space immediately - only 4.5GB remaining',
        'Review webhook processing logic to prevent messages from entering dead letter queue',
        'Investigate cause of consumer crashes on notifications queue',
        'Consider implementing automated DLQ processing or alerting',
        'Tune Elasticsearch JVM heap settings to reduce GC overhead',
        'Set up disk space monitoring and automated cleanup policies',
        'Review RabbitMQ message TTL policies to prevent queue buildup',
      ],
      confidence: 0.87,
      analyzedAt: new Date().toISOString(),
    },
    4: {
      summary: 'Monitoring Server operating normally with excellent uptime. Minor performance issue with slow dashboard query. All scrape targets are healthy and alerting is functioning correctly.',
      issues: [
        {
          type: 'Performance',
          severity: 'Low',
          description: 'Slow Grafana dashboard query',
          logLine: '[WARN] grafana[1234]: Dashboard query took 5000ms (threshold: 3000ms)',
          lineNumber: 9,
        },
      ],
      recommendations: [
        'Optimize slow Grafana dashboard query (5000ms) - consider adding query caching',
        'Review Prometheus TSDB retention policy - currently managing 125,000 time series',
        'Grafana dashboard queries should complete under 3000ms - optimize panel queries',
        'Consider implementing query result caching for frequently accessed dashboards',
        'Alert system is working correctly - continue monitoring',
        'Time series count is healthy - no cleanup needed at this time',
      ],
      confidence: 0.94,
      analyzedAt: new Date().toISOString(),
    },
    5: {
      summary: 'Load Balancer experiencing multiple critical issues. Circuit breaker opened for mobile-api, SSL certificate expiring soon, and sustained high CPU usage. Backend health checks are intermittently failing.',
      issues: [
        {
          type: 'Application',
          severity: 'Critical',
          description: 'Circuit breaker opened due to consecutive failures',
          logLine: '[ERROR] traefik[1234]: Circuit breaker opened for "mobile-api" (5 consecutive failures)',
          lineNumber: 15,
        },
        {
          type: 'Security',
          severity: 'High',
          description: 'SSL certificate expiring soon',
          logLine: '[WARN] system: SSL certificate for api.example.com expires in 25 days',
          lineNumber: 11,
        },
        {
          type: 'Performance',
          severity: 'High',
          description: 'Sustained high CPU usage',
          logLine: '[WARN] system: CPU usage sustained above 80% for 15 minutes',
          lineNumber: 16,
        },
        {
          type: 'Application',
          severity: 'Medium',
          description: 'Backend health check failures',
          logLine: '[ERROR] traefik[1234]: Backend "backend-api" health check failed (timeout)',
          lineNumber: 7,
        },
        {
          type: 'Security',
          severity: 'Medium',
          description: 'Rate limit violations detected',
          logLine: '[ERROR] traefik[1234]: Rate limit exceeded for client 203.0.113.50',
          lineNumber: 12,
        },
      ],
      recommendations: [
        'CRITICAL: Investigate mobile-api backend - circuit breaker is open (5 consecutive failures)',
        'URGENT: Renew SSL certificate for api.example.com - expires in 25 days',
        'URGENT: Address sustained high CPU usage (>80% for 15+ minutes) - consider scaling',
        'Review backend-api health check timeouts and connection pooling',
        'Investigate analytics-service retry failures - may indicate service degradation',
        'Review rate limiting rules for client 203.0.113.50 - potential DDoS or abuse',
        'Consider implementing automated SSL certificate renewal with Let\'s Encrypt',
        'Add horizontal pod autoscaling or additional load balancer instances',
        'Implement circuit breaker notifications for immediate incident response',
        'Review backend service capacity and response times',
      ],
      confidence: 0.91,
      analyzedAt: new Date().toISOString(),
    },
  };

  return analysisTemplates[serverId] || analysisTemplates[1];
};
