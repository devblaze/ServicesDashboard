# Troubleshooting Guide

This guide covers common issues and their solutions for Services Dashboard.

## Table of Contents

- [Raspberry Pi Issues](#raspberry-pi-issues)
- [Database Issues](#database-issues)
- [Network Issues](#network-issues)
- [Docker Issues](#docker-issues)

## Raspberry Pi Issues

### FastEndpoints Error on Raspberry Pi

**Symptom:**
```
System.InvalidOperationException: FastEndpoints was unable to find any endpoint declarations!
```

**Cause:**
This error occurs when the application is built with assembly trimming enabled, which removes the endpoint classes that FastEndpoints needs to discover at runtime. This is a common issue on ARM devices like Raspberry Pi.

**Solution:**

The project has been configured to disable trimming (`ServicesDashboard.csproj` lines 10-16), but you may need to rebuild the release packages.

#### Option 1: Use Pre-built Fixed Releases (Recommended)

If you're installing from GitHub releases, ensure you're using version **v1.1.0 or later** which includes the fix:

```bash
# Raspberry Pi 3/4 (32-bit)
curl -fsSL https://github.com/YOUR_USERNAME/ServicesDashboard/releases/latest/download/servicesdashboard-pi-linux-arm.tar.gz | sudo tar -xzf - && sudo bash install.sh

# Raspberry Pi 4/5 (64-bit)
curl -fsSL https://github.com/YOUR_USERNAME/ServicesDashboard/releases/latest/download/servicesdashboard-pi-linux-arm64.tar.gz | sudo tar -xzf - && sudo bash install.sh
```

#### Option 2: Build from Source

If you're building from source, use the provided build script:

```bash
# On your development machine (macOS/Linux/Windows with WSL)
git clone https://github.com/YOUR_USERNAME/ServicesDashboard.git
cd ServicesDashboard

# Build for Raspberry Pi
./publish-pi.sh

# Copy the release to your Raspberry Pi
scp releases/servicesdashboard-pi-linux-arm.tar.gz pi@raspberrypi:~/

# On the Raspberry Pi
tar -xzf servicesdashboard-pi-linux-arm.tar.gz
sudo ./install.sh
```

#### Option 3: Manual Build

If the script doesn't work, build manually with these specific flags:

```bash
cd ServicesDashboard

# For Raspberry Pi 3/4 (32-bit ARMv7)
dotnet publish \
    --runtime linux-arm \
    --self-contained true \
    --configuration Release \
    -p:PublishTrimmed=false \
    -p:PublishSingleFile=false \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:IncludeAllContentForSelfExtract=true \
    -o ./publish/linux-arm

# For Raspberry Pi 4/5 (64-bit ARM64)
dotnet publish \
    --runtime linux-arm64 \
    --self-contained true \
    --configuration Release \
    -p:PublishTrimmed=false \
    -p:PublishSingleFile=false \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:IncludeAllContentForSelfExtract=true \
    -o ./publish/linux-arm64
```

**Key Settings Explained:**
- `PublishTrimmed=false`: Prevents .NET from removing "unused" code (including FastEndpoints classes)
- `PublishSingleFile=false`: Keeps assemblies separate so they can be loaded properly
- `IncludeNativeLibrariesForSelfExtract=true`: Includes all required native libraries
- `IncludeAllContentForSelfExtract=true`: Ensures all content files are available

#### Verify the Fix

After installation, check if the service starts correctly:

```bash
sudo systemctl start servicesdashboard
sudo systemctl status servicesdashboard
```

You should see:
```
● servicesdashboard.service - Services Dashboard
     Loaded: loaded (/etc/systemd/system/servicesdashboard.service; enabled)
     Active: active (running) since ...
```

If you see logs like this, the service is running correctly:
```
🗄️ Using PostgreSQL database
🌐 Starting Services Dashboard...
✅ Database migration completed
```

### Insufficient RAM on Raspberry Pi

**Symptom:**
- Service crashes or fails to start
- Out of memory errors in logs
- System becomes unresponsive

**Cause:**
.NET applications require at least 1GB RAM. Raspberry Pi Zero/1 (512MB) are not supported.

**Solution:**
- Use Raspberry Pi 3 or newer (1GB+ RAM)
- For Pi 3 with exactly 1GB: Close other applications to free memory
- Recommended: Raspberry Pi 4/5 with 2GB+ RAM for best performance

**Memory Optimization:**
```bash
# Check memory usage
free -h

# If running on Pi 3 (1GB RAM), stop unnecessary services
sudo systemctl disable bluetooth
sudo systemctl stop bluetooth
```

### Slow Performance on Raspberry Pi 3

**Symptom:**
- Application responds slowly
- High CPU usage
- Delayed health checks

**Cause:**
Raspberry Pi 3 has limited CPU power compared to Pi 4/5.

**Solution:**
1. Reduce polling intervals in application settings
2. Disable AI features if not needed (they're CPU-intensive)
3. Consider upgrading to Raspberry Pi 4 or 5

## Database Issues

### PostgreSQL Connection Failed

**Symptom:**
```
Npgsql.NpgsqlException: Connection refused
```

**Solution:**
1. Check if PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verify connection string in appsettings.json
3. Check PostgreSQL is listening on the correct port:
   ```bash
   sudo netstat -tlnp | grep 5432
   ```

### SQLite Database Locked

**Symptom:**
```
Microsoft.Data.Sqlite.SqliteException: database is locked
```

**Solution:**
1. Only one process can write to SQLite at a time
2. Check if another instance is running:
   ```bash
   ps aux | grep ServicesDashboard
   ```
3. For concurrent access, switch to PostgreSQL

## Network Issues

### Port 5050 Already in Use

**Symptom:**
```
System.IO.IOException: Failed to bind to address http://0.0.0.0:5050
```

**Solution:**
1. Check what's using port 5050:
   ```bash
   sudo lsof -i :5050
   ```

2. Either stop the conflicting service or change the port:
   ```bash
   # Edit the service file
   sudo nano /etc/systemd/system/servicesdashboard.service

   # Change ASPNETCORE_URLS to use a different port
   Environment=ASPNETCORE_URLS=http://0.0.0.0:8080

   # Reload and restart
   sudo systemctl daemon-reload
   sudo systemctl restart servicesdashboard
   ```

### Cannot Access Dashboard from Other Devices

**Symptom:**
- Dashboard accessible from localhost but not from network
- Connection timeout from other devices

**Solution:**
1. Check firewall settings:
   ```bash
   sudo ufw allow 5050/tcp
   ```

2. Verify the service is listening on all interfaces:
   ```bash
   sudo netstat -tlnp | grep 5050
   ```
   Should show `0.0.0.0:5050` not `127.0.0.1:5050`

3. Check application is configured correctly:
   ```bash
   # Should have ASPNETCORE_URLS=http://0.0.0.0:5050
   systemctl cat servicesdashboard
   ```

## Docker Issues

### Docker Not Accessible via SSH

**Symptom:**
- "Permission denied" errors when accessing Docker
- Cannot list containers

**Solution:**
1. Ensure the SSH user has Docker permissions:
   ```bash
   sudo usermod -aG docker $USER
   ```

2. Restart Docker service:
   ```bash
   sudo systemctl restart docker
   ```

### Docker Commands Timeout

**Symptom:**
- Docker operations timeout
- "Connection refused" errors

**Solution:**
1. Check Docker socket permissions:
   ```bash
   ls -la /var/run/docker.sock
   ```

2. Verify Docker is running:
   ```bash
   sudo systemctl status docker
   ```

## General Issues

### Service Won't Start

**Symptom:**
```
servicesdashboard.service: Failed with result 'signal'
```

**Solution:**
1. Check detailed logs:
   ```bash
   sudo journalctl -u servicesdashboard -n 100 --no-pager
   ```

2. Verify .NET runtime is installed:
   ```bash
   dotnet --version
   ```

3. Check file permissions:
   ```bash
   ls -la /opt/servicesdashboard/
   sudo chmod +x /opt/servicesdashboard/ServicesDashboard
   ```

### High Memory Usage

**Symptom:**
- Application using excessive RAM
- System swapping heavily

**Solution:**
1. Monitor memory usage:
   ```bash
   watch -n 1 free -h
   ```

2. Reduce concurrent operations in settings
3. Disable unnecessary features (AI analysis, network scanning)
4. Restart service periodically via cron:
   ```bash
   # Add to crontab (restart at 3 AM daily)
   0 3 * * * systemctl restart servicesdashboard
   ```

## Getting Help

If you're still experiencing issues:

1. **Check Logs:**
   ```bash
   sudo journalctl -u servicesdashboard -f
   ```

2. **Enable Debug Logging:**
   Edit `/opt/servicesdashboard/appsettings.json` and set:
   ```json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Debug"
       }
     }
   }
   ```

3. **Report an Issue:**
   - GitHub Issues: https://github.com/YOUR_USERNAME/ServicesDashboard/issues
   - Include: OS version, architecture, logs, and steps to reproduce

4. **Community Support:**
   - Discussions: https://github.com/YOUR_USERNAME/ServicesDashboard/discussions
