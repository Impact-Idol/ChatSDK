# Security Hardening Guide

**Document Date:** 2026-01-09
**Audience:** Engineering Teams, Security Engineers

## Overview

This guide provides detailed instructions for implementing application-level security enhancements required for HIPAA compliance.

**Prerequisites:** Infrastructure deployed per [Infrastructure Guide](06-infrastructure-guide.md)

## 1. Data Retention and Automated Deletion

### Implementation

#### Step 1: Add Retention Configuration to App Schema

```sql
-- Add retention policy to app settings
ALTER TABLE app ADD COLUMN retention_days INTEGER DEFAULT 2555; -- 7 years default
ALTER TABLE app ADD COLUMN data_retention_enabled BOOLEAN DEFAULT TRUE;

-- Add legal hold flag to messages
ALTER TABLE message ADD COLUMN legal_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE message ADD COLUMN legal_hold_reason TEXT;
ALTER TABLE message ADD COLUMN legal_hold_by TEXT;
ALTER TABLE message ADD COLUMN legal_hold_at TIMESTAMP;

-- Create archive table for deleted messages
CREATE TABLE message_deleted (
  LIKE message INCLUDING ALL,
  deleted_at TIMESTAMP DEFAULT NOW(),
  deleted_by TEXT DEFAULT 'system',
  deletion_reason TEXT DEFAULT 'retention-policy'
);

-- Create index for cleanup queries
CREATE INDEX idx_message_created_retention ON message(app_id, created_at)
  WHERE deleted_at IS NULL AND legal_hold = FALSE;
```

#### Step 2: Implement Deletion Function

```sql
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS TABLE(app_id UUID, messages_deleted BIGINT, messages_archived BIGINT) AS $$
DECLARE
  app_record RECORD;
  deleted_count BIGINT;
  archived_count BIGINT;
  expiration_date TIMESTAMP;
BEGIN
  -- Loop through apps with retention policies
  FOR app_record IN
    SELECT id, retention_days
    FROM app
    WHERE retention_days IS NOT NULL
      AND data_retention_enabled = TRUE
  LOOP
    expiration_date := NOW() - (app_record.retention_days || ' days')::INTERVAL;

    -- Archive messages first
    WITH archived AS (
      INSERT INTO message_deleted (
        id, app_id, channel_id, user_id, type, text, text_encrypted,
        metadata, reply_to, thread_id, created_at, updated_at, deleted_at,
        legal_hold, legal_hold_reason, legal_hold_by, legal_hold_at,
        deleted_by, deletion_reason
      )
      SELECT
        m.*,
        NOW() AS deleted_at,
        'system' AS deleted_by,
        'retention-policy-expiration' AS deletion_reason
      FROM message m
      WHERE m.app_id = app_record.id
        AND m.created_at < expiration_date
        AND m.deleted_at IS NULL
        AND m.legal_hold = FALSE
      RETURNING *
    )
    SELECT COUNT(*) INTO archived_count FROM archived;

    -- Delete from main table
    DELETE FROM message m
    WHERE m.app_id = app_record.id
      AND m.created_at < expiration_date
      AND m.deleted_at IS NULL
      AND m.legal_hold = FALSE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Audit log
    INSERT INTO audit_log (
      app_id, user_id, event_type, event_category, action,
      resource_type, success, metadata
    ) VALUES (
      app_record.id,
      'system',
      'message.retention_deletion',
      'administrative',
      'delete',
      'message',
      TRUE,
      jsonencode(json_build_object(
        'deleted_count', deleted_count,
        'archived_count', archived_count,
        'retention_days', app_record.retention_days,
        'expiration_date', expiration_date
      ))
    );

    RETURN QUERY SELECT app_record.id, deleted_count, archived_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### Step 3: Schedule Deletion Job

**Option A: Kubernetes CronJob**

```yaml
# kubernetes/cronjobs/message-retention-cleanup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: message-retention-cleanup
  namespace: chatsdk-prod
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: chatsdk-api:latest
            command: ["/bin/sh"]
            args:
              - -c
              - |
                echo "Starting retention cleanup..."
                psql $DATABASE_URL -c "SELECT * FROM delete_expired_messages();"
                echo "Cleanup complete."
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: chatsdk-secrets
                  key: DATABASE_URL
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 500m
                memory: 512Mi
          restartPolicy: OnFailure
```

**Option B: pg_cron Extension**

```sql
-- Install pg_cron extension
CREATE EXTENSION pg_cron;

