# Analytics Module for PiGenStudio

## Overview

The Analytics Module is a comprehensive system monitoring and metrics collection tool designed for Raspberry Pi systems. It is automatically included in all Pi-Gen projects created with PiGenStudio, providing users with powerful monitoring capabilities out of the box.

## Features

### System Metrics Collection
- **CPU Temperature**: Monitors CPU temperature with configurable alert thresholds
- **Memory Usage**: Tracks memory consumption and alerts on high usage
- **CPU Usage**: Monitors CPU utilization percentage
- **Disk Usage**: Tracks disk space consumption
- **Load Average**: Monitors system load

### Performance Monitoring
- **Process Information**: Total running processes
- **Top CPU Consumers**: Identifies processes using most CPU
- **Top Memory Consumers**: Identifies processes using most memory
- **I/O Statistics**: Disk I/O performance metrics (when available)

### Network Metrics
- **Interface Statistics**: RX/TX bytes for network interfaces
- **Active Connections**: Number of established network connections
- **Listening Ports**: Identifies services listening on network ports

### Data Management
- **JSON Storage**: Metrics stored in structured JSON format
- **CSV Export**: Convert metrics to CSV for analysis in spreadsheet applications
- **Trend Analysis**: Compare metrics over time
- **Automated Cleanup**: Remove old metrics to prevent disk space issues

### Alert System
- **Configurable Thresholds**: Set custom alert levels for all metrics
- **Real-time Alerts**: Immediate notification when thresholds are exceeded
- **Logging**: All alerts logged for historical analysis

## Integration with PiGenStudio

### Automatic Inclusion

When you create a new Pi-Gen project in PiGenStudio, the analytics module is automatically included in the project structure:

```
project-root/
├── config
├── README.md
├── stage0/
├── stage1/
├── stage2/
└── scripts/
    ├── analytics.sh           # Main analytics script
    ├── analytics.conf         # Configuration file
    ├── install-analytics.sh   # Installation script
    └── README.md              # Detailed documentation
```

### Project Export

When you export your Pi-Gen project as a ZIP file, the analytics module is included automatically. Users who build images from your exported project will have the analytics module ready to install on their Raspberry Pi.

## Installation on Raspberry Pi

After flashing the SD card with a custom image built from a PiGenStudio project:

1. SSH into your Raspberry Pi
2. Navigate to the scripts directory
3. Run the installation script:

```bash
cd /path/to/scripts
sudo bash install-analytics.sh
```

The installation script will:
- Install the analytics script to `/usr/local/bin/analytics.sh`
- Copy configuration to `/etc/analytics/analytics.conf`
- Create the reports directory at `/var/log/analytics`
- Install required dependencies (jq, net-tools)
- Optionally set up automated collection via cron

## Usage

### Basic Commands

```bash
# Collect all metrics
analytics.sh collect

# Collect specific metrics
analytics.sh system        # System metrics only
analytics.sh performance   # Performance metrics only
analytics.sh network       # Network metrics only

# Interactive monitoring
analytics.sh monitor

# Generate a comprehensive report
analytics.sh report [output-file]

# Check service status
analytics.sh service <service-name>

# Export metrics to CSV
analytics.sh export /var/log/analytics/metrics-20231101.json

# Cleanup old metrics
analytics.sh cleanup [days]

# Show help
analytics.sh help
```

### Interactive Monitoring

The interactive monitoring mode provides a real-time dashboard:

```bash
analytics.sh monitor
```

Controls:
- **r** - Refresh display
- **q** - Quit monitoring
- **s** - Save current snapshot as report
- Auto-refreshes every 5 seconds

### Automated Collection

For continuous monitoring, set up automated collection with cron:

```bash
sudo crontab -e

# Add these lines:
# Collect metrics every 15 minutes
*/15 * * * * /usr/local/bin/analytics.sh collect >> /var/log/analytics/cron.log 2>&1

# Daily cleanup at 3 AM (keep last 30 days)
0 3 * * * /usr/local/bin/analytics.sh cleanup 30 >> /var/log/analytics/cron.log 2>&1
```

## Configuration

### Configuration File

Edit `/etc/analytics/analytics.conf` to customize behavior:

```bash
# Enable or disable metrics collection
COLLECT_METRICS=true

# Alert Thresholds
TEMPERATURE_THRESHOLD=70    # CPU temperature in °C
MEMORY_THRESHOLD=85         # Memory usage percentage
CPU_THRESHOLD=80            # CPU usage percentage

# Storage Configuration
REPORTS_DIR=/var/log/analytics
LOG_FILE=/var/log/analytics/analytics.log

# Data Retention
METRICS_RETENTION_DAYS=30
```

### Environment Variables

You can also override settings via environment variables:

```bash
TEMPERATURE_THRESHOLD=65 analytics.sh collect
```

## Output Formats

### JSON Metrics

Metrics are stored in JSON format at `/var/log/analytics/metrics-YYYYMMDD.json`:

