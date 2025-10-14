#!/bin/bash
set -e

echo "🔄 Services Dashboard Update Script"
echo "===================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Configuration
INSTALL_DIR="/opt/servicesdashboard"
DATA_DIR="/var/lib/servicesdashboard"
GITHUB_REPO="nickantoniadis/ServicesDashboard"
BACKUP_DIR="/tmp/servicesdashboard-backup-$(date +%Y%m%d-%H%M%S)"

# Detect architecture
ARCH=$(uname -m)
PLATFORM="linux-x64"

if [ "$ARCH" = "armv6l" ]; then
  PLATFORM="pizero-linux-arm"
  echo "📟 Detected Raspberry Pi Zero (ARMv6)"
elif [ "$ARCH" = "armv7l" ]; then
  PLATFORM="pi-linux-arm"
  echo "📟 Detected Raspberry Pi 3/4 (ARMv7)"
elif [ "$ARCH" = "aarch64" ]; then
  PLATFORM="pi-linux-arm64"
  echo "📟 Detected Raspberry Pi 4/5 (ARMv8/64-bit)"
elif [ "$ARCH" = "x86_64" ]; then
  PLATFORM="linux-x64"
  echo "💻 Detected Linux x64"
fi

# Get latest version
echo ""
echo "📡 Checking for latest version..."
LATEST_RELEASE=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest")
LATEST_VERSION=$(echo "$LATEST_RELEASE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/$LATEST_VERSION/servicesdashboard-$PLATFORM.tar.gz"

if [ -z "$LATEST_VERSION" ]; then
  echo "❌ Failed to fetch latest version"
  exit 1
fi

echo "✨ Latest version: $LATEST_VERSION"
echo "📦 Platform: $PLATFORM"
echo "🔗 Download URL: $DOWNLOAD_URL"

# Check if service is running
if systemctl is-active --quiet servicesdashboard; then
  echo ""
  echo "⏸️  Stopping Services Dashboard service..."
  systemctl stop servicesdashboard
  SERVICE_WAS_RUNNING=true
else
  SERVICE_WAS_RUNNING=false
fi

# Backup current installation
echo ""
echo "💾 Creating backup at: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
if [ -d "$INSTALL_DIR" ]; then
  cp -r "$INSTALL_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
fi

# Backup database if it exists
if [ -f "$DATA_DIR/servicesdashboard.db" ]; then
  echo "💾 Backing up database..."
  cp "$DATA_DIR/servicesdashboard.db" "$BACKUP_DIR/"
fi

# Download new version
echo ""
echo "⬇️  Downloading $LATEST_VERSION..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

if ! curl -fsSL "$DOWNLOAD_URL" -o "servicesdashboard.tar.gz"; then
  echo "❌ Failed to download update"
  echo "🔄 Restoring from backup..."
  systemctl start servicesdashboard 2>/dev/null || true
  exit 1
fi

# Extract to installation directory
echo "📦 Installing update..."
rm -rf "$INSTALL_DIR"/*
tar -xzf "servicesdashboard.tar.gz" -C "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/ServicesDashboard"

# Restore configuration files if they don't exist
if [ ! -f "$INSTALL_DIR/appsettings.json" ] && [ -f "$BACKUP_DIR/appsettings.json" ]; then
  echo "📄 Restoring configuration..."
  cp "$BACKUP_DIR/appsettings.json" "$INSTALL_DIR/"
fi

# Clean up
cd /
rm -rf "$TEMP_DIR"

# Start service if it was running
if [ "$SERVICE_WAS_RUNNING" = true ]; then
  echo ""
  echo "▶️  Starting Services Dashboard service..."
  systemctl start servicesdashboard

  # Wait a moment and check status
  sleep 2
  if systemctl is-active --quiet servicesdashboard; then
    echo "✅ Service started successfully!"
  else
    echo "❌ Service failed to start. Check logs with: sudo journalctl -u servicesdashboard -n 50"
    echo "🔄 Backup available at: $BACKUP_DIR"
    exit 1
  fi
fi

echo ""
echo "✅ Update completed successfully!"
echo ""
echo "📝 Updated to version: $LATEST_VERSION"
echo "💾 Backup location: $BACKUP_DIR"
echo ""
echo "📊 To check status:"
echo "   sudo systemctl status servicesdashboard"
echo ""
echo "📜 To view logs:"
echo "   sudo journalctl -u servicesdashboard -f"
echo ""
echo "🌐 Access the dashboard at:"
echo "   http://$(hostname -I | awk '{print $1}'):5050"
echo ""
