# Services Dashboard Deployment Guide

This guide covers deploying Services Dashboard on various platforms, from Raspberry Pi Zero to powerful servers.

## Quick Start (One-Line Installation)

### For Linux/macOS/Raspberry Pi:

```bash
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash
```

This will:
1. Detect your system architecture automatically
2. Download the appropriate release
3. Install and configure the service
4. Start the dashboard on port 5050

### For Windows:

Download the latest release from [GitHub Releases](https://github.com/YOUR_USERNAME/ServicesDashboard/releases) and run `install.ps1` as Administrator.

---

## Supported Platforms

| Platform | Architecture | Database | AI Support |
|----------|-------------|----------|------------|
| Raspberry Pi Zero | ARM32v6 | SQLite | Optional (remote) |
| Raspberry Pi 3/4 32-bit | ARM32v7 | SQLite/PostgreSQL | Yes |
| Raspberry Pi 4/5 64-bit | ARM64 | PostgreSQL | Yes |
| Linux x64 | x64 | PostgreSQL | Yes |
| macOS Intel | x64 | PostgreSQL | Yes |
| macOS Apple Silicon | ARM64 | PostgreSQL | Yes |
| Windows | x64 | PostgreSQL | Yes |

---

## Deployment Scenarios

### 1. Raspberry Pi Zero (Minimal Resources)

**Hardware Requirements:**
- 512MB RAM
- 8GB SD Card minimum
- Network connectivity

**Features:**
- SQLite database (no PostgreSQL needed)
- Lightweight mode (AI disabled by default)
- Optimized for low resource usage

**Installation:**
```bash
# One-line install
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash

# Start the service
sudo systemctl start servicesdashboard

# Check status
sudo systemctl status servicesdashboard

# View logs
sudo journalctl -u servicesdashboard -f
```

**Configuration:**
The Pi Zero deployment uses `appsettings.PiZero.json`:
- SQLite database at `/var/lib/servicesdashboard/servicesdashboard.db`
- AI features disabled by default
- Reduced scan concurrency
- Lower memory footprint

**Access:**
Open `http://<pi-zero-ip>:5050` in your browser

---

### 2. Standard Linux Server (Docker Compose)

**Hardware Requirements:**
- 2GB RAM minimum
- 20GB disk space
- Docker and Docker Compose installed

**Installation:**
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ServicesDashboard.git
cd ServicesDashboard

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Services:**
- Frontend: React + Vite
- Backend: .NET 9 + FastEndpoints
- Database: PostgreSQL 16
- AI: Ollama (optional)

**Access:**
Open `http://localhost:5050` in your browser

---

### 2b. Production Deployment with Docker Hub Images

**Hardware Requirements:**
- 2GB RAM minimum
- 20GB disk space
- Docker and Docker Compose installed

This deployment uses pre-built Docker images from Docker Hub for easier deployment.

#### Step 1: Configure Environment

```bash
# Copy environment template
cp .env.production.example .env

# Edit environment file
nano .env
```

Set the following variables:
```env
# Your Docker Hub username (where images are published)
DOCKER_USERNAME=yourusername

# Version to deploy (e.g., 0.0.3, latest)
VERSION=latest

# Database credentials (CHANGE THESE!)
DB_USER=admin
DB_PASSWORD=your_secure_password_here

# Application port
APP_PORT=5050

# Ollama URL (optional, for AI features)
OLLAMA_URL=http://host.docker.internal:11434
```

#### Step 2: Deploy with Docker Compose

```bash
# Start all services
docker compose -f compose.prod.yaml up -d

# View logs
docker compose -f compose.prod.yaml logs -f

# Check status
docker compose -f compose.prod.yaml ps
```

#### Step 3: Access the Application

Open `http://your-server-ip:5050` in your browser

#### Deployment with Portainer

**Method 1: Using Portainer Stacks (Recommended)**

1. Log in to your Portainer instance
2. Navigate to **Stacks** → **Add stack**
3. Choose **Web editor** and paste the contents of `compose.prod.yaml`
4. Scroll down to **Environment variables** and add:
   ```
   DOCKER_USERNAME=yourusername
   VERSION=latest
   DB_USER=admin
   DB_PASSWORD=your_secure_password
   APP_PORT=5050
   OLLAMA_URL=http://host.docker.internal:11434
   ```
5. Click **Deploy the stack**

**Method 2: Using Git Repository**

1. Navigate to **Stacks** → **Add stack**
2. Choose **Repository**
3. Enter your repository URL
4. Set **Compose path** to: `compose.prod.yaml`
5. Add environment variables as shown above
6. Enable **Automatic updates** (optional) - Portainer will automatically pull new images
7. Click **Deploy the stack**

**Method 3: Upload Compose File**

1. Navigate to **Stacks** → **Add stack**
2. Choose **Upload**
3. Upload the `compose.prod.yaml` file
4. Add environment variables
5. Click **Deploy the stack**

#### Architecture

The deployment consists of three services:

- **database**: PostgreSQL 16 database with persistent storage
- **servicesdashboard**: .NET 9 backend API (internal port 8080)
- **frontend**: React/Nginx frontend (internal port 80, exposed as APP_PORT)

All services communicate through a dedicated Docker network (`app_network`) and include health checks for automatic recovery.

#### Updating

**Manual Update:**
```bash
# Pull latest images
docker compose -f compose.prod.yaml pull

# Restart with new images
docker compose -f compose.prod.yaml up -d

# Clean up old images
docker image prune -f
```

**Automatic Update with Portainer:**
- Enable "Automatic updates" when creating the stack
- Portainer will periodically check for new images and update automatically

**Version Pinning:**
To pin to a specific version instead of `latest`, set in `.env`:
```env
VERSION=0.0.3
```

#### Reverse Proxy Configuration

**Nginx:**
```nginx
server {
    listen 80;
    server_name dashboard.example.com;

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Traefik (add labels to compose.prod.yaml):**
```yaml
  frontend:
    image: ${DOCKER_USERNAME}/servicesdashboard-frontend:${VERSION}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`dashboard.example.com`)"
      - "traefik.http.services.dashboard.loadbalancer.server.port=80"
    # ... rest of config
