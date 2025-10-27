# Self-Hosted Services - Unified Design Document

## Overview

A unified page that merges Docker Services and Deployments into a comprehensive self-hosted services management interface with Git integration, auto-deployment, and intelligent port management.

## Features

### Core Features
1. **Unified View**: Display both Docker containers and deployments in a single interface
2. **Git Integration**: Connect to GitHub, Gitea, GitLab
3. **Auto-Deployment**: Detect new branches and automatically create deployments
4. **Port Management**: Intelligent port allocation to prevent conflicts
5. **Multi-Environment**: Support for production, staging, development environments
6. **Real-Time Status**: Live updates for container and deployment status

### Git Provider Integration
- OAuth integration for GitHub/GitLab
- API token support for Gitea
- Repository discovery and webhook setup
- Branch/tag monitoring
- Automatic deployment triggers

### Intelligent Port Management
- Port conflict detection across all services
- Automatic port allocation for new deployments
- Port pool management per server
- Suggestions for available ports
- Port mapping visualization

## Data Architecture

### New Models

#### GitProvider
```csharp
public class GitProvider
{
    public int Id { get; set; }
    public GitProviderType Type { get; set; } // GitHub, Gitea, GitLab
    public string Name { get; set; }
    public string BaseUrl { get; set; } // For self-hosted instances
    public string? AccessToken { get; set; }
    public string? WebhookSecret { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<GitRepository> Repositories { get; set; }
}
```

#### GitRepository (Enhanced)
```csharp
public class GitRepository
{
    public int Id { get; set; }
    public int GitProviderId { get; set; }
    public string Name { get; set; }
    public string FullName { get; set; } // owner/repo
    public string CloneUrl { get; set; }
    public string? DefaultBranch { get; set; }
    public bool AutoDeployEnabled { get; set; }
    public string? AutoDeployBranchPattern { get; set; } // e.g., "feature/*"
    public int? DefaultServerId { get; set; }
    public DateTime LastSyncedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public GitProvider Provider { get; set; }
    public ManagedServer? DefaultServer { get; set; }
    public ICollection<GitBranch> Branches { get; set; }
    public ICollection<Deployment> Deployments { get; set; }
}
```

#### GitBranch (New)
```csharp
public class GitBranch
{
    public int Id { get; set; }
    public int RepositoryId { get; set; }
    public string Name { get; set; }
    public string CommitSha { get; set; }
    public bool HasAutoDeployment { get; set; }
    public int? DeploymentId { get; set; }
    public DateTime LastCommitAt { get; set; }
    public DateTime DetectedAt { get; set; }

    public GitRepository Repository { get; set; }
    public Deployment? Deployment { get; set; }
}
```

#### SelfHostedService (Unified View Model)
```csharp
public class SelfHostedService
{
    public string Id { get; set; } // Composite: type-id
    public SelfHostedServiceType Type { get; set; } // Docker, Deployment
    public string Name { get; set; }
    public string Status { get; set; }
    public int ServerId { get; set; }
    public string ServerName { get; set; }

    // Docker-specific
    public string? ContainerId { get; set; }
    public string? Image { get; set; }
    public List<PortMapping>? Ports { get; set; }

    // Deployment-specific
    public int? DeploymentId { get; set; }
    public DeploymentType? DeploymentType { get; set; }
    public string? Branch { get; set; }
    public string? RepositoryName { get; set; }
    public bool? AutoDeploy { get; set; }
    public DateTime? LastDeployedAt { get; set; }

    // Common
    public string? IconUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Tags { get; set; }
}
```

#### PortAllocation (Enhanced)
```csharp
public class PortAllocation
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public int Port { get; set; }
    public PortAllocationStatus Status { get; set; } // Available, Reserved, InUse
    public PortAllocationType AllocationType { get; set; } // Docker, Deployment, System
    public string? ServiceId { get; set; } // Docker container ID or Deployment ID
    public string? ServiceName { get; set; }
    public DateTime? AllocatedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }

    public ManagedServer Server { get; set; }
}
```

## API Endpoints

### Unified Services
- `GET /api/selfhosted` - Get all self-hosted services (Docker + Deployments)
- `GET /api/selfhosted/{id}` - Get specific service details
- `POST /api/selfhosted/{id}/start` - Start service (Docker or Deployment)
- `POST /api/selfhosted/{id}/stop` - Stop service
- `POST /api/selfhosted/{id}/restart` - Restart service
- `DELETE /api/selfhosted/{id}` - Remove service

### Git Provider Management
- `GET /api/gitproviders` - List configured providers
- `POST /api/gitproviders` - Add new provider
- `PUT /api/gitproviders/{id}` - Update provider
- `DELETE /api/gitproviders/{id}` - Remove provider
- `POST /api/gitproviders/{id}/test` - Test connection
- `GET /api/gitproviders/{id}/repositories` - Discover repositories

### Repository Management
- `GET /api/repositories` - List all repositories
- `GET /api/repositories/{id}` - Get repository details
- `POST /api/repositories/{id}/sync` - Sync branches from remote
- `PUT /api/repositories/{id}` - Update settings (auto-deploy, etc.)
- `GET /api/repositories/{id}/branches` - List branches
- `POST /api/repositories/{id}/branches/{branch}/deploy` - Create deployment for branch

