#!/bin/bash

# Analytics Module
# Metrics collection and system analytics for Raspberry Pi
# This script collects system metrics, performance data, and network statistics

# Default configuration - can be overridden by analytics.conf
COLLECT_METRICS="${COLLECT_METRICS:-true}"
TEMPERATURE_THRESHOLD="${TEMPERATURE_THRESHOLD:-70}"
MEMORY_THRESHOLD="${MEMORY_THRESHOLD:-85}"
CPU_THRESHOLD="${CPU_THRESHOLD:-80}"
REPORTS_DIR="${REPORTS_DIR:-/var/log/analytics}"
LOG_FILE="${LOG_FILE:-/var/log/analytics/analytics.log}"

# Load configuration if exists
if [[ -f "/etc/analytics/analytics.conf" ]]; then
  source /etc/analytics/analytics.conf
fi

# Ensure reports directory exists
mkdir -p "$REPORTS_DIR"

# Logging functions
log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" | tee -a "$LOG_FILE"
}

log_warn() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" | tee -a "$LOG_FILE"
}

collect_analytics() {
  echo "=== COLLECTING ANALYTICS & METRICS ==="
  echo ""

  if [[ "${COLLECT_METRICS:-true}" == "true" ]]; then
    collect_system_metrics
    echo ""
    collect_performance_metrics
    echo ""
    collect_network_metrics
    echo ""
    analyze_trends
  else
    echo "Metrics collection is disabled in configuration"
  fi
}

collect_system_metrics() {
  echo "System Metrics:"
  echo "-------------"

  local metrics_file="${REPORTS_DIR}/metrics-$(date +%Y%m%d).json"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # CPU metrics
  local cpu_temp=0
  if [[ -f /sys/class/thermal/thermal_zone0/temp ]]; then
    cpu_temp=$(($(cat /sys/class/thermal/thermal_zone0/temp) / 1000))
  fi

  # Memory metrics
  local mem_info=$(free -b | grep "Mem:")
  local mem_total=$(echo $mem_info | awk '{print $2}')
  local mem_used=$(echo $mem_info | awk '{print $3}')
  local mem_free=$(echo $mem_info | awk '{print $4}')
  local mem_usage_percent=$((mem_used * 100 / mem_total))

  # CPU usage (1-minute average)
  local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | sed 's/us,//')
  cpu_usage=${cpu_usage:-0}

  # Load average
  local load_1min=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs)

  # Disk usage
  local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

  echo "CPU Temperature: ${cpu_temp}°C"
  echo "Memory Usage: ${mem_usage_percent}% (${mem_used}/${mem_total} bytes)"
  echo "CPU Usage: ${cpu_usage}%"
  echo "Load Average (1min): ${load_1min}"
  echo "Disk Usage: ${disk_usage}%"

  # Store metrics in JSON format
  local json_entry="{
    \"timestamp\": \"$timestamp\",
    \"cpu_temperature\": $cpu_temp,
    \"memory_usage_percent\": $mem_usage_percent,
    \"memory_used_bytes\": $mem_used,
    \"memory_total_bytes\": $mem_total,
    \"cpu_usage_percent\": ${cpu_usage:-0},
    \"load_average_1min\": ${load_1min:-0},
    \"disk_usage_percent\": $disk_usage
  }"

  # Append to metrics file
  if [[ -f "$metrics_file" ]]; then
    # Remove the closing bracket, add comma and new entry
    sed -i '$ s/]/,' "$metrics_file"
    echo "  $json_entry" >> "$metrics_file"
    echo "]" >> "$metrics_file"
  else
    # Create new metrics file
    echo "[" > "$metrics_file"
    echo "  $json_entry" >> "$metrics_file"
    echo "]" >> "$metrics_file"
  fi

  log_info "System metrics collected and stored in $metrics_file"

  # Check thresholds and alert
  check_metric_thresholds $cpu_temp $mem_usage_percent $cpu_usage $disk_usage
}

check_metric_thresholds() {
  local cpu_temp=$1
  local mem_usage=$2
  local cpu_usage=$3
  local disk_usage=$4

  # Temperature threshold
  if [[ $cpu_temp -gt ${TEMPERATURE_THRESHOLD:-70} ]]; then
    echo "🔥 ALERT: High CPU temperature detected: ${cpu_temp}°C"
    log_warn "Temperature threshold exceeded: ${cpu_temp}°C"
  fi

  # Memory threshold
  if [[ $mem_usage -gt ${MEMORY_THRESHOLD:-85} ]]; then
    echo "🔴 ALERT: High memory usage detected: ${mem_usage}%"
    log_warn "Memory threshold exceeded: ${mem_usage}%"
  fi

  # CPU threshold
  if [[ $cpu_usage -gt ${CPU_THRESHOLD:-80} ]]; then
    echo "⚡ ALERT: High CPU usage detected: ${cpu_usage}%"
    log_warn "CPU threshold exceeded: ${cpu_usage}%"
  fi

  # Disk threshold
  if [[ $disk_usage -gt 90 ]]; then
    echo "💾 ALERT: High disk usage detected: ${disk_usage}%"
    log_warn "Disk usage critical: ${disk_usage}%"
  fi
}