```

#### Maintenance

**View Logs:**
```bash
# All services
docker compose -f compose.prod.yaml logs -f

# Specific service
docker compose -f compose.prod.yaml logs -f servicesdashboard
```

**Backup Database:**
```bash
# Create backup
docker compose -f compose.prod.yaml exec database pg_dump -U admin servicesdashboard > backup.sql

# Restore backup
cat backup.sql | docker compose -f compose.prod.yaml exec -T database psql -U admin servicesdashboard
```

**Restart Services:**
```bash
# Restart all
docker compose -f compose.prod.yaml restart

# Restart specific service
docker compose -f compose.prod.yaml restart servicesdashboard
```

#### Troubleshooting

**Service Not Starting:**
```bash
# Check logs
docker compose -f compose.prod.yaml logs servicesdashboard

# Check service status
docker compose -f compose.prod.yaml ps
```

**Database Connection Issues:**
```bash
# Verify database health
docker compose -f compose.prod.yaml ps database

# Check database logs
docker compose -f compose.prod.yaml logs database

# Test connection from backend
docker compose -f compose.prod.yaml exec servicesdashboard curl http://localhost:8080/health
```

**Can't Pull Images:**

If images are private or you need authentication:
```bash
docker login
# Enter Docker Hub credentials
docker compose -f compose.prod.yaml pull
```

---

### 3. Production Server (Native Deployment)

**Hardware Requirements:**
- 4GB RAM minimum
- 50GB disk space
- PostgreSQL 12+ (separate or bundled)

**Installation:**

1. **Download the release:**
```bash
wget https://github.com/YOUR_USERNAME/ServicesDashboard/releases/latest/download/servicesdashboard-linux-x64.tar.gz
tar -xzf servicesdashboard-linux-x64.tar.gz
cd servicesdashboard
```

2. **Configure PostgreSQL:**
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE servicesdashboard;"
sudo -u postgres psql -c "CREATE USER svcadmin WITH ENCRYPTED PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE servicesdashboard TO svcadmin;"
```

3. **Set environment variables:**
```bash
export ASPNETCORE_ENVIRONMENT=Production
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=servicesdashboard
export DB_USER=svcadmin
export DB_PASSWORD=your_password
```

4. **Run the installer:**
```bash
sudo ./install.sh
```

5. **Start the service:**
```bash
sudo systemctl start servicesdashboard
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASPNETCORE_ENVIRONMENT` | Environment (Development/Production/PiZero) | `Production` |
| `ASPNETCORE_URLS` | Bind address | `http://0.0.0.0:5050` |
| `DatabaseProvider` | Database type (PostgreSQL/SQLite) | `PostgreSQL` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `servicesdashboard` |
| `DB_USER` | Database user | `admin` |
| `DB_PASSWORD` | Database password | *required* |
| `OLLAMA_URL` | Ollama API URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | AI model to use | `llama3.2:3b` |