-- Schedule nightly cleanup at 2 AM
SELECT cron.schedule(
  'delete-expired-messages',
  '0 2 * * *',
  'SELECT delete_expired_messages()'
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

#### Step 4: Add API Endpoints for Legal Hold

```typescript
// /packages/api/src/routes/legal-hold.ts
import { Hono } from 'hono';
import { db } from '../services/database';
import { authMiddleware } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const app = new Hono();

// Apply legal hold to message
app.post('/messages/:messageId/legal-hold', authMiddleware, async (c) => {
  const { messageId } = c.req.param();
  const { reason } = await c.req.json();
  const userId = c.get('userId');
  const appId = c.get('appId');

  // Check if user has admin role
  const user = await db.query(
    'SELECT role FROM channel_member WHERE app_id = $1 AND user_id = $2',
    [appId, userId]
  );

  if (!user || !['owner', 'admin'].includes(user.role)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  // Apply legal hold
  await db.query(
    `UPDATE message
     SET legal_hold = TRUE,
         legal_hold_reason = $1,
         legal_hold_by = $2,
         legal_hold_at = NOW()
     WHERE id = $3 AND app_id = $4`,
    [reason, userId, messageId, appId]
  );

  // Audit log
  await auditLog({
    appId,
    userId,
    ipAddress: c.req.header('x-forwarded-for') || '',
    userAgent: c.req.header('user-agent') || '',
    eventType: 'message.legal_hold_applied',
    eventCategory: 'administrative',
    action: 'update',
    resourceType: 'message',
    resourceId: messageId,
    success: true,
    metadata: { reason }
  });

  return c.json({ success: true });
});

// Remove legal hold
app.delete('/messages/:messageId/legal-hold', authMiddleware, async (c) => {
  const { messageId } = c.req.param();
  const userId = c.get('userId');
  const appId = c.get('appId');

  // Check admin role
  const user = await db.query(
    'SELECT role FROM channel_member WHERE app_id = $1 AND user_id = $2',
    [appId, userId]
  );

  if (!user || !['owner', 'admin'].includes(user.role)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  // Remove legal hold
  await db.query(
    `UPDATE message
     SET legal_hold = FALSE,
         legal_hold_reason = NULL,
         legal_hold_by = NULL,
         legal_hold_at = NULL
     WHERE id = $1 AND app_id = $2`,
    [messageId, appId]
  );

  // Audit log
  await auditLog({
    appId,
    userId,
    ipAddress: c.req.header('x-forwarded-for') || '',
    userAgent: c.req.header('user-agent') || '',
    eventType: 'message.legal_hold_removed',
    eventCategory: 'administrative',
    action: 'update',
    resourceType: 'message',
    resourceId: messageId,
    success: true
  });

  return c.json({ success: true });
});

export default app;
```

## 2. Field-Level Encryption for PHI

### Implementation with AWS KMS

#### Step 1: Create KMS Key

```bash
# Create KMS key via AWS CLI
aws kms create-key \
  --description "ChatSDK message content encryption" \
  --key-policy file://kms-policy.json

# Create alias
aws kms create-alias \
  --alias-name alias/chatsdk-message-encryption \
  --target-key-id <key-id>
```

**kms-policy.json:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow API to encrypt/decrypt",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/chatsdk-api-role"
      },
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Step 2: Add Database Column

```sql
-- Add encrypted column to message table
ALTER TABLE message ADD COLUMN text_encrypted BYTEA;

-- Add flag to app to enable PHI encryption
ALTER TABLE app ADD COLUMN phi_encryption_enabled BOOLEAN DEFAULT FALSE;

-- Create index for encrypted messages
CREATE INDEX idx_message_encrypted ON message(app_id, id) WHERE text_encrypted IS NOT NULL;
```

#### Step 3: Implement Encryption Service

