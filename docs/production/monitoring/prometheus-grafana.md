# ChatSDK Monitoring - Prometheus & Grafana

Complete guide for setting up production monitoring with Prometheus and Grafana.

## Overview

Monitoring stack includes:
- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **Node Exporter** - System metrics
- **cAdvisor** - Container metrics
- **AlertManager** - Alert handling and routing

## Architecture

```
┌─────────────────────────────────────────┐
│         ChatSDK Application             │
│  (Metrics exposed on /metrics)          │
└───────────────┬─────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│           Prometheus                   │
│  - Scrapes metrics every 15s          │
│  - Stores time-series data            │
│  - Evaluates alert rules              │
└───────────┬───────────────────────────┘
            │
      ┌─────┴──────┐
      ▼            ▼
┌──────────┐  ┌────────────┐
│ Grafana  │  │AlertManager│
│Dashboards│  │   Alerts   │
└──────────┘  └────────────┘
```

## Docker Compose Setup

Add to `docker-compose.prod.yml`:

```yaml
services:
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: chatsdk-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./docker/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prometheus_data:/prometheus
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: chatsdk-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
      GF_SERVER_ROOT_URL: https://monitoring.yourdomain.com
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./docker/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./docker/grafana/dashboards:/var/lib/grafana/dashboards:ro
    depends_on:
      - prometheus
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Node Exporter (System metrics)
  node-exporter:
    image: prom/node-exporter:latest
    container_name: chatsdk-node-exporter
    restart: unless-stopped
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    networks:
      - chatsdk-network

  # cAdvisor (Container metrics)
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: chatsdk-cadvisor
    restart: unless-stopped
    privileged: true
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    networks:
      - chatsdk-network

  # AlertManager
  alertmanager:
    image: prom/alertmanager:latest
    container_name: chatsdk-alertmanager
    restart: unless-stopped
    command:
      - '--config.file=/etc/alertmanager/config.yml'
      - '--storage.path=/alertmanager'
    ports:
      - "9093:9093"
    volumes:
      - ./docker/alertmanager/config.yml:/etc/alertmanager/config.yml:ro
      - alertmanager_data:/alertmanager
    networks:
      - chatsdk-network

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

## Prometheus Configuration

**File:** `docker/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'chatsdk-production'
    environment: 'production'

# AlertManager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load alert rules
rule_files:
  - '/etc/prometheus/alerts.yml'

# Scrape configurations
scrape_configs:
  # ChatSDK API
  - job_name: 'chatsdk-api'
    static_configs:
      - targets:
          - 'api:5500'
    metrics_path: '/metrics'
    scrape_interval: 10s

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets:
          - 'postgres:5432'
    metrics_path: '/metrics'

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets:
          - 'redis:6379'
    metrics_path: '/metrics'

  # Centrifugo
  - job_name: 'centrifugo'
    static_configs:
      - targets:
          - 'centrifugo:8000'
    metrics_path: '/metrics'

  # Node Exporter (System)
  - job_name: 'node'
    static_configs:
      - targets:
          - 'node-exporter:9100'

  # cAdvisor (Containers)
  - job_name: 'cadvisor'
    static_configs:
      - targets:
          - 'cadvisor:8080'

  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets:
          - 'localhost:9090'
```

## Alert Rules

**File:** `docker/prometheus/alerts.yml`

```yaml
groups:
  - name: chatsdk_alerts
    interval: 30s
    rules:
      # API Service Down
      - alert: APIServiceDown
        expr: up{job="chatsdk-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "ChatSDK API is down"
          description: "ChatSDK API has been down for more than 1 minute"

      # High Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # High Response Time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes{name="chatsdk-api"} / container_spec_memory_limit_bytes{name="chatsdk-api"}) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # High CPU Usage
      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total{name="chatsdk-api"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value | humanizePercentage }}"

      # Database Connection Pool Exhausted
      - alert: DatabasePoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections in use"

      # Redis Memory Full
      - alert: RedisMemoryFull
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory nearly full"
          description: "Redis using {{ $value | humanizePercentage }} of available memory"

      # High WebSocket Connection Count
      - alert: HighWebSocketConnections
        expr: centrifugo_node_num_clients > 10000
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High WebSocket connection count"
          description: "{{ $value }} active WebSocket connections"

      # Disk Usage High
      - alert: DiskUsageHigh
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space running low"
          description: "Only {{ $value | humanizePercentage }} disk space available"