collect_performance_metrics() {
  echo "Performance Metrics:"
  echo "------------------"

  # Process information
  local process_count=$(ps aux | wc -l)
  echo "Running processes: $process_count"

  # Top CPU consumers
  echo "Top 5 CPU consumers:"
  ps aux --sort=-%cpu | head -6 | tail -5 | while read line; do
    echo "  $(echo "$line" | awk '{print $11 ": " $3"%"}')"
  done

  # Top memory consumers
  echo "Top 5 Memory consumers:"
  ps aux --sort=-%mem | head -6 | tail -5 | while read line; do
    echo "  $(echo "$line" | awk '{print $11 ": " $4"%"}')"
  done

  # I/O statistics (if available)
  if command -v iostat >/dev/null 2>&1; then
    echo "I/O Statistics:"
    iostat -x 1 1 | grep -A 10 "Device"
  fi
}

collect_network_metrics() {
  echo "Network Metrics:"
  echo "--------------"

  # Network interface statistics
  if [[ -f /proc/net/dev ]]; then
    echo "Network Interface Statistics:"
    cat /proc/net/dev | grep -E "(eth|wlan)" | while read line; do
      local interface=$(echo "$line" | awk -F: '{print $1}' | xargs)
      local rx_bytes=$(echo "$line" | awk '{print $2}')
      local tx_bytes=$(echo "$line" | awk '{print $10}')

      # Convert to human readable
      local rx_mb=$((rx_bytes / 1024 / 1024))
      local tx_mb=$((tx_bytes / 1024 / 1024))

      echo "  $interface: RX ${rx_mb}MB, TX ${tx_mb}MB"
    done
  fi

  # Network connections
  echo "Active network connections:"
  netstat -tn 2>/dev/null | grep ESTABLISHED | wc -l | xargs echo "  Established connections:"

  # Port listeners
  echo "Listening ports:"
  netstat -tlnp 2>/dev/null | grep LISTEN | head -5 | while read line; do
    local port=$(echo "$line" | awk '{print $4}' | cut -d: -f2)
    local process=$(echo "$line" | awk '{print $7}' | cut -d/ -f2)
    echo "  Port $port: $process"
  done
}

analyze_trends() {
  echo "Trend Analysis:"
  echo "--------------"

  # Get today's and yesterday's metrics files
  local today_file="${REPORTS_DIR}/metrics-$(date +%Y%m%d).json"
  local yesterday_file="${REPORTS_DIR}/metrics-$(date -d yesterday +%Y%m%d).json"

  if [[ -f "$yesterday_file" ]] && [[ -f "$today_file" ]]; then
    echo "Comparing today's metrics with yesterday..."

    # Get average CPU temp from yesterday
    local yesterday_avg_temp=$(jq '[.[].cpu_temperature] | add / length' "$yesterday_file" 2>/dev/null || echo "N/A")
    local today_avg_temp=$(jq '[.[].cpu_temperature] | add / length' "$today_file" 2>/dev/null || echo "N/A")

    if [[ "$yesterday_avg_temp" != "N/A" ]] && [[ "$today_avg_temp" != "N/A" ]]; then
      echo "  Average CPU Temperature: Yesterday: ${yesterday_avg_temp}°C, Today: ${today_avg_temp}°C"
    fi
  else
    echo "Insufficient data for trend analysis (need at least 2 days of metrics)"
  fi
}

generate_system_report() {
  local report_file="$1"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

  echo "Generating comprehensive system report..."

  {
    echo "System Monitoring Report"
    echo "========================"
    echo "Generated: $timestamp"
    echo "Host: $(hostname)"
    echo "Kernel: $(uname -r)"
    echo "Uptime: $(uptime -p)"
    echo ""

    collect_system_metrics
    echo ""
    collect_performance_metrics
    echo ""
    collect_network_metrics
    echo ""

    # Additional system information
    echo "System Information:"
    echo "------------------"
    echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")"
    echo "Architecture: $(uname -m)"
    echo "Processor: $(grep -m1 "model name" /proc/cpuinfo 2>/dev/null | cut -d: -f2 | xargs || echo "Unknown")"

    # Disk information
    echo ""
    echo "Disk Usage by Mount Point:"
    df -h | grep -v tmpfs | grep -v udev

    # Recently modified files (potential activity indicators)
    echo ""
    echo "Recently Modified Files (last 24 hours):"
    find /var/log -name "*.log" -mtime -1 2>/dev/null | head -5 | while read file; do
      echo "  $file ($(stat -c %y "$file" | cut -d. -f1))"
    done

  } > "$report_file"

  log_info "System report generated: $report_file"
}

