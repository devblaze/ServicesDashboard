#!/bin/bash

#
# Services Dashboard - Raspberry Pi Build Script
# Builds self-contained releases for Raspberry Pi devices
#

set -e

echo "🔨 Building Services Dashboard for Raspberry Pi..."
echo ""

# Change to the ServicesDashboard directory
cd ServicesDashboard

# Build for Raspberry Pi 3/4/5 (ARMv7 - 32-bit)
echo "📦 Building for Raspberry Pi 3/4/5 (ARMv7 - linux-arm)..."
dotnet publish \
    --runtime linux-arm \
    --self-contained true \
    --configuration Release \
    -p:PublishTrimmed=false \
    -p:PublishSingleFile=false \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:IncludeAllContentForSelfExtract=true \
    -p:EnableCompressionInSingleFile=false \
    -o ../publish/linux-arm

echo "✅ ARMv7 build complete: publish/linux-arm"
echo ""

# Build for Raspberry Pi 4/5 (ARM64 - 64-bit)
echo "📦 Building for Raspberry Pi 4/5 (ARM64 - linux-arm64)..."
dotnet publish \
    --runtime linux-arm64 \
    --self-contained true \
    --configuration Release \
    -p:PublishTrimmed=false \
    -p:PublishSingleFile=false \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:IncludeAllContentForSelfExtract=true \
    -p:EnableCompressionInSingleFile=false \
    -o ../publish/linux-arm64

echo "✅ ARM64 build complete: publish/linux-arm64"
echo ""

cd ..

# Create installation packages
echo "📦 Creating installation packages..."

# Function to create package
create_package() {
    local ARCH=$1
    local OUTPUT_NAME=$2

    echo "  Creating $OUTPUT_NAME..."

    # Create temporary directory
    TEMP_DIR=$(mktemp -d)

    # Copy published files
    cp -r publish/$ARCH "$TEMP_DIR/servicesdashboard"

    # Create installation script
    cat > "$TEMP_DIR/install.sh" << 'INSTALL_EOF'
#!/bin/bash
set -e

echo "📦 Installing Services Dashboard..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Installation directory
INSTALL_DIR="/opt/servicesdashboard"

# Stop service if running
systemctl stop servicesdashboard 2>/dev/null || true

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy files
echo "📁 Copying files to $INSTALL_DIR..."
cp -r servicesdashboard/* "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/ServicesDashboard"

# Create systemd service
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/servicesdashboard.service << EOF
[Unit]
Description=Services Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/ServicesDashboard
Restart=always
RestartSec=10
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5050

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

echo "✅ Installation complete!"
echo ""
echo "To start the service:"
echo "  sudo systemctl start servicesdashboard"
echo ""
echo "To enable auto-start on boot:"
echo "  sudo systemctl enable servicesdashboard"
echo ""
echo "To check status:"
echo "  sudo systemctl status servicesdashboard"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u servicesdashboard -f"
echo ""
INSTALL_EOF

    chmod +x "$TEMP_DIR/install.sh"

    # Create tarball
    cd "$TEMP_DIR"
    tar -czf "$OUTPUT_NAME" install.sh servicesdashboard/
    cd - > /dev/null

    # Move to output directory
    mkdir -p releases
    mv "$TEMP_DIR/$OUTPUT_NAME" releases/

    # Cleanup
    rm -rf "$TEMP_DIR"

    echo "  ✅ Created: releases/$OUTPUT_NAME"
}

create_package "linux-arm" "servicesdashboard-pi-linux-arm.tar.gz"
create_package "linux-arm64" "servicesdashboard-pi-linux-arm64.tar.gz"

echo ""
echo "🎉 Build complete!"
echo ""
echo "📦 Release packages created in ./releases/"
echo "   - servicesdashboard-pi-linux-arm.tar.gz (Raspberry Pi 3/4/5 - 32-bit)"
echo "   - servicesdashboard-pi-linux-arm64.tar.gz (Raspberry Pi 4/5 - 64-bit)"
echo ""
echo "To install on Raspberry Pi:"
echo "  1. Copy the appropriate package to your Raspberry Pi"
echo "  2. Extract: tar -xzf servicesdashboard-pi-linux-arm.tar.gz"
echo "  3. Run: sudo ./install.sh"
echo ""