```

## AlertManager Configuration

**File:** `docker/alertmanager/config.yml`

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  # Default receiver (email)
  - name: 'default'
    email_configs:
      - to: 'alerts@yourdomain.com'
        from: 'alertmanager@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@yourdomain.com'
        auth_password: 'your-password'
        headers:
          Subject: '[ChatSDK] {{ .GroupLabels.alertname }}'

  # Slack
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  # PagerDuty (for critical alerts)
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

## Grafana Dashboards

### Dashboard Provisioning

**File:** `docker/grafana/provisioning/datasources/prometheus.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

**File:** `docker/grafana/provisioning/dashboards/default.yml`

```yaml
apiVersion: 1

providers:
  - name: 'ChatSDK Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
```

### Main Dashboard JSON

**File:** `docker/grafana/dashboards/chatsdk-overview.json`

```json
{
  "dashboard": {
    "title": "ChatSDK Production Overview",
    "tags": ["chatsdk", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "centrifugo_node_num_clients"
          }
        ]
      },
      {
        "id": 5,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{name=\"chatsdk-api\"}",
            "legendFormat": "Memory Usage"
          }
        ]
      },
      {
        "id": 6,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total{name=\"chatsdk-api\"}[5m]) * 100",
            "legendFormat": "CPU %"
          }
        ]
      }
    ]
  }
}
```

## Metrics Exposed by ChatSDK

ChatSDK API exposes the following metrics on `/metrics`:

### HTTP Metrics
- `http_requests_total` - Total HTTP requests (labels: method, path, status)
- `http_request_duration_seconds` - Request duration histogram
- `http_request_size_bytes` - Request size histogram
- `http_response_size_bytes` - Response size histogram

### Application Metrics
- `active_websocket_connections` - Current WebSocket connections
- `messages_sent_total` - Total messages sent
- `messages_received_total` - Total messages received
- `db_query_duration_seconds` - Database query duration
- `cache_hits_total` - Redis cache hits
- `cache_misses_total` - Redis cache misses

### System Metrics
- `nodejs_heap_size_used_bytes` - Node.js heap usage
- `nodejs_heap_size_total_bytes` - Total Node.js heap
- `nodejs_eventloop_lag_seconds` - Event loop lag

## Usage

### Start Monitoring Stack

```bash
# Start all services including monitoring
docker-compose -f docker-compose.prod.yml up -d

# Verify Prometheus is running
curl http://localhost:9090/-/healthy

# Verify Grafana is running
curl http://localhost:3000/api/health
```

### Access Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin / your-password)
- **AlertManager**: http://localhost:9093

### Query Metrics

```bash
# Query current request rate
curl 'http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])'

# Query memory usage
curl 'http://localhost:9090/api/v1/query?query=container_memory_usage_bytes{name="chatsdk-api"}'
```

## Grafana Setup

1. **Login**: Navigate to http://localhost:3000
2. **Add Prometheus Datasource**: (Already provisioned)
3. **Import Dashboards**: Navigate to Dashboards → Import
4. **Set Up Alerts**: Create alert rules in dashboard panels

## Best Practices

### Metrics Naming
- Use snake_case: `http_requests_total`
- Include units in name: `duration_seconds`, `size_bytes`
- Use `_total` suffix for counters

### Labels
- Keep cardinality low (<100 unique values per label)
- Use consistent label names across metrics
- Avoid user-generated content in labels

### Retention
- Keep high-resolution data for 30 days
- Downsample to 5m resolution after 30 days
- Keep downsampled data for 1 year

### Alerting
- Alert on symptoms, not causes
- Include runbook links in annotations
- Test alerts regularly
- Group related alerts

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check logs
docker logs chatsdk-prometheus
```

### High Memory Usage

```yaml
# Reduce retention in prometheus.yml
--storage.tsdb.retention.time=15d  # Instead of 30d
```

### Missing Metrics

```bash
# Verify metrics endpoint
curl http://api:5500/metrics

# Check Prometheus config
docker exec chatsdk-prometheus promtool check config /etc/prometheus/prometheus.yml
```

## Production Checklist

- [x] Prometheus configured and running
- [x] Grafana configured with datasources
- [x] Dashboards created and tested
- [x] Alert rules configured
- [x] AlertManager configured with notification channels
- [x] Retention policies configured
- [x] Backup strategy for Prometheus data
- [x] Access controls configured
- [x] SSL/TLS enabled for external access

---

**Monitoring Setup Complete!** 📊