### Port Management
- `GET /api/ports/{serverId}/available` - Get available ports on server
- `POST /api/ports/{serverId}/allocate` - Reserve port
- `POST /api/ports/{serverId}/release` - Release port
- `GET /api/ports/{serverId}/conflicts` - Check for port conflicts
- `GET /api/ports/{serverId}/suggest` - Get suggested available ports

### Auto-Deployment
- `POST /api/webhooks/github` - GitHub webhook receiver
- `POST /api/webhooks/gitea` - Gitea webhook receiver
- `POST /api/webhooks/gitlab` - GitLab webhook receiver
- `GET /api/autodeployment/rules` - List auto-deployment rules
- `POST /api/autodeployment/rules` - Create auto-deployment rule
- `PUT /api/autodeployment/rules/{id}` - Update rule
- `DELETE /api/autodeployment/rules/{id}` - Delete rule

## Frontend Architecture

### Page Structure
```
SelfHostedServicesPage
├── Header
│   ├── Title & Stats
│   ├── Git Provider Connect Button
│   └── Actions (Refresh, Add Service)
├── Filters & Sorting
│   ├── View Mode (All, Docker Only, Deployments Only)
│   ├── Status Filter (All, Running, Stopped, Building)
│   ├── Server Filter
│   ├── Repository Filter
│   └── Search
├── Services Grid
│   ├── ServiceCard (Unified)
│   │   ├── Icon
│   │   ├── Name & Type Badge
│   │   ├── Status Indicator
│   │   ├── Port Information
│   │   ├── Repository/Branch Info (if deployment)
│   │   ├── Auto-Deploy Badge
│   │   └── Actions Menu
│   └── Group by Server (Optional)
└── Modals
    ├── GitProviderConnectModal
    ├── AutoDeployConfigModal
    ├── PortMappingModal
    └── ServiceDetailsModal
```

### Components

#### SelfHostedServicesPage.tsx
Main page component with:
- Unified service listing
- Filter and search
- Service actions
- Real-time updates

#### GitProviderSetup.tsx
Configuration wizard for:
- Provider type selection (GitHub, Gitea, GitLab)
- Authentication (OAuth or API token)
- Webhook setup
- Repository discovery

#### ServiceCard.tsx
Unified card showing:
- Service type indicator
- Status with color coding
- Port mappings
- Git information (if applicable)
- Quick actions (start, stop, restart, deploy)

#### AutoDeploymentConfig.tsx
Configuration for:
- Branch pattern matching
- Target server selection
- Environment variables
- Port allocation strategy
- Deployment triggers

#### PortManagementPanel.tsx
Port management interface:
- Port pool visualization
- Conflict detection
- Manual allocation
- Automatic suggestions

## Business Logic

### Port Conflict Detection Algorithm

```csharp
public async Task<PortConflictResult> DetectConflictsAsync(int serverId, List<int> requestedPorts)
{
    // Get all allocated ports on server
    var allocatedPorts = await GetAllocatedPortsAsync(serverId);

    // Get Docker container ports from server
    var dockerPorts = await _dockerService.GetUsedPortsAsync(serverId);

    // Get system reserved ports (1-1024)
    var systemPorts = Enumerable.Range(1, 1024);

    // Check conflicts
    var conflicts = new List<PortConflict>();
    foreach (var port in requestedPorts)
    {
        if (systemPorts.Contains(port))
        {
            conflicts.Add(new PortConflict
            {
                Port = port,
                Type = "System Reserved",
                ConflictsWith = "System"
            });
        }
        else if (allocatedPorts.Contains(port))
        {
            var allocation = await GetAllocationAsync(serverId, port);
            conflicts.Add(new PortConflict
            {
                Port = port,
                Type = "Already Allocated",
                ConflictsWith = allocation.ServiceName
            });
        }
        else if (dockerPorts.Contains(port))
        {
            var container = await GetContainerUsingPortAsync(serverId, port);
            conflicts.Add(new PortConflict
            {
                Port = port,
                Type = "Docker Container",
                ConflictsWith = container.Name
            });
        }
    }

    return new PortConflictResult
    {
        HasConflicts = conflicts.Any(),
        Conflicts = conflicts,
        SuggestedPorts = await SuggestAvailablePortsAsync(serverId, requestedPorts.Count)
    };
}
```

### Auto-Deployment Workflow

```
1. Webhook Received
   ↓
2. Validate Webhook (signature, secret)
   ↓
3. Parse Payload (branch, commit, repository)
   ↓
4. Check Auto-Deploy Rules
   ├── Match repository?
   ├── Match branch pattern?
   └── Auto-deploy enabled?
   ↓
5. Check if Deployment Exists
   ├── Yes → Update and redeploy
   └── No → Create new deployment
   ↓
6. Allocate Ports (if needed)
   ├── Check conflicts
   ├── Suggest available ports
   └── Reserve ports
   ↓
7. Execute Deployment
   ├── Clone/pull repository
   ├── Build (if needed)
   ├── Deploy (Docker/Compose/K8s)
   └── Update status
   ↓
8. Send Notification
   ├── Success/Failure
   └── Deployment URL
```