interactive_monitoring() {
  while true; do
    clear
    echo "🖥️  Real-time System Monitor"
    echo "=============================="
    echo "Press Ctrl+C to exit"
    echo ""

    collect_system_metrics
    echo ""
    echo "Last updated: $(date)"
    echo ""
    echo "Commands: [r]efresh [q]uit [s]ave report"

    # Non-blocking read with timeout
    read -t 5 -n 1 key 2>/dev/null
    case $key in
      r|R) continue ;;
      q|Q) break ;;
      s|S)
        local report_name="${REPORTS_DIR}/system_report_$(date +%Y%m%d_%H%M%S).txt"
        generate_system_report "$report_name"
        echo "Report saved as: $report_name"
        read -p "Press Enter to continue..."
        ;;
    esac
  done
}

# Service management functions
service_status() {
  local service_name="$1"

  if [[ -z "$service_name" ]]; then
    echo "Usage: service_status <service_name>"
    return 1
  fi

  echo "Service Status: $service_name"
  echo "============================="
  echo ""

  if systemctl is-active --quiet "$service_name" 2>/dev/null; then
    echo "✅ Status: Active (running)"
  else
    echo "❌ Status: Inactive"
  fi

  if systemctl is-enabled --quiet "$service_name" 2>/dev/null; then
    echo "🔄 Enabled: Yes (starts on boot)"
  else
    echo "⭕ Enabled: No"
  fi

  echo ""
  echo "Recent logs:"
  journalctl -u "$service_name" -n 10 --no-pager 2>/dev/null || echo "  No logs available"
}

# Export metrics to CSV
export_metrics_csv() {
  local input_file="$1"
  local output_file="${2:-${input_file%.json}.csv}"

  if [[ ! -f "$input_file" ]]; then
    echo "Error: Input file not found: $input_file"
    return 1
  fi

  echo "Exporting metrics to CSV format..."

  # Create CSV header
  echo "timestamp,cpu_temperature,memory_usage_percent,memory_used_bytes,memory_total_bytes,cpu_usage_percent,load_average_1min,disk_usage_percent" > "$output_file"

  # Parse JSON and convert to CSV
  jq -r '.[] | [.timestamp, .cpu_temperature, .memory_usage_percent, .memory_used_bytes, .memory_total_bytes, .cpu_usage_percent, .load_average_1min, .disk_usage_percent] | @csv' "$input_file" >> "$output_file"

  echo "CSV export completed: $output_file"
  log_info "Metrics exported to CSV: $output_file"
}

# Cleanup old metrics
cleanup_old_metrics() {
  local days_to_keep="${1:-30}"

  echo "Cleaning up metrics older than $days_to_keep days..."

  find "$REPORTS_DIR" -name "metrics-*.json" -mtime +$days_to_keep -delete
  find "$REPORTS_DIR" -name "*.txt" -mtime +$days_to_keep -delete
  find "$REPORTS_DIR" -name "*.csv" -mtime +$days_to_keep -delete

  log_info "Cleaned up metrics older than $days_to_keep days"
}

# Display usage information
show_usage() {
  cat <<EOF
Analytics Module - System Metrics Collection for Raspberry Pi

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  collect               Collect all analytics and metrics (default)
  system               Collect system metrics only
  performance          Collect performance metrics only
  network              Collect network metrics only
  monitor              Start interactive real-time monitoring
  report [FILE]        Generate comprehensive system report
  service <name>       Check service status
  export <file>        Export JSON metrics to CSV
  cleanup [days]       Cleanup old metrics (default: 30 days)
  help                 Show this help message

Environment Variables:
  COLLECT_METRICS       Enable/disable metrics collection (default: true)
  TEMPERATURE_THRESHOLD CPU temperature alert threshold (default: 70°C)
  MEMORY_THRESHOLD     Memory usage alert threshold (default: 85%)
  CPU_THRESHOLD        CPU usage alert threshold (default: 80%)
  REPORTS_DIR          Directory for storing reports (default: /var/log/analytics)

Configuration File:
  /etc/analytics/analytics.conf - Override default settings

Examples:
  $0 collect                    # Collect all metrics
  $0 monitor                    # Start interactive monitoring
  $0 report /tmp/report.txt     # Generate report
  $0 service sshd               # Check SSH service status
  $0 export /var/log/analytics/metrics-20231101.json
  $0 cleanup 15                 # Keep only last 15 days

EOF
}

# Main execution
main() {
  local command="${1:-collect}"

  case "$command" in
    collect)
      collect_analytics
      ;;
    system)
      collect_system_metrics
      ;;
    performance)
      collect_performance_metrics
      ;;
    network)
      collect_network_metrics
      ;;
    monitor)
      interactive_monitoring
      ;;
    report)
      local report_file="${2:-${REPORTS_DIR}/system_report_$(date +%Y%m%d_%H%M%S).txt}"
      generate_system_report "$report_file"
      echo "Report generated: $report_file"
      ;;
    service)
      service_status "$2"
      ;;
    export)
      if [[ -z "$2" ]]; then
        echo "Error: Please specify input JSON file"
        echo "Usage: $0 export <input.json> [output.csv]"
        exit 1
      fi
      export_metrics_csv "$2" "$3"
      ;;
    cleanup)
      cleanup_old_metrics "$2"
      ;;
    help|--help|-h)
      show_usage
      ;;
    *)
      echo "Unknown command: $command"
      echo ""
      show_usage
      exit 1
      ;;
  esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
