# Quick Start Guide

Get Services Dashboard running in minutes!

## 🚀 One-Line Installation

### Raspberry Pi (including Pi Zero)
```bash
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash
```

### Linux Server
```bash
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash
```

### macOS
```bash
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash
```

### Windows
Download from [Releases](https://github.com/YOUR_USERNAME/ServicesDashboard/releases) and run `install.ps1` as Administrator.

---

## What Gets Installed?

1. **Services Dashboard application** in `/opt/servicesdashboard`
2. **Systemd service** for automatic startup
3. **Database**:
   - SQLite for Raspberry Pi Zero (lightweight)
   - PostgreSQL for powerful machines (recommended)
4. **Web interface** accessible at `http://localhost:5050`

---

## After Installation

### Start the Service
```bash
sudo systemctl start servicesdashboard
```

### Check Status
```bash
sudo systemctl status servicesdashboard
```

### View Logs
```bash
sudo journalctl -u servicesdashboard -f
```

### Access Dashboard
Open your browser to:
- **Local**: `http://localhost:5050`
- **Network**: `http://<your-ip>:5050`

---

## Docker Compose (Development)

For development or if you prefer Docker:

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/ServicesDashboard.git
cd ServicesDashboard

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access at `http://localhost:5050`

---

## First Steps

1. **Add your first server**
   - Click "Server Management"
   - Add server with SSH credentials

2. **Discover services**
   - Go to "Network Discovery"
   - Scan your network

3. **Monitor Docker containers**
   - View "Docker Services"
   - Start/stop containers
   - Upload custom icons

4. **View logs**
   - Check "Log Analysis"
   - AI-powered insights (if Ollama configured)

---

## Default Configuration

### Raspberry Pi Zero
- Database: SQLite (`/var/lib/servicesdashboard/servicesdashboard.db`)
- AI: Disabled by default
- Port: 5050
- Memory usage: ~50-100MB

### Standard Installation
- Database: PostgreSQL
- AI: Enabled (requires Ollama)
- Port: 5050
- Memory usage: ~200-500MB

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs for errors
sudo journalctl -u servicesdashboard -n 100

# Verify installation
ls -la /opt/servicesdashboard

# Check port availability
sudo netstat -tlnp | grep 5050
```

### Can't Access Dashboard
1. Check firewall rules
2. Verify service is running: `sudo systemctl status servicesdashboard`
3. Try `http://127.0.0.1:5050` instead of localhost

### Database Issues
```bash
# For SQLite (Pi Zero)
ls -la /var/lib/servicesdashboard/

# For PostgreSQL
sudo systemctl status postgresql
```

---

## Next Steps

- 📖 Read the full [Deployment Guide](DEPLOYMENT.md)
- 🔧 Configure [AI features](docs/AI_SETUP.md)
- 🐛 Report issues on [GitHub](https://github.com/YOUR_USERNAME/ServicesDashboard/issues)

---

## Uninstall

```bash
sudo systemctl stop servicesdashboard
sudo systemctl disable servicesdashboard
sudo rm -rf /opt/servicesdashboard
sudo rm -rf /var/lib/servicesdashboard
sudo rm /etc/systemd/system/servicesdashboard.service
sudo systemctl daemon-reload
```

For Docker Compose:
```bash
docker-compose down -v
```
