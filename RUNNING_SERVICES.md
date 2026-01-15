# ChatSDK Enterprise Instance - Running Services

**Instance Name:** ChatSDK Enterprise
**Network:** chatsdk-enterprise-network
**Started:** $(date)

---

## 🚀 Running Services

| Service | Container Name | Ports (Host:Container) | Status | URL/Access |
|---------|---------------|----------------------|--------|------------|
| **PostgreSQL** | chatsdk-enterprise-postgres | 5434:5432 | ✅ Healthy | `postgresql://chatsdk:YOUR_PASSWORD@localhost:5434/chatsdk` |
| **Centrifugo** | chatsdk-enterprise-centrifugo | 8001:8000, 9003:9000 | ✅ Healthy | WebSocket: http://localhost:8001 |
| **Redis** | chatsdk-enterprise-redis | 6380:6379 | ✅ Healthy | redis://localhost:6380 |
| **MinIO** | chatsdk-enterprise-minio | 9004:9000, 9006:9001 | ✅ Healthy | API: http://localhost:9004<br/>Console: http://localhost:9006 |
| **MeiliSearch** | chatsdk-enterprise-meilisearch | 7701:7700 | ✅ Healthy | http://localhost:7701 |
| **Inngest** | chatsdk-enterprise-inngest | 8289:8288 | ✅ Running | http://localhost:8289 |

---

## 📊 Database Information

**Database:** PostgreSQL 16
**Tables:** 31 (all enterprise features included)
**Demo Data:**
- App: Demo App (ID: 00000000-0000-0000-0000-000000000001)
- Users: Alice Johnson, Bob Smith, Carol Williams
- Channels: Demo Channel

### Enterprise Tables Confirmed:
- ✅ workspace, workspace_member
- ✅ poll, poll_vote
- ✅ message_report
- ✅ user_block
- ✅ supervised_user
- ✅ enrollment_rule, enrollment_execution
- ✅ workspace_template
- ✅ custom_emoji, emoji_usage
- ✅ webhook, webhook_delivery
- ✅ pinned_message, saved_message
- ✅ read_receipt, user_presence, mention
- ✅ upload (with blurhash column)

---

## 🔧 Quick Commands

### Start Services
```bash
cd /Users/pushkar/Downloads/ChatSDK/docker
docker-compose up -d
```

### Stop Services
```bash
cd /Users/pushkar/Downloads/ChatSDK/docker
docker-compose down
```

### Check Status
```bash
docker ps --filter "name=chatsdk-enterprise-"
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f centrifugo
```

### Connect to Database
```bash
docker exec -it chatsdk-enterprise-postgres psql -U chatsdk -d chatsdk
```

### Access MinIO Console
```bash
open http://localhost:9006
# Credentials: See your MINIO_USER / MINIO_PASSWORD env vars
```

---

## 🔄 Port Mapping (No Conflicts)

All ports have been changed from default to avoid conflicts with other projects:

| Service | Default Port | New Port | Reason |
|---------|-------------|----------|--------|
| PostgreSQL | 5433 | **5434** | Avoid conflict with other ChatSDK project |
| Centrifugo | 8000 | **8001** | Avoid conflict with other ChatSDK project |
| Centrifugo gRPC | 9000 | **9003** | Avoid conflict |
| Inngest | 8288 | **8289** | Avoid conflict |
| MeiliSearch | 7700 | **7701** | Avoid conflict |
| Qdrant REST | 6333 | **6335** | (AI profile) |
| Qdrant gRPC | 6334 | **6336** | (AI profile) |
| Redis | 6379 | **6380** | Avoid conflict with local Redis |
| MinIO API | 9002 | **9004** | Avoid conflict |
| MinIO Console | 9001/9005 | **9006** | Avoid conflict |
| MongoDB | 27017 | **27018** | (Novu profile) |
| Novu API | 3000 | **3001** | (Novu profile) |
| Novu Web | 4200 | **4201** | (Novu profile) |
| React Chat | 5500 | **5501** | Avoid conflict |

---

## 🎯 Next Steps

1. **Build and start the API server** (if needed)
2. **Build and start the React Chat demo** (port 5501)
3. **Test the enterprise features** using the demo app
4. **Review the documentation** in `docs/enterprise/`

---

## 🐛 Troubleshooting

### Database not initialized?
```bash
docker exec -i chatsdk-enterprise-postgres psql -U chatsdk -d chatsdk < docker/init-db.sql
```

### Check container health
```bash
docker ps --filter "name=chatsdk-enterprise-" --format "table {{.Names}}\t{{.Status}}"
```

### Reset everything
```bash
cd /Users/pushkar/Downloads/ChatSDK/docker
docker-compose down -v  # WARNING: This deletes all data
docker-compose up -d
```

---

## 📚 Documentation

See `docs/enterprise/` for comprehensive analysis:
- [Architecture Analysis](docs/enterprise/ARCHITECTURE_ANALYSIS.md)
- [Implementation Roadmap](docs/enterprise/IMPLEMENTATION_ROADMAP.md)
- [Feature Matrix](docs/enterprise/FEATURE_MATRIX.md)
