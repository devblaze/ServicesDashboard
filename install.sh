#!/bin/bash
#
# Services Dashboard - One-Line Installer
# Version: 2.0.0
# Updated: 2025-10-26
#
# Usage: curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash
#
# Requirements:
# - .NET 9.0 Runtime
# - 1GB+ RAM (2GB+ recommended)
# - 2GB+ free disk space
# - Raspberry Pi 3 or newer (ARMv7/ARMv8) for ARM devices
#

set -e

REPO_OWNER="${REPO_OWNER:-devblaze}"
REPO_NAME="${REPO_NAME:-ServicesDashboard}"
GITHUB_REPO="$REPO_OWNER/$REPO_NAME"
MIN_RAM_MB=900  # Minimum RAM in MB (allows for some overhead below 1GB)

echo "🚀 Services Dashboard Installer v2.0.0"
echo "======================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Check system requirements (Linux only)
if [ "$(uname -s)" = "Linux" ]; then
  TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
  if [ "$TOTAL_RAM_MB" -lt "$MIN_RAM_MB" ]; then
    echo ""
    echo "⚠️  WARNING: Insufficient RAM"
    echo ""
    echo "   Detected: ${TOTAL_RAM_MB}MB"
    echo "   Required: 1GB+ (1024MB)"
    echo ""
    echo "   .NET applications require at least 1GB RAM."
    echo "   Installation may fail or service may be unstable."
    echo ""
    echo "   Recommended: 2GB+ RAM for production use"
    echo ""
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Installation cancelled."
      exit 1
    fi
  else
    echo "✅ RAM check passed: ${TOTAL_RAM_MB}MB"
  fi
fi

# Detect architecture and OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64|amd64)
    ARCH="x64"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ;;
  armv7l)
    ARCH="arm"
    ;;
  armv6l)
    echo ""
    echo "❌ Raspberry Pi Zero / Pi 1 NOT Supported"
    echo ""
    echo "   .NET 9.0 does not support ARMv6 architecture."
    echo "   The Raspberry Pi Zero has only 512MB RAM which is"
    echo "   insufficient for .NET applications."
    echo ""
    echo "   Minimum requirements:"
    echo "   • Raspberry Pi 3 or newer (ARMv7/ARMv8)"
    echo "   • 1GB+ RAM"
    echo ""
    echo "   Please upgrade to Raspberry Pi 3, 4, or 5."
    echo ""
    exit 1
    ;;
  *)
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Determine the correct release asset
if [ "$OS" = "linux" ] && [ "$ARCH" = "arm" ]; then
  ASSET_NAME="servicesdashboard-pi-linux-arm.tar.gz"
elif [ "$OS" = "linux" ] && [ "$ARCH" = "arm64" ]; then
  ASSET_NAME="servicesdashboard-pi-linux-arm64.tar.gz"
elif [ "$OS" = "linux" ] && [ "$ARCH" = "x64" ]; then
  ASSET_NAME="servicesdashboard-linux-x64.tar.gz"
elif [ "$OS" = "darwin" ] && [ "$ARCH" = "x64" ]; then
  ASSET_NAME="servicesdashboard-macos-x64.tar.gz"
elif [ "$OS" = "darwin" ] && [ "$ARCH" = "arm64" ]; then
  ASSET_NAME="servicesdashboard-macos-arm64.tar.gz"
else
  echo "❌ Unsupported OS/Architecture combination: $OS/$ARCH"
  exit 1
fi

echo "📦 Detected: $OS/$ARCH"
echo "📥 Downloading: $ASSET_NAME"
echo ""

# Get the latest release URL
LATEST_RELEASE_URL="https://api.github.com/repos/$GITHUB_REPO/releases/latest"
DOWNLOAD_URL=$(curl -s "$LATEST_RELEASE_URL" | grep "browser_download_url.*$ASSET_NAME" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "❌ Could not find release asset: $ASSET_NAME"
  echo "Please check: https://github.com/$GITHUB_REPO/releases"
  exit 1
fi

# Create temporary directory
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Download and extract
echo "⬇️  Downloading from GitHub..."
curl -L -o "$TMP_DIR/servicesdashboard.tar.gz" "$DOWNLOAD_URL"

echo "📦 Extracting..."
cd "$TMP_DIR"
tar -xzf servicesdashboard.tar.gz

# Run the installation script
if [ -f "./install.sh" ]; then
  chmod +x ./install.sh
  ./install.sh
else
  echo "❌ Installation script not found in the package"
  exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎉 Services Dashboard has been installed successfully!"
echo ""
echo "📝 Next Steps:"
echo "   1. Start the service:"
echo "      sudo systemctl start servicesdashboard"
echo ""
echo "   2. Enable auto-start on boot:"
echo "      sudo systemctl enable servicesdashboard"
echo ""
echo "   3. Check service status:"
echo "      sudo systemctl status servicesdashboard"
echo ""
echo "   4. View logs:"
echo "      sudo journalctl -u servicesdashboard -f"
echo ""
echo "   5. Access the dashboard:"
echo "      http://$(hostname -I | awk '{print $1}'):5050"
echo ""
echo "📚 Documentation: https://github.com/$GITHUB_REPO"
echo ""
