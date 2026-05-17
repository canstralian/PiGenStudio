#!/bin/bash

# Analytics Module Installation Script
# This script installs the analytics module on a Raspberry Pi

set -e

echo "========================================"
echo "Analytics Module Installation"
echo "========================================"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Create necessary directories
echo "[1/5] Creating directories..."
mkdir -p /usr/local/bin
mkdir -p /etc/analytics
mkdir -p /var/log/analytics

# Copy analytics script
echo "[2/5] Installing analytics script..."
if [[ -f "analytics.sh" ]]; then
  cp analytics.sh /usr/local/bin/analytics.sh
  chmod +x /usr/local/bin/analytics.sh
  echo "  ✓ Analytics script installed to /usr/local/bin/analytics.sh"
else
  echo "  ✗ Error: analytics.sh not found in current directory"
  exit 1
fi

# Copy configuration file
echo "[3/5] Installing configuration..."
if [[ -f "analytics.conf" ]]; then
  if [[ ! -f /etc/analytics/analytics.conf ]]; then
    cp analytics.conf /etc/analytics/analytics.conf
    echo "  ✓ Configuration installed to /etc/analytics/analytics.conf"
  else
    echo "  ⚠ Configuration already exists at /etc/analytics/analytics.conf (skipping)"
    echo "    If you want to update it, manually copy analytics.conf"
  fi
else
  echo "  ⚠ analytics.conf not found (optional, using defaults)"
fi

# Install dependencies
echo "[4/5] Checking dependencies..."
MISSING_DEPS=()

# Check for jq (for JSON processing)
if ! command -v jq &> /dev/null; then
  MISSING_DEPS+=("jq")
fi

# Check for netstat
if ! command -v netstat &> /dev/null; then
  MISSING_DEPS+=("net-tools")
fi

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
  echo "  Installing missing dependencies: ${MISSING_DEPS[*]}"
  apt-get update -qq
  apt-get install -y "${MISSING_DEPS[@]}"
  echo "  ✓ Dependencies installed"
else
  echo "  ✓ All dependencies already installed"
fi

# Set up cron jobs (optional)
echo "[5/5] Setting up automated collection (optional)..."
read -p "Do you want to enable automatic metrics collection every 15 minutes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Check if cron job already exists
  if ! crontab -l 2>/dev/null | grep -q "analytics.sh collect"; then
    (crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/analytics.sh collect >> /var/log/analytics/cron.log 2>&1") | crontab -
    echo "  ✓ Cron job added for automatic collection every 15 minutes"
  else
    echo "  ⚠ Cron job already exists"
  fi

  # Add daily cleanup
  if ! crontab -l 2>/dev/null | grep -q "analytics.sh cleanup"; then
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/analytics.sh cleanup >> /var/log/analytics/cron.log 2>&1") | crontab -
    echo "  ✓ Cron job added for daily cleanup at 3 AM"
  fi
else
  echo "  Skipped automatic collection setup"
  echo "  You can run manually with: analytics.sh collect"
fi

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Usage:"
echo "  analytics.sh collect      - Collect metrics once"
echo "  analytics.sh monitor      - Start interactive monitoring"
echo "  analytics.sh report       - Generate system report"
echo "  analytics.sh help         - Show all available commands"
echo ""
echo "Configuration:"
echo "  Edit /etc/analytics/analytics.conf to customize settings"
echo ""
echo "Logs and Reports:"
echo "  Metrics: /var/log/analytics/metrics-YYYYMMDD.json"
echo "  Logs: /var/log/analytics/analytics.log"
echo ""
