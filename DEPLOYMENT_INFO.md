# ChatSDK Test Deployment - Access Information

🎉 **ChatSDK is now deployed and running!**

## Service Status

All services are healthy and running:

| Service | Status | Port | Purpose |
|---------|--------|------|---------|
| **ChatSDK API** | ✅ Healthy | 5501 | Main API Server |
| **PostgreSQL** | ✅ Healthy | 5433 | Database |
| **Redis** | ✅ Healthy | 6380 | Cache & Pub/Sub |
| **Centrifugo** | ✅ Healthy | 8001 | WebSocket/Real-time |
| **MinIO** | ✅ Healthy | 9003 (API), 9004 (Console) | S3 Storage |
| **Inngest** | ✅ Running | 8289 | Async Workers |
| **Prometheus** | ✅ Running | 9091 | Metrics Collection |
| **Grafana** | ✅ Running | 3001 | Dashboards |

## Access URLs

### Main Services

- **ChatSDK API**: http://localhost:5501
  - Health: http://localhost:5501/health
  - Metrics: http://localhost:5501/metrics
  - API Docs: http://localhost:5501/api

- **Grafana Dashboard**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`

- **MinIO Console**: http://localhost:9004
  - Username: `chatsdk`
  - Password: `chatsdk_minio_test_123`

- **Prometheus**: http://localhost:9091
  - Targets: http://localhost:9091/targets
  - Alerts: http://localhost:9091/alerts

- **Inngest Dev Server**: http://localhost:8289

- **Centrifugo**: http://localhost:8001
  - Health: http://localhost:8001/health

### Database Connections

**PostgreSQL:**
```
Host: localhost
Port: 5433
Database: chatsdk
Username: chatsdk
Password: chatsdk_test_123
```

**Redis:**
```
Host: localhost
Port: 6380
Password: chatsdk_redis_test_123
```

## Test Credentials

### Service Credentials

| Service | Username | Password |
|---------|----------|----------|
| PostgreSQL | `chatsdk` | `chatsdk_test_123` |
| Redis | - | `chatsdk_redis_test_123` |
| MinIO | `chatsdk` | `chatsdk_minio_test_123` |
| Grafana | `admin` | `admin` |

### API Authentication

**Internal Secrets:**
- JWT Secret: `test_jwt_secret_key_for_testing_123`
- Centrifugo API Key: `test_centrifugo_api_key_123`
- Centrifugo Token Secret: `test_centrifugo_secret_key_123`
- Inngest Event Key: `test_inngest_event_key_123`
- Inngest Signing Key: `test_inngest_signing_key_123`

## Quick Start Testing

### 1. Create an Application

```bash
curl -X POST http://localhost:5501/api/apps \
  -H "Content-Type: application/json" \
  -d '{"name":"My Test App","description":"Testing ChatSDK"}'
```

This will return an `api_key` that you'll use for subsequent requests.

### 2. Create a User

```bash
curl -X POST http://localhost:5501/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "external_id":"user-1",
    "name":"John Doe",
    "email":"john@example.com"
  }'
```

### 3. Create a Channel

```bash
curl -X POST http://localhost:5501/api/channels \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "app_id":"YOUR_APP_ID",
    "name":"General",
    "type":"public"
  }'
```

### 4. Send a Message

```bash
curl -X POST http://localhost:5501/api/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "channel_id":"YOUR_CHANNEL_ID",
    "user_id":"YOUR_USER_ID",
    "text":"Hello, ChatSDK!"
  }'
```

### 5. Test Real-time Features

The WebSocket endpoint for real-time updates is available at:
```
ws://localhost:8001/connection/websocket
```

## Monitoring & Observability

### Grafana Dashboards

1. Open http://localhost:3001
2. Login with `admin` / `admin`
3. Navigate to Dashboards
4. Create a new dashboard or import the ChatSDK dashboards from `docs/production/monitoring/`

### Prometheus Metrics

View all available metrics:
```bash
curl http://localhost:5501/metrics
```

Key metrics to monitor:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `active_websocket_connections` - Current WebSocket connections
- `messages_sent_total` - Total messages sent
- `db_query_duration_seconds` - Database query performance

### View Logs

```bash
# API logs
docker logs -f chatsdk-test-api

# Database logs
docker logs -f chatsdk-test-postgres

# All services
docker-compose -f docker-compose.test.yml logs -f
```

## Management Commands

### Start/Stop Services

```bash
# Start all services
docker-compose -f docker-compose.test.yml up -d