```typescript
// /packages/api/src/services/encryption.ts
import { KMSClient, EncryptCommand, DecryptCommand, GenerateDataKeyCommand } from '@aws-sdk/client-kms';

const kmsClient = new KMSClient({ region: process.env.AWS_REGION });
const KEY_ID = process.env.KMS_MESSAGE_ENCRYPTION_KEY_ID;

export interface EncryptionResult {
  ciphertext: Buffer;
  dataKey?: Buffer;  // For envelope encryption
}

/**
 * Encrypt message text using AWS KMS
 *
 * Uses envelope encryption:
 * 1. Generate data key from KMS
 * 2. Encrypt plaintext with data key (AES-256)
 * 3. Store encrypted data key with ciphertext
 */
export const encryptMessageText = async (plaintext: string): Promise<Buffer> => {
  if (!plaintext || plaintext.length === 0) {
    throw new Error('Plaintext cannot be empty');
  }

  try {
    const command = new EncryptCommand({
      KeyId: KEY_ID,
      Plaintext: Buffer.from(plaintext, 'utf8')
    });

    const response = await kmsClient.send(command);

    if (!response.CiphertextBlob) {
      throw new Error('Encryption failed: no ciphertext returned');
    }

    return Buffer.from(response.CiphertextBlob);
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Failed to encrypt message text');
  }
};

/**
 * Decrypt message text using AWS KMS
 */
export const decryptMessageText = async (ciphertext: Buffer): Promise<string> => {
  if (!ciphertext || ciphertext.length === 0) {
    throw new Error('Ciphertext cannot be empty');
  }

  try {
    const command = new DecryptCommand({
      CiphertextBlob: ciphertext
    });

    const response = await kmsClient.send(command);

    if (!response.Plaintext) {
      throw new Error('Decryption failed: no plaintext returned');
    }

    return Buffer.from(response.Plaintext).toString('utf8');
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('Failed to decrypt message text');
  }
};

/**
 * Batch decrypt multiple messages (more efficient)
 */
export const batchDecryptMessages = async (
  messages: Array<{ id: string; text_encrypted: Buffer }>
): Promise<Map<string, string>> => {
  const results = new Map<string, string>();

  // Decrypt in parallel (KMS supports high concurrency)
  await Promise.all(
    messages.map(async (message) => {
      try {
        const plaintext = await decryptMessageText(message.text_encrypted);
        results.set(message.id, plaintext);
      } catch (err) {
        console.error(`Failed to decrypt message ${message.id}:`, err);
        results.set(message.id, '[Decryption failed]');
      }
    })
  );

  return results;
};
```

#### Step 4: Update Message Service

```typescript
// /packages/api/src/services/messages.ts
import { encryptMessageText, decryptMessageText, batchDecryptMessages } from './encryption';

export const createMessage = async (data: MessageInput): Promise<Message> => {
  // Check if app has PHI encryption enabled
  const app = await db.query(
    'SELECT phi_encryption_enabled FROM app WHERE id = $1',
    [data.appId]
  );

  let textPlaintext = null;
  let textEncrypted = null;

  if (app.phi_encryption_enabled && data.text) {
    // Encrypt message text
    textEncrypted = await encryptMessageText(data.text);
    // Don't store plaintext if encrypted
  } else {
    // Store plaintext for non-PHI apps (better performance)
    textPlaintext = data.text;
  }

  // Insert message
  const message = await db.query(
    `INSERT INTO message (
      app_id, channel_id, user_id, type, text, text_encrypted, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [data.appId, data.channelId, data.userId, data.type, textPlaintext, textEncrypted, data.metadata]
  );

  // Return message with decrypted text if needed
  if (message.text_encrypted) {
    message.text = await decryptMessageText(message.text_encrypted);
  }

  return message;
};

export const getMessages = async (
  appId: string,
  channelId: string,
  limit: number = 50,
  beforeSeq?: number
): Promise<Message[]> => {
  // Fetch messages
  const messages = await db.query(
    `SELECT * FROM message
     WHERE app_id = $1 AND channel_id = $2
       AND ($3::bigint IS NULL OR seq < $3)
     ORDER BY seq DESC
     LIMIT $4`,
    [appId, channelId, beforeSeq, limit]
  );

  // Batch decrypt if needed
  const encryptedMessages = messages.filter(m => m.text_encrypted);

  if (encryptedMessages.length > 0) {
    const decrypted = await batchDecryptMessages(encryptedMessages);

    messages.forEach(message => {
      if (message.text_encrypted) {
        message.text = decrypted.get(message.id) || '[Decryption failed]';
      }
    });
  }

  return messages;
};
```

#### Step 5: Migration Script

```typescript
// scripts/migrate-to-encrypted.ts
import { db } from '../packages/api/src/services/database';
import { encryptMessageText } from '../packages/api/src/services/encryption';

