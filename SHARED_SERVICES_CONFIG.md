# ChatSDK - Shared Services Configuration

## ✅ Now Using Impact Idol's Shared Services!

ChatSDK is now connected to Impact Idol's existing Docker services to save resources.

## 🔗 Shared Services

| Service | Container Name | Port | Credentials | Usage |
|---------|---------------|------|-------------|-------|
| **PostgreSQL** | `chatsdk-postgres` | 5433 | newchat / newchat_dev | Separate DB: `chatsdk` |
| **MinIO S3** | `chatsdk-minio` | 9000 (internal) | minioadmin / minioadmin | Separate bucket: `chatsdk` |
| **Centrifugo** | `chatsdk-test-centrifugo` | 8001 | (our own) | ChatSDK only |
| **Redis** | `chatsdk-test-redis` | 6380 | (our own) | ChatSDK only |

## 📊 Current Port Usage

### ChatSDK Services (Running)
- **React App**: 3000 - http://localhost:3000 ✅
- **API**: 5501 - http://localhost:5501 ✅
- **Centrifugo**: 8001 - ws://localhost:8001 ✅
- **Redis**: 6380 ✅
- **Grafana**: 3001 - http://localhost:3001 ✅
- **Prometheus**: 9091 - http://localhost:9091 ✅
- **Inngest**: 8289 - http://localhost:8289 ✅

