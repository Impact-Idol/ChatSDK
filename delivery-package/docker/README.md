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