async function migrateMessagesToEncrypted(appId: string) {
  console.log(`Migrating messages for app ${appId}...`);

  // Get total count
  const { count } = await db.query(
    'SELECT COUNT(*) as count FROM message WHERE app_id = $1 AND text IS NOT NULL AND text_encrypted IS NULL',
    [appId]
  );

  console.log(`Found ${count} messages to encrypt`);

  let migrated = 0;
  const batchSize = 100;

  while (migrated < count) {
    // Fetch batch
    const messages = await db.query(
      `SELECT id, text FROM message
       WHERE app_id = $1 AND text IS NOT NULL AND text_encrypted IS NULL
       ORDER BY created_at
       LIMIT $2`,
      [appId, batchSize]
    );

    // Encrypt and update
    for (const message of messages) {
      try {
        const encrypted = await encryptMessageText(message.text);

        await db.query(
          'UPDATE message SET text_encrypted = $1, text = NULL WHERE id = $2',
          [encrypted, message.id]
        );

        migrated++;

        if (migrated % 100 === 0) {
          console.log(`Migrated ${migrated}/${count} messages`);
        }
      } catch (err) {
        console.error(`Failed to migrate message ${message.id}:`, err);
      }
    }

    // Sleep to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Migration complete: ${migrated} messages encrypted`);
}

// Run migration
const appId = process.argv[2];
if (!appId) {
  console.error('Usage: npm run migrate-to-encrypted <app-id>');
  process.exit(1);
}

migrateMessagesToEncrypted(appId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
```

**Run migration:**

```bash
npm run migrate-to-encrypted <app-id>
```

## 3. Session Management with Short-Lived Tokens

### Implementation

#### Step 1: Add Refresh Token Table

```sql
CREATE TABLE refresh_token (
  app_id UUID NOT NULL,
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,  -- SHA256 hash
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  device_id TEXT
);

CREATE INDEX idx_refresh_token_user ON refresh_token(app_id, user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_token_hash ON refresh_token(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_token_expires ON refresh_token(expires_at) WHERE revoked_at IS NULL;

-- Cleanup expired tokens (run nightly)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM refresh_token
  WHERE expires_at < NOW() OR revoked_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

#### Step 2: Implement Token Service

```typescript
// /packages/api/src/services/tokens.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './database';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const generateTokenPair = async (
  userId: string,
  appId: string,
  ipAddress?: string,
  userAgent?: string,
  deviceId?: string
): Promise<TokenPair> => {
  // Access token: 15 minutes
  const accessToken = jwt.sign(
    {
      sub: userId,
      app_id: appId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  // Refresh token: 24 hours
  const refreshTokenValue = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshTokenValue)
    .digest('hex');

  // Store refresh token in database
  await db.query(
    `INSERT INTO refresh_token (
      app_id, user_id, token_hash, expires_at, ip_address, user_agent, device_id
    ) VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours', $4, $5, $6)`,
    [appId, userId, refreshTokenHash, ipAddress, userAgent, deviceId]
  );

  // JWT wrapper for refresh token
  const refreshToken = jwt.sign(
    {
      sub: userId,
      app_id: appId,
      token: refreshTokenValue,
      type: 'refresh'
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 900  // 15 minutes in seconds
  };
};

export const refreshAccessToken = async (
  refreshToken: string,
  ipAddress?: string
): Promise<string> => {
  // Verify JWT
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET!);
  } catch (err) {
    throw new Error('Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  // Hash token value
  const tokenHash = crypto
    .createHash('sha256')
    .update(payload.token)
    .digest('hex');

  // Check if token exists and not revoked
  const storedToken = await db.query(
    `SELECT * FROM refresh_token
     WHERE app_id = $1 AND user_id = $2 AND token_hash = $3
       AND expires_at > NOW() AND revoked_at IS NULL`,
    [payload.app_id, payload.sub, tokenHash]
  );

  if (!storedToken) {
    throw new Error('Refresh token not found or expired');
  }

  // Update last used
  await db.query(
    'UPDATE refresh_token SET last_used_at = NOW() WHERE id = $1',
    [storedToken.id]
  );

  // Generate new access token
  const accessToken = jwt.sign(
    {
      sub: payload.sub,
      app_id: payload.app_id,
      type: 'access'
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  return accessToken;
};

export const revokeRefreshToken = async (
  userId: string,
  appId: string,
  reason: string
): Promise<void> => {
  await db.query(
    `UPDATE refresh_token
     SET revoked_at = NOW(), revoked_reason = $3
     WHERE app_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [appId, userId, reason]
  );
};

export const revokeAllUserTokens = async (
  userId: string,
  appId: string
): Promise<void> => {
  await revokeRefreshToken(userId, appId, 'logout-all-sessions');
};
```

#### Step 3: Update Authentication Routes

```typescript
// /packages/api/src/routes/auth.ts
import { Hono } from 'hono';
import { generateTokenPair, refreshAccessToken, revokeRefreshToken } from '../services/tokens';
import { auditLog } from '../middleware/audit';

const app = new Hono();

// Login
app.post('/login', async (c) => {
  const { userId, password, mfaToken } = await c.req.json();
  const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '';
  const userAgent = c.req.header('user-agent') || '';

  // Verify credentials
  const user = await verifyCredentials(userId, password);

  if (!user) {
    await auditLog({
      appId: user?.app_id || 'unknown',
      userId,
      ipAddress,
      userAgent,
      eventType: 'auth.login_failed',
      eventCategory: 'authentication',
      action: 'login',
      success: false,
      failureReason: 'invalid-credentials'
    });

    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Check MFA if enabled
  if (user.mfa_enabled) {
    if (!mfaToken) {
      return c.json({ error: 'MFA token required', mfa_required: true }, 401);
    }

    const mfaValid = await verifyMFAToken(userId, user.app_id, mfaToken);

    if (!mfaValid) {
      await auditLog({
        appId: user.app_id,
        userId,
        ipAddress,
        userAgent,
        eventType: 'auth.mfa_failed',
        eventCategory: 'security',
        action: 'login',
        success: false,
        failureReason: 'invalid-mfa-token'
      });

      return c.json({ error: 'Invalid MFA token' }, 401);
    }
  }

  // Generate tokens
  const tokens = await generateTokenPair(userId, user.app_id, ipAddress, userAgent);

  // Audit log
  await auditLog({
    appId: user.app_id,
    userId,
    ipAddress,
    userAgent,
    eventType: 'auth.login_success',
    eventCategory: 'authentication',
    action: 'login',
    success: true
  });

  return c.json(tokens);
});

// Refresh token
app.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json();
  const ipAddress = c.req.header('x-forwarded-for') || '';

  try {
    const newAccessToken = await refreshAccessToken(refreshToken, ipAddress);

    return c.json({
      accessToken: newAccessToken,
      expiresIn: 900
    });
  } catch (err) {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});

// Logout
app.post('/logout', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const appId = c.get('appId');

  await revokeRefreshToken(userId, appId, 'user-logout');

  await auditLog({
    appId,
    userId,
    ipAddress: c.req.header('x-forwarded-for') || '',
    userAgent: c.req.header('user-agent') || '',
    eventType: 'auth.logout',
    eventCategory: 'authentication',
    action: 'logout',
    success: true
  });

  return c.json({ success: true });
});

// Logout all sessions
app.post('/logout-all', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const appId = c.get('appId');

  await revokeAllUserTokens(userId, appId);

  await auditLog({
    appId,
    userId,
    ipAddress: c.req.header('x-forwarded-for') || '',
    userAgent: c.req.header('user-agent') || '',
    eventType: 'auth.logout_all',
    eventCategory: 'security',
    action: 'logout',
    success: true
  });

  return c.json({ success: true });
});

export default app;
```

## 4. Multi-Factor Authentication (MFA)

### Implementation

#### Step 1: Add MFA Fields to Database

```sql
-- Add MFA fields to app_user
ALTER TABLE app_user ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE app_user ADD COLUMN mfa_secret BYTEA;  -- Encrypted TOTP secret
ALTER TABLE app_user ADD COLUMN mfa_backup_codes TEXT[];  -- Encrypted backup codes
ALTER TABLE app_user ADD COLUMN mfa_enabled_at TIMESTAMP;

-- Add MFA requirement to app
ALTER TABLE app ADD COLUMN mfa_required BOOLEAN DEFAULT FALSE;
ALTER TABLE app ADD COLUMN mfa_grace_period_days INTEGER DEFAULT 7;
```

#### Step 2: Implement MFA Service

```typescript
// /packages/api/src/services/mfa.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from './database';

const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY!;

function encrypt(text: string): Buffer {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.alloc(16, 0));
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted;
}

function decrypt(buffer: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.alloc(16, 0));
  let decrypted = decipher.update(buffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

export const setupMFA = async (
  userId: string,
  appId: string
): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> => {
  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `ChatSDK (${appId})`,
    length: 32
  });

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // Encrypt and store
  const encryptedSecret = encrypt(secret.base32);
  const encryptedBackupCodes = backupCodes.map(code => encrypt(code));

  await db.query(
    `UPDATE app_user
     SET mfa_secret = $1, mfa_backup_codes = $2
     WHERE app_id = $3 AND user_id = $4`,
    [encryptedSecret, encryptedBackupCodes, appId, userId]
  );

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes
  };
};

export const verifyMFAToken = async (
  userId: string,
  appId: string,
  token: string
): Promise<boolean> => {
  const user = await db.query(
    'SELECT mfa_secret, mfa_backup_codes FROM app_user WHERE app_id = $1 AND user_id = $2',
    [appId, userId]
  );

  if (!user || !user.mfa_secret) {
    return false;
  }

  // Try TOTP token
  const secret = decrypt(user.mfa_secret);
  const totpValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2  // Allow ±60 seconds
  });

  if (totpValid) {
    return true;
  }

  // Try backup codes
  if (user.mfa_backup_codes) {
    const backupCodes = user.mfa_backup_codes.map((code: Buffer) => decrypt(code));

    if (backupCodes.includes(token.toUpperCase())) {
      // Remove used backup code
      const remainingCodes = user.mfa_backup_codes.filter(
        (code: Buffer) => decrypt(code) !== token.toUpperCase()
      );

      await db.query(
        'UPDATE app_user SET mfa_backup_codes = $1 WHERE app_id = $2 AND user_id = $3',
        [remainingCodes, appId, userId]
      );

      return true;
    }
  }

  return false;
};

export const enableMFA = async (
  userId: string,
  appId: string,
  token: string
): Promise<boolean> => {
  // Verify token before enabling
  const valid = await verifyMFAToken(userId, appId, token);

  if (!valid) {
    return false;
  }

  // Enable MFA
  await db.query(
    'UPDATE app_user SET mfa_enabled = TRUE, mfa_enabled_at = NOW() WHERE app_id = $1 AND user_id = $2',
    [appId, userId]
  );

  return true;
};

export const disableMFA = async (
  userId: string,
  appId: string,
  password: string
): Promise<boolean> => {
  // Verify password before disabling
  const valid = await verifyPassword(userId, appId, password);

  if (!valid) {
    return false;
  }

  // Disable MFA
  await db.query(
    `UPDATE app_user
     SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_backup_codes = NULL
     WHERE app_id = $1 AND user_id = $2`,
    [appId, userId]
  );

  return true;
};
```

## 5. Comprehensive Audit Logging

### Implementation

Already covered in [Implementation Roadmap](04-implementation-roadmap.md#week-3-comprehensive-audit-logging).

Key points:
- ✅ CloudTrail for AWS API calls
- ✅ Application audit log table
- ✅ 7-year retention
- ✅ Tamper detection

## Testing Checklist

- [ ] Data retention: Verify messages deleted after retention period
- [ ] Legal hold: Verify messages with legal hold not deleted
- [ ] Encryption: Verify encrypted messages readable after decryption
- [ ] Session timeout: Verify access tokens expire after 15 minutes
- [ ] Token refresh: Verify refresh token mechanism works
- [ ] MFA setup: Verify QR code generation and TOTP verification
- [ ] MFA enforcement: Verify users cannot login without MFA when required
- [ ] Audit logging: Verify all events logged correctly

## Performance Impact

| Feature | Latency Impact | Notes |
|---------|----------------|-------|
| **Encryption** | +5-10ms | Per message encrypt/decrypt |
| **Token Validation** | +1-2ms | JWT verification only |
| **MFA Verification** | +50-100ms | TOTP calculation |
| **Audit Logging** | +2-5ms | Async write to database |

**Total Impact:** <20ms on average (acceptable)

## Security Best Practices

1. **Rotate encryption keys annually**
2. **Monitor failed MFA attempts** (>5 in 15 minutes = alert)
3. **Review audit logs weekly** for suspicious activity
4. **Test backup restoration quarterly**
5. **Run security scans monthly** (vulnerability scanning)
6. **Update dependencies** (npm audit fix)
7. **Conduct security training** (developers, quarterly)

## Next Steps

1. Deploy security hardening to staging
2. Run security tests
3. Complete [Compliance Checklist](08-compliance-checklist.md)
4. Schedule external penetration testing