### Branch Detection Algorithm

```csharp
public async Task<List<GitBranch>> SyncBranchesAsync(int repositoryId)
{
    var repository = await GetRepositoryAsync(repositoryId);
    var provider = await GetProviderAsync(repository.GitProviderId);

    // Fetch branches from Git provider
    var remoteBranches = await provider.ListBranchesAsync(repository.FullName);

    // Get existing branches in database
    var existingBranches = await GetExistingBranchesAsync(repositoryId);

    var newBranches = new List<GitBranch>();

    foreach (var remoteBranch in remoteBranches)
    {
        var existing = existingBranches.FirstOrDefault(b => b.Name == remoteBranch.Name);

        if (existing == null)
        {
            // New branch detected
            var branch = new GitBranch
            {
                RepositoryId = repositoryId,
                Name = remoteBranch.Name,
                CommitSha = remoteBranch.CommitSha,
                LastCommitAt = remoteBranch.CommitDate,
                DetectedAt = DateTime.UtcNow
            };

            // Check if auto-deploy is enabled and branch matches pattern
            if (repository.AutoDeployEnabled &&
                MatchesBranchPattern(remoteBranch.Name, repository.AutoDeployBranchPattern))
            {
                // Create deployment automatically
                var deployment = await CreateAutoDeploymentAsync(repository, branch);
                branch.DeploymentId = deployment.Id;
                branch.HasAutoDeployment = true;
            }

            newBranches.Add(branch);
        }
        else if (existing.CommitSha != remoteBranch.CommitSha)
        {
            // Branch updated
            existing.CommitSha = remoteBranch.CommitSha;
            existing.LastCommitAt = remoteBranch.CommitDate;

            // Trigger redeployment if auto-deploy is enabled
            if (existing.HasAutoDeployment && existing.DeploymentId.HasValue)
            {
                await TriggerRedeploymentAsync(existing.DeploymentId.Value);
            }
        }
    }

    await SaveBranchesAsync(newBranches);

    return newBranches;
}
```

## User Workflows

### Workflow 1: Connect Git Provider
1. Click "Connect Git Provider"
2. Select provider type (GitHub, Gitea, GitLab)
3. Enter credentials (OAuth or API token)
4. Test connection
5. Discover repositories
6. Select repositories to track
7. Configure auto-deploy settings

### Workflow 2: Auto-Deploy New Branch
1. Developer pushes new branch to repository
2. Webhook triggers sync
3. System detects new branch
4. Matches against auto-deploy pattern
5. Automatically creates deployment
6. Allocates available ports
7. Deploys to target server
8. Notifies user of deployment URL

### Workflow 3: View All Services
1. Navigate to Self-Hosted Services page
2. See unified view of Docker containers and deployments
3. Filter by server, status, or repository
4. Search by name or port
5. Quick actions: start, stop, restart, redeploy
6. View detailed information in modal

### Workflow 4: Resolve Port Conflict
1. System detects port conflict during deployment
2. Shows conflict details with current usage
3. Suggests available alternative ports
4. User can accept suggestion or choose manually
5. System updates port mappings
6. Deploys with new ports

## Configuration

### Auto-Deployment Rule Example
```json
{
  "repositoryId": 1,
  "branchPattern": "feature/*",
  "targetServerId": 2,
  "deploymentType": "DockerCompose",
  "portAllocationStrategy": "Auto",
  "portRange": { "start": 8000, "end": 9000 },
  "environment": "Development",
  "environmentVariables": {
    "NODE_ENV": "development",
    "DEBUG": "true"
  }
}
```

### Git Provider Configuration Example
```json
{
  "type": "Gitea",
  "name": "My Gitea",
  "baseUrl": "https://gitea.example.com",
  "accessToken": "your-token-here",
  "webhookSecret": "random-secret"
}
```

## Implementation Phases

### Phase 1: Foundation (Current Sprint)
- Create unified data models
- Build port conflict detection
- Design frontend layout
- Create basic Git provider models

### Phase 2: Git Integration
- Implement Git provider API clients
- OAuth integration for GitHub/GitLab
- Repository discovery
- Webhook receivers

### Phase 3: Auto-Deployment
- Branch detection and monitoring
- Auto-deployment rule engine
- Deployment creation workflow
- Status tracking and notifications

### Phase 4: Port Management
- Intelligent port allocation
- Conflict detection and resolution
- Port pool visualization
- Auto-suggestion system

### Phase 5: Polish & Advanced Features
- UI refinements
- Real-time updates via SignalR
- Deployment logs viewer
- Rollback capabilities
- Multi-environment support

## Security Considerations

- API tokens stored encrypted in database
- Webhook signature verification
- Rate limiting on webhook endpoints
- Port allocation validation
- Deployment permission checks
- Repository access validation

## Performance Optimizations

- Cache Git provider API responses
- Background sync for branches
- Lazy loading for service details
- Pagination for large service lists
- Efficient port conflict queries with indexes
- SignalR for real-time updates instead of polling