# Stop all services
docker-compose -f docker-compose.test.yml down

# Restart a specific service
docker-compose -f docker-compose.test.yml restart api

# View service status
docker-compose -f docker-compose.test.yml ps
```

### Database Operations

```bash
# Connect to PostgreSQL
docker exec -it chatsdk-test-postgres psql -U chatsdk -d chatsdk

# Backup database
docker exec chatsdk-test-postgres pg_dump -U chatsdk chatsdk > backup-$(date +%Y%m%d).sql

# Restore database
cat backup.sql | docker exec -i chatsdk-test-postgres psql -U chatsdk chatsdk
```

### Redis Operations

```bash
# Connect to Redis CLI
docker exec -it chatsdk-test-redis redis-cli -a chatsdk_redis_test_123

# Clear all Redis cache
docker exec chatsdk-test-redis redis-cli -a chatsdk_redis_test_123 FLUSHALL
```

### MinIO Operations

```bash
# List buckets
docker exec chatsdk-test-minio mc ls myminio/

# List files in chatsdk bucket
docker exec chatsdk-test-minio mc ls myminio/chatsdk/

# Copy file to MinIO
docker exec chatsdk-test-minio mc cp /path/to/file myminio/chatsdk/
```

## Impact Idol Integration

To integrate with Impact Idol, follow the guide at:
`examples/impact-idol/README.md`

Key integration points:
1. **Dual-Write Sync Service**: `examples/impact-idol/services/chatsdk-sync.ts`
2. **Server Actions**: `examples/impact-idol/actions/chat.ts`
3. **Theme**: Impact Idol custom theme is available in `packages/react/src/styles/themes.ts`

## Load Testing

Run load tests to verify performance:

```bash
# Install k6 (if not already installed)
# macOS: brew install k6
# Ubuntu: sudo snap install k6

# Message sending test (500 concurrent users)
k6 run tests/load/message-sending.js

# WebSocket connections test (1000+ connections)
k6 run tests/load/websocket-connections.js

# Comprehensive scenario test
k6 run tests/load/comprehensive.js
```

## Testing Suite

### API Integration Tests

```bash
# Run all API tests
npm run test --workspace=tests

# Run specific test file
npm run test -- tests/api/integration.test.ts
```

### E2E Tests

```bash
# Run Playwright E2E tests
cd tests
npm install
npx playwright install
npx playwright test
```

## Production Deployment

When ready to deploy to production, refer to:

- **Docker Production**: `docs/production/deployment/docker-production.md`
- **Kubernetes**: `docs/production/deployment/kubernetes-production.md`
- **Monitoring Setup**: `docs/production/monitoring/prometheus-grafana.md`
- **Production Checklist**: `docs/production/PRODUCTION_READINESS_CHECKLIST.md`

## Troubleshooting

### API Not Responding

```bash
# Check API logs
docker logs chatsdk-test-api

# Restart API
docker-compose -f docker-compose.test.yml restart api
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.test.yml ps postgres

# Check PostgreSQL logs
docker logs chatsdk-test-postgres

# Test connection
docker exec -it chatsdk-test-postgres pg_isready -U chatsdk
```

### WebSocket Not Connecting

```bash
# Check Centrifugo logs
docker logs chatsdk-test-centrifugo

# Verify Centrifugo health
curl http://localhost:8001/health
```

### Metrics Not Showing

```bash
# Check Prometheus targets
curl http://localhost:9091/api/v1/targets

# Restart Prometheus
docker-compose -f docker-compose.test.yml restart prometheus
```

## Clean Up

To completely remove the test deployment:

```bash
# Stop and remove all containers, networks, and volumes
docker-compose -f docker-compose.test.yml down -v

# Remove Docker images (optional)
docker rmi chatsdk-api:latest
```

## Support & Documentation

- **Full Documentation**: `docs/` directory
- **Enterprise Features**: `docs/enterprise/` directory
- **API Reference**: http://localhost:5501/api (when running)
- **GitHub Issues**: Report issues and feature requests

---

**Deployment Status**: 🟢 **READY FOR TESTING**

**Next Steps**:
1. ✅ Test the API endpoints using the examples above
2. ✅ Set up Grafana dashboards for monitoring
3. ✅ Run load tests to validate performance
4. ✅ Integrate with Impact Idol using the integration guide
5. ✅ Review the production readiness checklist before production deployment

---

*Generated: 2025-12-27*
*Deployment Type: Local Test Environment*
*ChatSDK Version: Enterprise-Ready (All 5 Phases Complete)*