```json
[
  {
    "timestamp": "2023-11-01T12:00:00Z",
    "cpu_temperature": 45,
    "memory_usage_percent": 65,
    "memory_used_bytes": 536870912,
    "memory_total_bytes": 1073741824,
    "cpu_usage_percent": 15.3,
    "load_average_1min": 0.45,
    "disk_usage_percent": 42
  }
]
```

### CSV Export

Convert JSON metrics to CSV for analysis:

```bash
analytics.sh export /var/log/analytics/metrics-20231101.json output.csv
```

CSV format:
```csv
timestamp,cpu_temperature,memory_usage_percent,memory_used_bytes,memory_total_bytes,cpu_usage_percent,load_average_1min,disk_usage_percent
2023-11-01T12:00:00Z,45,65,536870912,1073741824,15.3,0.45,42
```

### System Reports

Generate comprehensive text reports:

```bash
analytics.sh report /tmp/system-report.txt
```

Reports include:
- Current system metrics
- Performance statistics
- Network status
- System information
- Recent activity

## Use Cases

### Development & Testing
Monitor resource usage during application development and testing on Raspberry Pi.

### Production Monitoring
Track system health in production deployments with automated alerts.

### Performance Analysis
Export metrics to CSV and analyze trends in spreadsheet applications or data analysis tools.

### Troubleshooting
Generate detailed system reports when investigating issues.

### Capacity Planning
Track resource usage over time to plan for system upgrades.

## Advanced Examples

### Weekly Email Reports

```bash
#!/bin/bash
# weekly-report.sh - Send weekly system reports via email

REPORT_FILE="/tmp/weekly-report-$(date +%Y%m%d).txt"
analytics.sh report "$REPORT_FILE"
mail -s "Weekly Raspberry Pi Report - $(date +%Y-%m-%d)" admin@example.com < "$REPORT_FILE"
rm "$REPORT_FILE"
```

### Export Week's Metrics

```bash
#!/bin/bash
# export-week.sh - Export last 7 days of metrics to CSV

for day in {1..7}; do
  date_str=$(date -d "$day days ago" +%Y%m%d)
  metrics_file="/var/log/analytics/metrics-$date_str.json"

  if [ -f "$metrics_file" ]; then
    analytics.sh export "$metrics_file"
    echo "Exported metrics for $date_str"
  fi
done
```

### Custom Alerting

```bash
#!/bin/bash
# custom-alert.sh - Custom alert script

# Collect metrics and check for critical conditions
analytics.sh collect > /tmp/metrics-output.txt

if grep -q "ALERT" /tmp/metrics-output.txt; then
  # Send notification (example: using a webhook)
  curl -X POST https://your-webhook-url.com/alerts \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Critical alert on Raspberry Pi\", \"details\": \"$(cat /tmp/metrics-output.txt)\"}"
fi
```

## Dependencies

Required packages (automatically installed by install-analytics.sh):
- **jq**: JSON processing
- **net-tools**: Network statistics (netstat)
- **sysstat**: System statistics (optional, for iostat)

## File Locations

- **Script**: `/usr/local/bin/analytics.sh`
- **Configuration**: `/etc/analytics/analytics.conf`
- **Metrics**: `/var/log/analytics/metrics-YYYYMMDD.json`
- **Logs**: `/var/log/analytics/analytics.log`
- **Reports**: `/var/log/analytics/system_report_*.txt`
- **Cron Logs**: `/var/log/analytics/cron.log`

## Troubleshooting

### Permission Errors

Ensure the script has execute permissions:
```bash
sudo chmod +x /usr/local/bin/analytics.sh
```

### Missing Dependencies

Install manually if needed:
```bash
sudo apt-get update
sudo apt-get install jq net-tools sysstat
```

### Disk Space Issues

If metrics are consuming too much space:
```bash
# Keep only last 7 days
analytics.sh cleanup 7

# Or manually remove old files
sudo rm /var/log/analytics/metrics-2023*.json
```

### No Temperature Data

Some systems may not expose temperature sensors. The script will show 0°C if the sensor is not available.

## Security Considerations

- The analytics script requires root privileges for installation and some metrics collection
- Metrics files may contain sensitive system information - restrict access appropriately
- Consider encrypting metrics if storing sensitive data
- Use secure methods (SSH, VPN) when accessing metrics remotely

## Performance Impact

- Minimal CPU usage (< 1% during collection)
- Memory footprint: < 10MB
- Disk usage: ~1-5MB per day (JSON metrics)
- Network: No network traffic (local monitoring only)

## Future Enhancements

Potential additions (not yet implemented):
- Email alerts
- Webhook notifications
- Web dashboard
- Database storage (InfluxDB, Prometheus)
- Grafana integration
- Docker container monitoring
- GPU monitoring (for Raspberry Pi 4+)

## Contributing

To improve the analytics module:
1. Edit the scripts in `/scripts/` directory
2. Test on a Raspberry Pi
3. Update documentation
4. Submit changes through PiGenStudio

## License

This analytics module is part of PiGenStudio and is provided as-is for use in Pi-Gen projects.

## Support

For issues or questions:
- Check the troubleshooting section
- Review the scripts/README.md file in your exported project
- Consult Raspberry Pi community forums
- Refer to PiGenStudio documentation
