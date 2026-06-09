import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, statSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { validateProductionEnv } from '../src/config/defaults';

const repoRoot = path.resolve(__dirname, '../../..');
const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as {
  load(contents: string): any;
};

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function parseEnvExample(contents: string): Record<string, string> {
  return Object.fromEntries(
    contents
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const [key, ...value] = line.split('=');
        return [key, value.join('=')];
      })
  );
}

describe('production deployment contract', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_REGION;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.S3_BUCKET;
    delete process.env.S3_PUBLIC_URL;
    delete process.env.S3_FORCE_PATH_STYLE;
  });

  it('prod compose uses runtime env names and readiness healthcheck', () => {
    const compose = readRepoFile('docker/docker-compose.prod.yml');
    const parsed = yaml.load(compose);
    const api = parsed.services.api;
    const centrifugo = parsed.services.centrifugo;
    const flyway = parsed.services.flyway;
    const apiEnv = api.environment;
    const centrifugoEnv = centrifugo.environment;

    expect(api.ports).toContain('127.0.0.1:${API_PORT:-5500}:5500');
    expect(apiEnv.DATABASE_URL).toBe('${DATABASE_URL:?Set DATABASE_URL for the production database}');
    expect(apiEnv.DATABASE_SSL).toBe('${DATABASE_SSL:-true}');
    expect(apiEnv.S3_ENDPOINT).toBe('${S3_ENDPOINT:?Set S3_ENDPOINT for production uploads}');
    expect(apiEnv.S3_ACCESS_KEY_ID).toBe('${S3_ACCESS_KEY_ID:?Set S3_ACCESS_KEY_ID for production uploads}');
    expect(apiEnv.S3_SECRET_ACCESS_KEY).toBe('${S3_SECRET_ACCESS_KEY:?Set S3_SECRET_ACCESS_KEY for production uploads}');
    expect(apiEnv.S3_BUCKET).toBe('${S3_BUCKET:?Set S3_BUCKET for production uploads}');
    expect(apiEnv.S3_PUBLIC_URL).toBe('${S3_PUBLIC_URL:-}');
    expect(apiEnv.CENTRIFUGO_API_URL).toBe('${CENTRIFUGO_API_URL:-http://centrifugo:8000/api}');
    expect(apiEnv.CENTRIFUGO_API_KEY).toBe('${CENTRIFUGO_API_KEY:?Set CENTRIFUGO_API_KEY}');
	    expect(apiEnv.CENTRIFUGO_TOKEN_SECRET).toBe('${CENTRIFUGO_TOKEN_SECRET:?Set CENTRIFUGO_TOKEN_SECRET}');
	    expect(apiEnv.JWT_SECRET).toBe('${JWT_SECRET:?Set JWT_SECRET}');
	    expect(apiEnv.JWT_KEY_ID).toBe('${JWT_KEY_ID:?Set JWT_KEY_ID}');
    expect(apiEnv.ALLOWED_ORIGINS).toBe('${ALLOWED_ORIGINS:?Set ALLOWED_ORIGINS}');
    expect(apiEnv.CENTRIFUGO_ALLOWED_ORIGINS).toBe('${CENTRIFUGO_ALLOWED_ORIGINS:?Set CENTRIFUGO_ALLOWED_ORIGINS}');
    expect(apiEnv.REQUIRE_INNGEST).toBe('${REQUIRE_INNGEST:-true}');
    expect(apiEnv.INNGEST_EVENT_KEY).toBe('${INNGEST_EVENT_KEY:?Set INNGEST_EVENT_KEY}');
    expect(apiEnv.INNGEST_SIGNING_KEY).toBe('${INNGEST_SIGNING_KEY:?Set INNGEST_SIGNING_KEY}');
    expect(apiEnv.REDIS_URL).toBe('${REDIS_URL:-}');
    expect(apiEnv.REDIS_HOST).toBe('${REDIS_HOST:-}');
    expect(apiEnv.REDIS_TLS).toBe('${REDIS_TLS:-true}');
    expect(apiEnv.MEILISEARCH_HOST).toBe('${MEILISEARCH_HOST:-}');
    expect(apiEnv.MEILISEARCH_API_KEY).toBe('${MEILISEARCH_API_KEY:-}');
    expect(api.healthcheck.test).toEqual(['CMD', 'curl', '-f', 'http://localhost:5500/ready']);

    expect(centrifugo.ports).toContain('127.0.0.1:${CENTRIFUGO_PORT:-8000}:8000');
    expect(centrifugoEnv.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY).toBe('${CENTRIFUGO_TOKEN_SECRET:?Set CENTRIFUGO_TOKEN_SECRET}');
    expect(centrifugoEnv.CENTRIFUGO_API_KEY).toBe('${CENTRIFUGO_API_KEY:?Set CENTRIFUGO_API_KEY}');
    expect(centrifugoEnv.CENTRIFUGO_ALLOWED_ORIGINS).toBe('${CENTRIFUGO_ALLOWED_ORIGINS:?Set CENTRIFUGO_ALLOWED_ORIGINS}');
    expect(centrifugo.volumes).toContain('./centrifugo.prod.json:/centrifugo/config.json:ro');
    expect(flyway.profiles).toContain('migrate');
    expect(flyway.environment.FLYWAY_URL).toBe('${FLYWAY_URL:-}');
    expect(flyway.environment.FLYWAY_USER).toBe('${FLYWAY_USER:-}');
    expect(flyway.environment.FLYWAY_PASSWORD).toBe('${FLYWAY_PASSWORD:-}');
    expect(flyway.environment.FLYWAY_CLEAN_DISABLED).toBe('true');

    expect(compose).not.toMatch(/\bDB_HOST:/);
    expect(compose).not.toMatch(/\bDB_USER:/);
    expect(compose).not.toMatch(/\bDB_PASSWORD:/);
    expect(compose).not.toMatch(/\bS3_ACCESS_KEY:/);
    expect(compose).not.toMatch(/\bS3_SECRET_KEY:/);
    expect(compose).not.toMatch(/\bCENTRIFUGO_JWT_SECRET:/);
    expect(compose).not.toContain('http://localhost:5500/health');
  });

  it('test compose production API env satisfies validation and matches Centrifugo secrets', () => {
    const parsed = yaml.load(readRepoFile('docker-compose.test.yml'));
    const apiEnv = parsed.services.api.environment;
    const centrifugoEnv = parsed.services.centrifugo.environment;

    expect(validateProductionEnv(apiEnv)).toEqual({ valid: true, errors: [] });
    expect(apiEnv.CENTRIFUGO_API_KEY).toBe(centrifugoEnv.CENTRIFUGO_API_KEY);
    expect(apiEnv.CENTRIFUGO_TOKEN_SECRET).toBe(centrifugoEnv.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY);
    expect(apiEnv.CENTRIFUGO_ALLOWED_ORIGINS).toBe(centrifugoEnv.CENTRIFUGO_ALLOWED_ORIGINS);
    expect(apiEnv.ALLOWED_ORIGINS).toBeTruthy();
    expect(apiEnv.CENTRIFUGO_ALLOWED_ORIGINS).toBeTruthy();
    expect(apiEnv.ALLOWED_ORIGINS).not.toContain('*');
    expect(apiEnv.CENTRIFUGO_ALLOWED_ORIGINS).not.toContain('*');
    expect(centrifugoEnv.CENTRIFUGO_ALLOWED_ORIGINS).not.toContain('*');
    expect(parsed.services.api.depends_on.centrifugo.condition).toBe('service_started');
    expect(parsed.services.api.depends_on.meilisearch.condition).toBe('service_healthy');
    expect(parsed.services.api.depends_on['minio-init'].condition).toBe('service_completed_successfully');
    expect(parsed.services.meilisearch.volumes).toContain('test_meilisearch_data:/meili_data');
    expect(parsed.services['minio-init'].entrypoint).toContain('mc version enable local/chatsdk');
    expect(parsed.services['minio-init'].entrypoint).toContain('mc anonymous set none local/chatsdk');
    expect(apiEnv.S3_PUBLIC_URL).toBe('http://localhost:9007/chatsdk');
    expect(apiEnv.MEILISEARCH_HOST).toBe('http://meilisearch:7700');
    expect(apiEnv.MEILISEARCH_API_KEY).toBe('0123456789abcdef0123456789abcdef0123456789abcdef');
    expect(parsed.services.api.healthcheck.test).toEqual(
      ['CMD', 'wget', '-q', '--spider', 'http://localhost:5500/ready']
    );
  });

	  it('runtime token/auth modules use centralized validated config for signing secrets', () => {
	    const runtimeSecretFiles = [
	      'packages/api/src/routes/auth.ts',
	      'packages/api/src/routes/realtime.ts',
	      'packages/api/src/routes/tokens.ts',
	      'packages/api/src/services/tokens.ts',
	    ];

    for (const file of runtimeSecretFiles) {
      const source = readRepoFile(file);
      expect(source).toContain("from '../config/defaults'");
      expect(source).not.toContain("process.env.JWT_SECRET || '");
      expect(source).not.toContain("process.env.CENTRIFUGO_TOKEN_SECRET");
	      expect(source).not.toContain('chatsdk-dev-secret-key-change-in-production');
	    }

	    const authMiddleware = readRepoFile('packages/api/src/middleware/auth.ts');
	    expect(authMiddleware).toContain("from '../services/tokens'");
	    expect(authMiddleware).not.toContain("process.env.JWT_SECRET || '");
	  });

  it('metrics route and production observability config agree on /metrics', () => {
    const metricsRoute = readRepoFile('packages/api/src/routes/metrics.ts');
    const prometheus = yaml.load(readRepoFile('docker/prometheus.yml'));
    const nginx = readRepoFile('docker/nginx.prod.conf');

    expect(metricsRoute).toContain("metricsRoutes.get('/metrics'");
    expect(metricsRoute).not.toMatch(/metricsRoutes\.get\('\/',/);
    expect(prometheus.scrape_configs[0].metrics_path).toBe('/metrics');
    expect(nginx).toContain('location /metrics');
    expect(nginx).toContain('proxy_pass http://api_backend/metrics');
  });

  it('realtime outbox schema exists in Flyway migration and historical init schema', () => {
    const migration = readRepoFile('docker/migrations/V005__realtime_event_outbox.sql');
    const initDb = readRepoFile('docker/init-db.sql');

    for (const sql of [migration, initDb]) {
      expect(sql).toContain('CREATE TABLE');
      expect(sql).toContain('event_outbox');
      expect(sql).toContain('channels TEXT[] NOT NULL');
      expect(sql).toContain("CHECK (status IN ('pending', 'processing', 'published', 'failed'))");
      expect(sql).toContain('idx_event_outbox_due');
      expect(sql).toContain('idx_event_outbox_idempotency_key');
    }
  });

  it('backup restore drill schema exists in Flyway migration and historical init schema', () => {
    const migration = readRepoFile('docker/migrations/V011__backup_restore_drills.sql');
    const initDb = readRepoFile('docker/init-db.sql');

    for (const sql of [migration, initDb]) {
      expect(sql).toContain('CREATE TABLE');
      expect(sql).toContain('backup_drill');
      expect(sql).toContain('backup_object_manifest');
      expect(sql).toContain('backup_restore_gap');
      expect(sql).toContain('object_manifest_sha256');
      expect(sql).toContain('migration_version');
      expect(sql).toContain('missing_primary');
      expect(sql).toContain('purged_object_restored');
      expect(sql).toContain('rejected_purge_key_present');
    }
    expect(migration).toContain('FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('backup_drill_system_only');
  });

  it('search index outbox schema exists for Meilisearch outage catch-up', () => {
    const migration = readRepoFile('docker/migrations/V012__search_index_outbox.sql');
    const initDb = readRepoFile('docker/init-db.sql');

    for (const sql of [migration, initDb]) {
      expect(sql).toContain('search_index_outbox');
      expect(sql).toContain("operation IN ('index', 'update', 'delete')");
      expect(sql).toContain("status IN ('pending', 'processing', 'completed', 'failed')");
      expect(sql).toContain('idx_search_index_outbox_due');
      expect(sql).toContain('idx_search_index_outbox_stale_processing');
      expect(sql).toContain('idx_search_index_outbox_unique_active');
    }
    expect(migration).toContain('FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('search_index_outbox_app_or_system');
    expect(migration).toContain("app_id::text = current_setting('app.current_app_id', true)");
  });

  it('backup restore and chaos ops scripts are discoverable and executable', () => {
    const rootPackage = JSON.parse(readRepoFile('package.json'));
    const expectedScripts = [
      'scripts/ops/backup-postgres.sh',
      'scripts/ops/object-manifest.ts',
      'scripts/ops/restore-drill-local.sh',
      'scripts/ops/reconcile-restored-uploads.ts',
      'scripts/ops/chaos-compose.sh',
      'scripts/ops/health-sweep.sh',
    ];

    for (const script of expectedScripts) {
      const source = readRepoFile(script);
      const mode = statSync(path.join(repoRoot, script)).mode;
      expect(mode & 0o111).toBeGreaterThan(0);
      expect(source).toMatch(/DATABASE_URL|S3_BUCKET|docker compose|API_URL|OBJECT_MANIFEST_PATH/);
    }

    expect(rootPackage.scripts).toMatchObject({
      'ops:backup:postgres': 'bash scripts/ops/backup-postgres.sh',
      'ops:backup:objects': 'tsx scripts/ops/object-manifest.ts',
      'ops:restore:drill': 'bash scripts/ops/restore-drill-local.sh',
      'ops:restore:reconcile': 'tsx scripts/ops/reconcile-restored-uploads.ts',
      'ops:chaos': 'bash scripts/ops/chaos-compose.sh',
      'ops:health': 'bash scripts/ops/health-sweep.sh',
      'test:ops:contract': expect.stringContaining('tests/backup-restore.test.ts'),
    });
  });

  it('restore drill and reconciliation scripts guard destructive production actions', () => {
    const restoreDrill = readRepoFile('scripts/ops/restore-drill-local.sh');
    const reconcile = readRepoFile('scripts/ops/reconcile-restored-uploads.ts');

    expect(restoreDrill).toContain('RESTORE_DRILL_CONFIRM=I_UNDERSTAND_THIS_WILL_CLEAN_THE_TARGET');
    expect(restoreDrill).toContain('RESTORE_ALLOW_REMOTE_ISOLATED_TARGET');
    expect(restoreDrill).toContain('PRODUCTION_DATABASE_HOSTS');
    expect(restoreDrill).toContain('RESTORE_DATABASE_URL matches DATABASE_URL');
    expect(restoreDrill).toContain('command -v "${required_command}"');

    const backupPostgres = readRepoFile('scripts/ops/backup-postgres.sh');
    expect(backupPostgres).toContain('command -v "${required_command}"');

    expect(reconcile).toContain('RESTORE_DATABASE_URL || (apply ? undefined : process.env.DATABASE_URL)');
    expect(reconcile).toContain('RESTORE_DATABASE_URL matches DATABASE_URL');
    expect(reconcile).toContain('PRODUCTION_DATABASE_HOSTS');
    expect(reconcile).toContain('Object manifest checksum mismatch');
    expect(reconcile).toContain("phase: 'planned'");
    expect(reconcile).toContain("phase: 'final'");
    expect(reconcile).toContain('Object manifest metadata with manifestSha256 is required');
    expect(reconcile).toContain('Restore reconciliation completed with failed status');
    expect(reconcile).toContain('RESTORE_APPLY_ALL_APPS');
    expect(reconcile).toContain('DeleteObjectCommand');
    expect(reconcile).toContain('backup_drill');
    expect(reconcile).toContain('backup_object_manifest');
    expect(reconcile).toContain('backup_restore_gap');
    expect(reconcile).toContain("set_config('app.system_context', 'true', true)");
  });

  it('chaos scripts fail when the target compose service is absent', () => {
    const chaosScript = readRepoFile('scripts/ops/chaos-compose.sh');
    const chaosSpec = readRepoFile('tests/playwright/chat-chaos.spec.ts');

    expect(chaosScript).toContain('docker compose -p "${PROJECT}" -f "${COMPOSE_FILE}" ps -q "${SERVICE}"');
    expect(chaosScript).toContain('No running compose container found');
    expect(chaosScript).toContain('exit 3');
    expect(chaosSpec).toContain("'ps', '-q', service");
    expect(chaosSpec).toContain('No compose container found');
  });

  it('persistent message routes use the realtime outbox instead of direct Centrifugo publish', () => {
    const messagesRoute = readRepoFile('packages/api/src/routes/messages.ts');
    const threadsRoute = readRepoFile('packages/api/src/routes/threads.ts');

    for (const route of [messagesRoute, threadsRoute]) {
      expect(route).toContain('enqueueRealtimeEvent');
      expect(route).not.toMatch(/from ['"]\.\.\/services\/centrifugo['"]/);
      expect(route).not.toMatch(/centrifugo\./);
      expect(route).not.toMatch(/getCentrifugo\(\)\.publish/);
    }
  });

  it('persistent message mutations enqueue search outbox rows in the write transaction', () => {
    const messagesRoute = readRepoFile('packages/api/src/routes/messages.ts');
    const lifecycle = readRepoFile('packages/api/src/services/data-lifecycle.ts');
    const threadsRoute = readRepoFile('packages/api/src/routes/threads.ts');
    const migration = readRepoFile('docker/migrations/V012__search_index_outbox.sql');

    expect(messagesRoute).toContain('enqueueSearchIndexOperationTx(client, auth.appId, message.id, \'index\')');
    expect(messagesRoute).toContain('enqueueSearchIndexOperationTx(client, auth.appId, messageId, \'update\')');
    expect(messagesRoute).toContain('enqueueSearchIndexOperationTx(client, auth.appId, messageId, \'delete\')');
    expect(lifecycle).toContain('enqueueSearchIndexOperationTx(client, input.appId, input.messageId, \'delete\')');
    expect(threadsRoute).toContain('enqueueSearchIndexOperationTx(client, auth.appId, createdReply.id, \'index\')');
    expect(migration).toContain('search_index_outbox_app_or_system');
  });

  it('runtime DB role can execute tenant-checked sequence function after V013', () => {
    const v007 = readRepoFile('docker/migrations/V007__adversarial_rls_fixes.sql');
    const v013 = readRepoFile('docker/migrations/V013__runtime_role_sequence_execute.sql');

    expect(v007).toContain('SECURITY DEFINER');
    expect(v007).toContain('Channel is outside current tenant context');
    expect(v013).toContain('GRANT EXECUTE ON FUNCTION next_channel_seq(UUID) TO PUBLIC');
  });

  it('durable non-message realtime routes enqueue outbox events instead of direct publish', () => {
    const durableFiles = [
      'packages/api/src/routes/channels.ts',
      'packages/api/src/routes/workspaces.ts',
      'packages/api/src/routes/polls.ts',
      'packages/api/src/routes/receipts.ts',
      'packages/api/src/inngest/functions/link-preview.ts',
    ];

    for (const relativePath of durableFiles) {
      const route = readRepoFile(relativePath);
      expect(route).toContain('enqueueDomainRealtimeEvent');
      expect(route).not.toMatch(/getCentrifugo\(\)\.publish/);
      expect(route).not.toMatch(/centrifugo\.publish(?:Message|Read|Workspace|Channel|Poll|Unread|Total)/);
    }

    const channelsRoute = readRepoFile('packages/api/src/routes/channels.ts');
    const presenceRoute = readRepoFile('packages/api/src/routes/presence.ts');
    expect(channelsRoute).toContain('publishTyping');
    expect(presenceRoute).toContain('publishPresence');
  });

  it('production env examples expose the variables required by validation', () => {
    const example = parseEnvExample(readRepoFile('.env.production.example'));
    const minimal = parseEnvExample(readRepoFile('.env.production.minimal'));

    for (const env of [example, minimal]) {
      expect(env).toHaveProperty('DATABASE_URL');
      expect(env).toHaveProperty('S3_ENDPOINT');
      expect(env).toHaveProperty('S3_REGION');
      expect(env).toHaveProperty('S3_ACCESS_KEY_ID');
      expect(env).toHaveProperty('S3_SECRET_ACCESS_KEY');
      expect(env).toHaveProperty('S3_BUCKET');
      expect(env).toHaveProperty('JWT_SECRET');
      expect(env).toHaveProperty('CENTRIFUGO_TOKEN_SECRET');
      expect(env).toHaveProperty('CENTRIFUGO_API_URL');
      expect(env).toHaveProperty('CENTRIFUGO_API_KEY');
      expect(env).toHaveProperty('ALLOWED_ORIGINS');
      expect(env).toHaveProperty('CENTRIFUGO_ALLOWED_ORIGINS');
      expect(env).not.toHaveProperty('CENTRIFUGO_JWT_SECRET');
    }
  });

  it('validation rejects placeholders from production examples', () => {
    const example = parseEnvExample(readRepoFile('.env.production.example'));
    const result = validateProductionEnv({ ...example, NODE_ENV: 'production' });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'JWT_SECRET must not use a placeholder value',
      'CENTRIFUGO_TOKEN_SECRET must not use a placeholder value',
      'CENTRIFUGO_API_KEY must not use a placeholder value',
    ]));
  });

  it('prod Centrifugo config relies on env secrets and denies broad client subscriptions', () => {
    const config = JSON.parse(readRepoFile('docker/centrifugo.prod.json'));
    const namespaceNames = new Set((config.namespaces ?? []).map((namespace: any) => namespace.name));

    expect(config.token_hmac_secret_key).toBeUndefined();
    expect(config.api_key).toBeUndefined();
    expect(config.allowed_origins).toBeUndefined();
    expect(config.admin).toBe(false);
    expect(config.client_insecure).toBe(false);
    expect(config.debug).toBe(false);
    expect([...namespaceNames]).toEqual(expect.arrayContaining(['chat', 'user', 'workspace', 'app']));

    for (const namespace of config.namespaces ?? []) {
      expect(namespace.allow_subscribe_for_client).not.toBe(true);
      expect(namespace.allow_publish_for_client).not.toBe(true);
    }
  });

  it('storage runtime uses S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY', async () => {
    vi.resetModules();
    process.env.S3_ENDPOINT = 'https://storage.example.com';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ACCESS_KEY_ID = 'prod-access-key-id';
    process.env.S3_SECRET_ACCESS_KEY = 'prod-secret-access-key';
    process.env.S3_BUCKET = 'prod-bucket';
    process.env.S3_PUBLIC_URL = 'https://cdn.example.com';
    process.env.S3_FORCE_PATH_STYLE = 'false';

    const { getStorageConfig } = await import('../src/services/storage');

    expect(getStorageConfig()).toEqual(expect.objectContaining({
      endpoint: 'https://storage.example.com',
      accessKeyId: 'prod-access-key-id',
      secretAccessKey: 'prod-secret-access-key',
      bucket: 'prod-bucket',
      publicUrl: 'https://cdn.example.com',
      allowPublicRead: false,
    }));
  });

  it('storage startup removes bucket policies when private media mode is enabled', () => {
    const storageSource = readRepoFile('packages/api/src/services/storage.ts');

    expect(storageSource).toContain('DeleteBucketPolicyCommand');
    expect(storageSource).toContain('Removed storage bucket policy for private media mode');
    expect(storageSource).toContain('S3_ALLOW_PUBLIC_READ');
  });

  it('storage runtime still accepts legacy S3_ACCESS_KEY aliases', async () => {
    vi.resetModules();
    process.env.S3_ENDPOINT = 'https://storage.example.com';
    process.env.S3_ACCESS_KEY = 'legacy-access-key';
    process.env.S3_SECRET_KEY = 'legacy-secret-key';
    process.env.S3_BUCKET = 'legacy-bucket';

    const { getStorageConfig } = await import('../src/services/storage');

    expect(getStorageConfig()).toEqual(expect.objectContaining({
      accessKeyId: 'legacy-access-key',
      secretAccessKey: 'legacy-secret-key',
      bucket: 'legacy-bucket',
    }));
  });
});
