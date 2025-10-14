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
