# ChatSDK Docker Infrastructure

Local development infrastructure for ChatSDK.

## Services

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Primary database with Zulip-inspired schema |
| **Centrifugo** | 8000/9000 | Real-time WebSocket server |
| **Inngest** | 8288 | Async worker/event orchestration |
| **Meilisearch** | 7700 | Full-text search |
| **Qdrant** | 6333/6334 | Vector search (AI features) |
| **Redis** | 6379 | Pub/sub and caching |
| **MinIO** | 9001/9002 | S3-compatible object storage |

## Quick Start

### Option 1: Use Published Images (Recommended)

ChatSDK publishes official Docker images to GitHub Container Registry:

```bash
# Pull the latest API image
docker pull ghcr.io/impact-idol/chatsdk/api:latest

# Or pull a specific version
docker pull ghcr.io/impact-idol/chatsdk/api:2.0.0

# Run with Docker Compose (uses published images)
docker compose -f docker-compose.prod.yml up -d
```

**Available Images:**
- `ghcr.io/impact-idol/chatsdk/api:latest` - ChatSDK API Server (latest)
- `ghcr.io/impact-idol/chatsdk/api:2.0.0` - Specific version
- `ghcr.io/impact-idol/chatsdk/api:main` - Main branch (development)

**Platforms Supported:** `linux/amd64`, `linux/arm64` (Apple Silicon, AWS Graviton)

### Option 2: Build from Source (Development)

```bash
# Start all services (except AI)
docker compose up -d

# Start with AI features (includes Qdrant)
docker compose --profile ai up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop all
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

## Connection URLs

```bash
# PostgreSQL
psql postgres://chatsdk:YOUR_PASSWORD@localhost:5432/chatsdk

# Centrifugo Admin
http://localhost:8000 (admin/admin)

# Meilisearch Dashboard
http://localhost:7700

# Inngest Dev UI
http://localhost:8288

# MinIO Console
http://localhost:9001 (chatsdk/YOUR_MINIO_PASSWORD)
```

## Database Schema

The schema implements:
- **Zulip's UserMessage pattern** - Fast unread queries with bitmask flags
- **OpenIMSDK's sequence-based sync** - Monotonic seq numbers per channel
- **Multi-tenancy** - App-scoped users, channels, messages

### Key Tables

| Table | Purpose |
|-------|---------|
| `app` | Multi-tenant apps with API keys |
| `app_user` | Users within each app |
| `channel` | Conversations (1:1, group, team) |
| `message` | Messages with `seq` for sync |
| `user_message` | Per-user read state (Zulip pattern) |
| `channel_member` | Membership with `last_read_seq` |
| `sync_state` | Offline sync tracking |

### Sequence-Based Sync

```sql
-- Get next sequence for a channel
SELECT next_channel_seq('channel-uuid');

-- Sync messages since last known seq
SELECT * FROM message
WHERE channel_id = 'uuid' AND seq > 100
ORDER BY seq ASC
LIMIT 100;
```

## Demo Data

A demo app is pre-seeded:
- **App ID**: `00000000-0000-0000-0000-000000000001`
- **Users**: Alice, Bob, Carol
- **Channel**: Demo Channel

Get the API key:
```sql
SELECT api_key, api_secret FROM app WHERE name = 'Demo App';
```

## Database Migrations

ChatSDK uses [Flyway](https://flywaydb.org/) for automated database migrations.

### How It Works

1. **PostgreSQL starts** and becomes healthy
2. **Flyway runs** all pending migrations in order (V001, V002, V003...)
3. Migration history is tracked in `flyway_schema_history` table
4. **Other services start** after migrations complete

### Quick Commands

```bash
# Apply pending migrations
docker compose run --rm flyway migrate

# Check migration status
docker compose run --rm flyway info

# Validate migration checksums
docker compose run --rm flyway validate

# Repair failed migration state
docker compose run --rm flyway repair
```

### Creating New Migrations

```bash
# 1. Create migration file (next version number)
touch migrations/V004__add_user_badges.sql

# 2. Write migration SQL
cat > migrations/V004__add_user_badges.sql << 'EOF'
-- Flyway Migration V004
-- Description: Add user badge system

CREATE TABLE IF NOT EXISTS user_badge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  badge_type VARCHAR(50) NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
EOF

# 3. Restart services to apply
docker compose up -d

# 4. Check migration was applied
docker compose logs flyway
```

### Migration File Naming

Format: `V<VERSION>__<DESCRIPTION>.sql`

Examples:
- `V001__baseline_schema.sql`
- `V002__workspace_invites.sql`
- `V003__channel_starring.sql`
- `V004__add_user_badges.sql`

### First-Time Setup (Existing Database)

If you have an existing database without Flyway history:

```bash
# Baseline the database (ONE TIME ONLY)
docker compose run --rm flyway baseline \
  -baselineVersion=1 \
  -baselineDescription="Existing schema"

# Then start normally
docker compose up -d
```

### Troubleshooting Migrations

**Migration failed:**
```bash
# View error
docker compose logs flyway

# Fix migration SQL
nano migrations/V00X__failed_migration.sql

# Repair and retry
docker compose run --rm flyway repair
docker compose up -d
```

**Check migration history:**
```bash
psql postgres://chatsdk:YOUR_PASSWORD@localhost:5434/chatsdk \
  -c "SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;"
```

For detailed migration documentation, see [migrations/README.md](migrations/README.md).
