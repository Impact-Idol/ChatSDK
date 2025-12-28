# ChatSDK - Complete Port Reference

## 📊 Current Port Usage

### ✅ ChatSDK Services (Running)

| Port | Service | Access | Purpose |
|------|---------|--------|---------|
| **3000** | React App | http://localhost:3000 | Frontend Dev Server |
| **3001** | Grafana | http://localhost:3001 | Monitoring Dashboards |
| **5501** | ChatSDK API | http://localhost:5501 | Main API Server |
| **6380** | Redis | localhost:6380 | Cache & Pub/Sub |
| **8001** | Centrifugo | http://localhost:8001 | WebSocket/Real-time |
| **8289** | Inngest | http://localhost:8289 | Async Workers |
| **9091** | Prometheus | http://localhost:9091 | Metrics Collection |

### 🔗 Shared with Impact Idol (No External Ports)

| Service | Container | Internal | Shared Resource |
|---------|-----------|----------|-----------------|
| **PostgreSQL** | chatsdk-postgres | port 5432 | localhost:5433 |
| **MinIO** | chatsdk-minio | port 9000 | Internal only |

> **Note**: ChatSDK connects to these services internally via Docker network.
> - PostgreSQL: Uses separate database `chatsdk`
> - MinIO: Uses separate bucket `chatsdk`

### ❌ Impact Idol Services (DO NOT USE)

| Port | Service | Owner | Status |
|------|---------|-------|--------|
| **4500** | Next.js Demo | Impact Idol | Reserved |
| **5173** | Vite Demo | Impact Idol | Reserved |
| **5433** | PostgreSQL | Shared | Internal access only |
| **6400** | NestJS API | Impact Idol | Reserved |
| **8000** | Centrifugo | Impact Idol | Reserved |
| **9002** | MinIO API | Impact Idol | Reserved |
| **9003** | MinIO Console | Impact Idol | Reserved |

## 🟢 Safe Alternative Ports

If you need to change ChatSDK services, these are usually free:

| Port Range | Recommended For |
|------------|-----------------|
| **3002-3010** | Additional React apps |
| **5502-5510** | Additional API servers |
| **8002-8090** | Additional services |
| **9092-9100** | Monitoring services |

## 🔍 Check Port Availability

```bash
# Check if port is in use
lsof -i :PORT_NUMBER

# Example: Check port 3000
lsof -i :3000

# List all ChatSDK containers
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep chatsdk
```

## 🔄 Change Service Ports

### React App
Currently on port **3000**. To change:
```bash
# Stop current
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill

# Start on different port (e.g., 3002)
cd examples/react-chat
npm run dev -- --port 3002
```

### ChatSDK API
Currently on port **5501**. To change:
```bash
# Stop current container
docker stop chatsdk-api-shared

# Start with new port
docker run -d --name chatsdk-api-shared \
  --network newchatsdk_network \
  -p NEW_PORT:5500 \
  [... other env vars ...]
  chatsdk-api:latest
```

### Docker Compose Services
Edit `docker-compose.test.yml` (for future separate deployment):
```yaml
services:
  api:
    ports:
      - "NEW_PORT:5500"
```

## 📋 Complete Service List

### Running Services

```
ChatSDK Ecosystem:
├── React App         :3000   (Dev Server)
├── API Server        :5501   (Main Backend)
├── Centrifugo        :8001   (WebSocket)
├── Redis             :6380   (Cache)
├── Grafana           :3001   (Monitoring)
├── Prometheus        :9091   (Metrics)
└── Inngest           :8289   (Workers)

Shared with Impact Idol:
├── PostgreSQL        :5433   (Shared container, separate DB)
└── MinIO             :9002/9003 (Shared container, separate bucket)
```

## 🎯 Port Conflict Resolution

### If You Get "Port Already in Use"

1. **Identify what's using the port:**
   ```bash
   lsof -i :PORT_NUMBER
   ```

2. **Kill the process (if safe):**
   ```bash
   lsof -i :PORT_NUMBER | grep LISTEN | awk '{print $2}' | xargs kill
   ```

3. **Or change to a different port** (see instructions above)

## 🔒 Reserved Ports Summary

**Do NOT use these ports** (Impact Idol services):
- 4500, 5173, 5433, 6400, 8000, 9002, 9003

**ChatSDK is using**:
- 3000, 3001, 5501, 6380, 8001, 8289, 9091

**Safe to use**:
- Anything else! But 3002-3010, 5502-5510, 8002-8090 are good choices

## 📖 Related Documentation

- **Shared Services Setup**: [SHARED_SERVICES_CONFIG.md](SHARED_SERVICES_CONFIG.md)
- **Deployment Guide**: [DEPLOYMENT_INFO.md](DEPLOYMENT_INFO.md)
- **React App Testing**: [REACT_APP_TESTING.md](REACT_APP_TESTING.md)

---

**Status**: ✅ All ports configured to avoid conflicts
**Shared Services**: ✅ Using Impact Idol's PostgreSQL and MinIO
**Data Isolation**: ✅ Separate databases and buckets
