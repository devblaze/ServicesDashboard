#!/bin/bash
#
# Services Dashboard - One-Line Installer
# Usage: curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/ServicesDashboard/main/install.sh | sudo bash
#

set -e

REPO_OWNER="${REPO_OWNER:-devblaze}"
REPO_NAME="${REPO_NAME:-ServicesDashboard}"
GITHUB_REPO="$REPO_OWNER/$REPO_NAME"

echo "🚀 Services Dashboard Installer"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
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
    ARCH="arm"
    echo "📟 Detected Raspberry Pi Zero"
    ;;
  *)
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Determine the correct release asset
if [ "$OS" = "linux" ] && [ "$ARCH" = "arm" ]; then
  ASSET_NAME="servicesdashboard-pizero-linux-arm.tar.gz"
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