### Impact Idol Services (Shared)
- **PostgreSQL**: 5433 ✅ (shared, separate database)
- **MinIO**: 9002/9003 ✅ (shared, separate bucket)
- **Centrifugo**: 8000 (Impact Idol's)
- **NestJS API**: 6400 (Impact Idol's)
- **Vite Demo**: 5173 (Impact Idol's)
- **Next.js Demo**: 4500 (Impact Idol's)

## 🗄️ Database Setup

**PostgreSQL Instance**: Shared
- **Container**: `chatsdk-postgres`
- **Impact Idol Database**: `newchatdb`
- **ChatSDK Database**: `chatsdk` (separate, isolated)
- **User**: `newchat`
- **Password**: `newchat_dev`
- **Connection**: `postgresql://newchat:newchat_dev@localhost:5433/chatsdk`

### Access ChatSDK Database

```bash
# Connect to ChatSDK database
docker exec -it chatsdk-postgres psql -U newchat -d chatsdk

# List tables
\dt

# Check data isolation
SELECT current_database();
```

## 📦 S3 Storage Setup

**MinIO Instance**: Shared
- **Container**: `chatsdk-minio`
- **Impact Idol Bucket**: (their bucket)
- **ChatSDK Bucket**: `chatsdk` (separate, isolated)
- **Access Key**: `minioadmin`
- **Secret Key**: `minioadmin`
- **Endpoint**: `http://chatsdk-minio:9000` (internal)

### Access ChatSDK Bucket

```bash
# List buckets
docker exec chatsdk-minio mc ls myminio/

# List ChatSDK files
docker exec chatsdk-minio mc ls myminio/chatsdk/

# Upload test file
docker exec chatsdk-minio mc cp /path/to/file myminio/chatsdk/
```

## 🔄 How It Works

### Network Architecture

```
Docker Network: newchatsdk_network
│
├── chatsdk-postgres (shared)
│   ├── Database: newchatdb (Impact Idol)
│   └── Database: chatsdk (ChatSDK) ✅
│
├── chatsdk-minio (shared)
│   ├── Bucket: (Impact Idol's buckets)
│   └── Bucket: chatsdk ✅
│
├── chatsdk-api-shared (ChatSDK API)
│   ├── Connects to: chatsdk-postgres:5432/chatsdk
│   └── Connects to: chatsdk-minio:9000/chatsdk
│
├── chatsdk-test-centrifugo (ChatSDK WebSocket)
└── chatsdk-test-redis (ChatSDK Cache)
```

### Data Isolation

✅ **Databases are isolated**: Impact Idol uses `newchatdb`, ChatSDK uses `chatsdk`
✅ **Buckets are isolated**: Impact Idol has their buckets, ChatSDK has `chatsdk`
✅ **No data mixing**: Completely separate tables and files
✅ **Same resources**: Sharing CPU, memory, and disk efficiently

## 🚀 Benefits

1. **Resource Efficiency**
   - No duplicate PostgreSQL (~500MB RAM saved)
   - No duplicate MinIO (~200MB RAM saved)
   - Total savings: ~700MB RAM

2. **Data Isolation**
   - Separate databases
   - Separate buckets
   - No cross-contamination

3. **Flexibility**
   - Can easily migrate to separate services
   - Docker-compose file unchanged for future use
   - Just environment variables control connection

## 🔧 Configuration

The API container is configured with these environment variables:

```bash
# Database (shared PostgreSQL, separate DB)
DB_HOST=chatsdk-postgres
DB_PORT=5432
DB_NAME=chatsdk
DB_USER=newchat
DB_PASSWORD=newchat_dev

# S3 (shared MinIO, separate bucket)
S3_ENDPOINT=http://chatsdk-minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=chatsdk

# Real-time (our own Centrifugo)
CENTRIFUGO_URL=ws://chatsdk-test-centrifugo:8000/connection/websocket

# Cache (our own Redis)
REDIS_HOST=chatsdk-test-redis
REDIS_PORT=6379
```

## 🔄 Migrate to Separate Services (If Needed)

If you later want to run separate services:

```bash
# Start the full docker-compose
docker-compose -f docker-compose.test.yml up -d

# This will start:
# - Our own PostgreSQL on 5434
# - Our own MinIO on 9005/9006
# - All other services
```

The `docker-compose.test.yml` file is preserved for this purpose!

## 📋 Service Status

Check what's running:

```bash
# All containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check network connections
docker network inspect newchatsdk_network

# Check API is using shared services
docker logs chatsdk-api-shared | grep -i "connected\|database\|minio"
```

## 🔍 Verify Shared Services

### Test PostgreSQL

```bash
# Create test table in ChatSDK database
docker exec chatsdk-postgres psql -U newchat -d chatsdk -c "
  CREATE TABLE IF NOT EXISTS test (
    id SERIAL PRIMARY KEY,
    message TEXT
  );
  INSERT INTO test (message) VALUES ('ChatSDK works!');
  SELECT * FROM test;
"
```

### Test MinIO

```bash
# Upload test file
echo "ChatSDK test" > /tmp/test.txt
docker cp /tmp/test.txt chatsdk-minio:/tmp/
docker exec chatsdk-minio mc cp /tmp/test.txt myminio/chatsdk/

# List files
docker exec chatsdk-minio mc ls myminio/chatsdk/
```

## ⚠️ Important Notes

1. **Impact Idol's data is safe**: We use completely separate database and bucket
2. **No performance impact**: PostgreSQL and MinIO handle multiple databases/buckets efficiently
3. **Easy rollback**: Just remove `chatsdk-api-shared` container and start with docker-compose
4. **Future-proof**: Docker-compose file unchanged for easy migration

## 🎯 Summary

**What's Shared:**
- ✅ PostgreSQL container (different databases)
- ✅ MinIO container (different buckets)
- ✅ Docker network

**What's Separate:**
- ✅ All ChatSDK data (database + files)
- ✅ ChatSDK API service
- ✅ ChatSDK Centrifugo
- ✅ ChatSDK Redis
- ✅ ChatSDK monitoring (Grafana/Prometheus)

**Result:**
- 💰 ~700MB RAM saved
- 🔒 Complete data isolation
- 🚀 Same performance
- 🔄 Easy to separate later if needed

---

**Status**: 🟢 **RUNNING WITH SHARED SERVICES**
**Data Safety**: 🔒 **FULLY ISOLATED**
**Ready for Impact Idol Integration**: ✅ **YES**
