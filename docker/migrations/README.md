# ChatSDK Database Migrations

ChatSDK uses [Flyway](https://flywaydb.org/) for automated database migrations. This ensures that schema changes are applied consistently across all environments (development, staging, production).

## Table of Contents

- [How Migrations Work](#how-migrations-work)
- [Creating New Migrations](#creating-new-migrations)
- [Migration Best Practices](#migration-best-practices)
- [Running Migrations](#running-migrations)
- [Checking Migration Status](#checking-migration-status)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Rollback Strategy](#rollback-strategy)

## How Migrations Work

### Migration Execution Flow

1. **PostgreSQL starts** and becomes healthy
2. **Flyway starts** and connects to PostgreSQL
3. Flyway checks the `flyway_schema_history` table to see which migrations have been applied
4. Flyway runs pending migrations in order (V001, V002, V003, ...)
5. Each migration is recorded in `flyway_schema_history`
6. **API and other services start** after migrations complete

### For New Databases

- Docker volume is empty
- Flyway applies all migrations in order
- Creates `flyway_schema_history` table automatically

### For Existing Databases

- Flyway checks `flyway_schema_history` table
- Only applies migrations that haven't been run yet
- Guarantees each migration runs exactly once

## Creating New Migrations

### Step 1: Get Next Version Number

```bash
# List existing migrations
ls docker/migrations/ | grep '^V' | sort -V

# Example output:
# V001__baseline_schema.sql
# V002__workspace_invites.sql
# V003__channel_starring.sql

# Next migration would be V004
```

### Step 2: Create Migration File

```bash
# Create new migration file
touch docker/migrations/V004__add_user_badges.sql
```

### Step 3: Write Migration SQL

```sql
-- Flyway Migration V004
-- Created: 2026-01-07
-- Description: Add user badge system for achievements and recognition
--
-- This migration adds tables for user badges, achievements, and awards

-- Create user_badge table
CREATE TABLE IF NOT EXISTS user_badge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  badge_type VARCHAR(50) NOT NULL,  -- contributor, moderator, early_adopter
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  UNIQUE(app_id, user_id, badge_type)
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_badge_user
ON user_badge (app_id, user_id, awarded_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_badge_type
ON user_badge (app_id, badge_type, awarded_at DESC);

-- Add comments for documentation
COMMENT ON TABLE user_badge IS 'Stores user badges and achievements';
COMMENT ON COLUMN user_badge.badge_type IS 'Type of badge awarded to user';

COMMIT;
```

### Step 4: Test Locally

```bash
# Restart Docker to apply migration
docker compose down
docker compose up -d

# Check migration logs
docker compose logs flyway

# Expected output:
# Successfully applied 1 migration to schema "public"
# - V004__add_user_badges.sql
```

### Step 5: Verify Migration Applied

```bash
# Connect to database
psql postgres://chatsdk:chatsdk_dev@localhost:5434/chatsdk

# Check migration history
SELECT version, description, installed_on, success
FROM flyway_schema_history
ORDER BY installed_rank;

# Verify table exists
\d user_badge

# Exit
\q
```

## Migration Best Practices

### 1. Use Transactions

Always end migrations with `COMMIT;` to ensure atomicity:

```sql
-- Your SQL statements

COMMIT;
```

### 2. Make Migrations Idempotent

Use `IF NOT EXISTS` clauses where possible:

```sql
-- Good: Can run multiple times safely
CREATE TABLE IF NOT EXISTS user_badge (...);
ALTER TABLE channel_member ADD COLUMN IF NOT EXISTS starred BOOLEAN;
CREATE INDEX IF NOT EXISTS idx_user_badge_user ON user_badge (...);

-- Bad: Will fail if already exists
CREATE TABLE user_badge (...);
ALTER TABLE channel_member ADD COLUMN starred BOOLEAN;
CREATE INDEX idx_user_badge_user ON user_badge (...);
```

### 3. Never Modify Applied Migrations

Once a migration is applied (especially in production), **never modify it**. Flyway validates checksums and will fail if a migration changes.

**If you need to make changes:**
- Create a new migration to fix the issue
- Example: V005__fix_user_badge_constraints.sql

### 4. Small, Focused Migrations

Keep migrations focused on a single feature or fix:

```bash
# Good
V004__add_user_badges.sql
V005__add_notification_preferences.sql
V006__add_channel_categories.sql

# Bad
V004__various_updates.sql  # Too vague
```

### 5. Descriptive Names

Use clear, concise descriptions:

```bash
# Good
V004__add_user_badges.sql
V005__add_workspace_analytics.sql
V006__fix_message_threading_indexes.sql

# Bad
V004__update.sql
V005__changes.sql
V006__fix.sql
```

### 6. Document Rollback Strategy

Include rollback instructions in migration comments:

```sql
-- Flyway Migration V004
-- Created: 2026-01-07
-- Description: Add user badge system
--
-- Rollback strategy (manual):
--   DROP TABLE user_badge;
--   DELETE FROM flyway_schema_history WHERE version = '4';
```

### 7. Test Migrations on Staging First

Always test migrations on a staging environment before production:

```bash
# 1. Backup staging database
pg_dump -h staging -U chatsdk chatsdk > staging-backup.sql

# 2. Deploy to staging
docker compose -f docker-compose.staging.yml up -d

# 3. Verify application works
curl https://staging.example.com/health

# 4. Deploy to production (if staging successful)
```

## Running Migrations

### Automatic (Recommended)

Migrations run automatically when you start Docker services:

```bash
docker compose up -d
```

### Manual

Run migrations manually using Flyway commands:

```bash
# Apply all pending migrations
docker compose run --rm flyway migrate

# Show migration information
docker compose run --rm flyway info

# Validate migration checksums
docker compose run --rm flyway validate

# Repair migration state (if needed)
docker compose run --rm flyway repair
```

### Using npm Scripts

For convenience, use the npm scripts defined in root `package.json`:

```bash
npm run db:migrate      # Apply pending migrations
npm run db:info         # Show migration status
npm run db:validate     # Validate migration checksums
npm run db:repair       # Fix failed migration state
npm run db:baseline     # Baseline existing database (one-time)
npm run db:connect      # Connect to database via psql
```

## Checking Migration Status

### View Migration History

```bash
# Using Flyway
docker compose run --rm flyway info

# Using psql
psql postgres://chatsdk:chatsdk_dev@localhost:5434/chatsdk \
  -c "SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;"

# Example output:
#  version | description        | installed_on        | success
# ---------+--------------------+---------------------+---------
#  1       | baseline schema    | 2026-01-06 20:00:00 | t
#  2       | workspace invites  | 2026-01-06 20:00:01 | t
#  3       | channel starring   | 2026-01-06 20:00:02 | t
```

### Check Pending Migrations

```bash
# Show all migrations (applied and pending)
docker compose run --rm flyway info

# Output shows:
# - Applied migrations (checkmark)
# - Pending migrations (no checkmark)
```

## Troubleshooting

### Problem: Migration Failed with Error

**Symptom:** Flyway logs show migration failed

**Solution:**

```bash
# 1. Check Flyway logs
docker compose logs flyway

# 2. Check failed migration in database
psql postgres://chatsdk:chatsdk_dev@localhost:5434/chatsdk \
  -c "SELECT * FROM flyway_schema_history WHERE success = false;"

# 3. Fix the SQL error in the migration file
nano docker/migrations/V00X__failed_migration.sql

# 4. Repair migration state
docker compose run --rm flyway repair

# 5. Retry
docker compose up -d
```

### Problem: Existing Production Database Missing Migrations

**Symptom:** Database already has schema but no `flyway_schema_history` table

**Solution (ONE TIME ONLY):**

```bash
# Baseline the database to mark V001 as applied
docker compose run --rm flyway baseline \
  -baselineVersion=1 \
  -baselineDescription="Initial schema"

# Then start services normally
docker compose up -d

# Verify migrations V002, V003, etc. were applied
docker compose run --rm flyway info
```

### Problem: Migration Checksum Mismatch

**Symptom:** `Validate failed: Migration checksum mismatch`

**Cause:** Migration file was modified after being applied

**Solution:**

```bash
# Option 1: Restore original migration file from git
git checkout docker/migrations/V00X__migration.sql

# Option 2: Create compensating migration (if change is needed)
# Create V00Y__fix_migration.sql with corrective SQL

# Then restart
docker compose up -d
```

### Problem: Need to Skip a Failed Migration

**Symptom:** Migration keeps failing and you need to skip it temporarily

**Solution (USE WITH CAUTION):**

```bash
# 1. Repair migration state
docker compose run --rm flyway repair

# 2. Manually mark migration as applied (DANGEROUS)
psql postgres://chatsdk:chatsdk_dev@localhost:5434/chatsdk
INSERT INTO flyway_schema_history (version, description, type, script, installed_by, installed_on, execution_time, success)
VALUES (4, 'skipped migration', 'SQL', 'V004__skipped.sql', 'manual', NOW(), 0, true);
\q

# 3. Fix the underlying issue and create new migration
```

### Problem: Port Connection Issues

**Symptom:** Cannot connect to database on port 5434

**Solution:**

```bash
# Check if port is correct in docker-compose.yml
grep "5434:5432" docker/docker-compose.yml

# Check if PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Verify port is open
nc -zv localhost 5434
```

## Production Deployment

### First Time Deployment (Existing Database)

```bash
# Step 1: BACKUP DATABASE
pg_dump -h <prod-db-host> -U <user> <database> > backup-$(date +%Y%m%d-%H%M%S).sql

# Step 2: Baseline existing database (ONE TIME ONLY)
docker compose -f docker-compose.prod.yml run --rm flyway baseline \
  -baselineVersion=1 \
  -baselineDescription="Production baseline before migration system"

# Expected output:
# Successfully baselined schema "public" with version: 1

# Step 3: Apply pending migrations
docker compose -f docker-compose.prod.yml up -d

# Step 4: Verify migrations applied
docker compose -f docker-compose.prod.yml run --rm flyway info

# Expected: V002, V003, etc. show as applied

# Step 5: Test application
curl https://<prod-domain>/health
curl https://<prod-domain>/api/channels -H "X-API-Key: <key>" -H "Authorization: Bearer <token>"
```

### Subsequent Deployments

```bash
# Migrations run automatically on docker compose up
docker compose -f docker-compose.prod.yml up -d

# Check migration status
docker compose -f docker-compose.prod.yml run --rm flyway info
```

### Pre-Deployment Checklist

- [ ] All migrations tested on staging
- [ ] Database backup created
- [ ] Migration SQL reviewed for destructive operations
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Low-traffic deployment window scheduled

## Rollback Strategy

### Scenario 1: Migration Failed (Flyway Caught Error)

Flyway automatically rolls back failed migrations that are in transactions.

```bash
# 1. Check error
docker compose logs flyway

# 2. Fix migration SQL
nano docker/migrations/V00X__failed_migration.sql

# 3. Repair migration state
docker compose run --rm flyway repair

# 4. Retry
docker compose up -d
```

### Scenario 2: Migration Succeeded but Application Broken

**Option A: Compensating Migration (RECOMMENDED)**

```bash
# Create rollback migration
cat > docker/migrations/V00X__rollback_feature.sql << 'EOF'
-- Flyway Migration V00X
-- Created: 2026-01-07
-- Description: Rollback V00Y migration

DROP TABLE IF EXISTS new_table;
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

COMMIT;
EOF

# Apply rollback migration
docker compose up -d
```

**Option B: Manual Rollback (EMERGENCY ONLY)**

```bash
# 1. Stop services
docker compose down

# 2. Restore from backup
psql postgres://chatsdk:chatsdk_dev@localhost:5434/chatsdk < backup.sql

# 3. Repair Flyway state
docker compose up -d postgres
docker compose run --rm flyway repair

# 4. Restart services
docker compose up -d
```

### Scenario 3: Database Restore from Backup

```bash
# 1. Stop all services
docker compose down

# 2. Restore backup
psql postgres://chatsdk:chatsdk_dev@localhost:5434/chatsdk < backup-20260106.sql

# 3. Verify flyway_schema_history table
psql postgres://chatsdk:chatsdk_dev@localhost:5434/chatsdk \
  -c "SELECT version FROM flyway_schema_history ORDER BY version;"

# 4. Restart services
docker compose up -d
```

## Migration File Naming Convention

### Format

```
V<VERSION>__<DESCRIPTION>.sql
```

### Rules

- **V** prefix (uppercase, required)
- **Version number** (001, 002, 003, ...) - sequential, no gaps
- **Double underscore** `__` (separator)
- **Description** (lowercase, underscores or spaces allowed)
- **.sql** extension (required)

### Valid Examples

```
V001__baseline_schema.sql
V002__workspace_invites.sql
V003__channel_starring.sql
V004__add_user_badges.sql
V005__add notification preferences.sql  # Spaces allowed in description
```

### Invalid Examples

```
v001__baseline.sql           # Lowercase 'v' (invalid)
V001_baseline.sql            # Single underscore (invalid)
001__baseline.sql            # Missing 'V' prefix (invalid)
V1__baseline.sql             # No leading zeros (inconsistent)
V004-add-badges.sql          # Hyphens not underscores (invalid)
V004__add_badges.txt         # Wrong extension (invalid)
```

## FAQ

### Q: Can I run migrations on a live production database?

**A:** Yes, but with caution:
- Flyway uses transactions to ensure atomicity
- Migrations that add columns, indexes, or tables are generally safe
- Migrations that modify or delete data can cause downtime
- Always test on staging first
- Create backups before production deployments

### Q: What happens if I delete a migration file?

**A:** Flyway will detect a "missing migration" and fail validation. If you need to remove a migration:
1. Never delete applied migrations from production
2. For development, use `flyway repair` to clean up metadata
3. For production, create compensating migrations instead

### Q: Can I rename a migration file?

**A:** Only if it hasn't been applied yet:
- **Before applying:** Safe to rename
- **After applying:** DO NOT rename - Flyway tracks by filename

### Q: How do I run migrations in a specific order?

**A:** Use sequential version numbers (V001, V002, V003). Flyway always runs migrations in version order.

### Q: What if I need to run a migration out of order?

**A:** Generally avoid this. If absolutely necessary:
- Set `FLYWAY_OUT_OF_ORDER=true` in docker-compose.yml
- Only use for hotfixes in production
- Document why out-of-order was needed

### Q: Can I use Flyway with ORMs like Prisma or TypeORM?

**A:** Yes, ChatSDK uses raw SQL with the `pg` library, but Flyway works alongside ORMs. Choose one source of truth for migrations (Flyway recommended).

### Q: How do I add demo data via migrations?

**A:** Create a separate migration for demo data:
```sql
-- V001.1__demo_data.sql (optional migration)
INSERT INTO app (id, name) VALUES (...) ON CONFLICT DO NOTHING;
```
Only apply in development environments.

## Resources

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Flyway Command-Line Reference](https://flywaydb.org/documentation/command-line/)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [ChatSDK Database Schema](../init-db.sql) (deprecated, for reference only)

## Support

For questions or issues with migrations:

1. Check Flyway logs: `docker compose logs flyway`
2. Check PostgreSQL logs: `docker compose logs postgres`
3. Validate migrations: `docker compose run --rm flyway validate`
4. Review this documentation
5. Create an issue in the ChatSDK repository