### Configuration Files

#### appsettings.Production.json
For powerful servers with PostgreSQL and full AI support.

#### appsettings.PiZero.json
For Raspberry Pi Zero and minimal resource environments:
- Uses SQLite
- AI disabled by default
- Optimized scan settings

---

## Creating GitHub Releases

### Automatic Release on Tag Push

1. Create and push a tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. GitHub Actions will automatically:
   - Build for all platforms
   - Create release packages
   - Publish to GitHub Releases

### Manual Release Trigger

1. Go to Actions tab in GitHub
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Enter version tag (e.g., `v1.0.0`)

---

## Upgrading

### Raspberry Pi Zero / Linux

```bash
# Stop the service
sudo systemctl stop servicesdashboard

# Download and run installer (will upgrade)
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash

# Start the service
sudo systemctl start servicesdashboard
```

### Docker Compose

```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d

# Remove old images
docker image prune -f
```

---

## Troubleshooting

### Raspberry Pi Zero Issues

**Service won't start:**
```bash
# Check logs
sudo journalctl -u servicesdashboard -n 100 --no-pager

# Check if port is available
sudo netstat -tlnp | grep 5050

# Verify permissions
ls -la /opt/servicesdashboard
ls -la /var/lib/servicesdashboard
```

**Out of memory:**
- Disable AI features in `appsettings.PiZero.json`
- Reduce `MaxConcurrentScans` to 3-5
- Increase swap space

**Slow performance:**
- Normal for Pi Zero due to limited CPU
- Consider Pi 3/4 for better performance
- Reduce scan intervals

### Database Issues

**SQLite locked:**
```bash
# Check for multiple instances
ps aux | grep ServicesDashboard

# Reset database (WARNING: deletes all data)
sudo systemctl stop servicesdashboard
sudo rm /var/lib/servicesdashboard/servicesdashboard.db
sudo systemctl start servicesdashboard
```

**PostgreSQL connection failed:**
```bash
# Test PostgreSQL connection
psql -h localhost -U svcadmin -d servicesdashboard

# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials in environment variables
env | grep DB_
```

---

## Performance Tuning

### Raspberry Pi Zero
```json
{
  "NetworkScan": {
    "TimeoutSeconds": 30,
    "MaxConcurrentScans": 5,
    "AutoScanIntervalMinutes": 120
  }
}
```

### Standard Server
```json
{
  "NetworkScan": {
    "TimeoutSeconds": 60,
    "MaxConcurrentScans": 20,
    "AutoScanIntervalMinutes": 30
  }
}
```

---

## Security Considerations

1. **Change default credentials** for database
2. **Use HTTPS** in production (configure reverse proxy)
3. **Restrict access** using firewall rules
4. **Keep system updated** regularly
5. **Backup database** frequently

---

## Backup and Restore

### SQLite (Pi Zero)
```bash
# Backup
sudo cp /var/lib/servicesdashboard/servicesdashboard.db /backup/servicesdashboard-$(date +%Y%m%d).db

# Restore
sudo systemctl stop servicesdashboard
sudo cp /backup/servicesdashboard-20250113.db /var/lib/servicesdashboard/servicesdashboard.db
sudo systemctl start servicesdashboard
```

### PostgreSQL
```bash
# Backup
pg_dump -h localhost -U svcadmin servicesdashboard > backup.sql

# Restore
psql -h localhost -U svcadmin servicesdashboard < backup.sql
```

---

## Monitoring

### System Service Status
```bash
# Check service
sudo systemctl status servicesdashboard

# View real-time logs
sudo journalctl -u servicesdashboard -f

# Check resource usage
top -p $(pgrep -f ServicesDashboard)
```

### Application Health
Visit `http://<your-server>:5050/health` for health check endpoint.

---

## Uninstallation

```bash
# Stop and disable service
sudo systemctl stop servicesdashboard
sudo systemctl disable servicesdashboard

# Remove files
sudo rm -rf /opt/servicesdashboard
sudo rm -rf /var/lib/servicesdashboard
sudo rm /etc/systemd/system/servicesdashboard.service

# Reload systemd
sudo systemctl daemon-reload
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/ServicesDashboard/issues)
- **Documentation**: [README.md](README.md)
- **Discord**: *Coming soon*

---

## License

MIT License - See [LICENSE](LICENSE) file for details
