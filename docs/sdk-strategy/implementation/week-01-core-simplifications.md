# Week 1: Core Simplifications

**Timeline:** Days 1-5
**Goal:** Eliminate the biggest integration friction points
**Team:** 2 engineers (Backend + Full-stack)

## Overview

Week 1 focuses on the **foundational improvements** that make the biggest impact on developer experience:
1. Single token authentication (eliminate dual token confusion)
2. All-in-one Docker image (1 command instead of 6 services)
3. Smart environment defaults (3 vars instead of 20+)
4. Development mode (zero-config local setup)

**Impact:**
- Setup time: 2 hours → 15 minutes (after Week 1)
- Will reach 5 minutes target in Week 2 with CLI tool

## Daily Breakdown

### Day 1-2: Single Token Authentication

**Goal:** Developer handles 1 token instead of 2

#### Current Flow (Confusing)

```typescript
// Step 1: Get API key
const apiKey = 'app_key_123';

// Step 2: Get both tokens from /api/tokens
const response = await fetch('/api/tokens', {
  headers: { 'x-api-key': apiKey },
  body: JSON.stringify({ userId: 'alice' })
});
const { apiToken, wsToken } = await response.json();

// Step 3: Connect with both tokens
const client = createChatClient({ apiKey, apiUrl, wsUrl });
await client.connectUser(
  { id: 'alice' },
  { token: apiToken, wsToken }  // TWO TOKENS!
);
```

**Problem:** Developers don't understand why they need two tokens.

#### Target Flow (Simple)

```typescript
// One method, one token
const client = await ChatSDK.connect({
  apiKey: 'app_key_123',
  userId: 'alice',
  displayName: 'Alice',
  avatar: 'https://...'
});

// Done! Client is connected and ready
await client.sendMessage(channelId, { text: 'Hello!' });
```

#### Implementation

**1. Backend: Create `/api/auth/connect` Endpoint**

```typescript
// packages/api/src/routes/auth.ts

import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { db } from '../services/database';
import { validateApiKey } from '../middleware/apiKey';

const auth = new Hono();

/**
 * POST /api/auth/connect
 *
 * One-step authentication and user creation.
 * Returns both API token and WebSocket token (WS token hidden from developer).
 *
 * Request:
 * {
 *   "userId": "alice",
 *   "displayName": "Alice Smith",
 *   "avatar": "https://avatar.url",
 *   "metadata": { "email": "alice@example.com" }
 * }
 *
 * Response:
 * {
 *   "user": { "id": "alice", "displayName": "Alice Smith", ... },
 *   "token": "eyJ...",           // API token (15 min)
 *   "refreshToken": "eyJ...",    // Refresh token (24 hours)
 *   "_internal": {
 *     "wsToken": "eyJ..."         // WebSocket token (internal use)
 *   }
 * }
 */
auth.post('/connect', validateApiKey, async (c) => {
  const appId = c.get('appId'); // From API key middleware
  const { userId, displayName, avatar, metadata } = await c.req.json();

  // Validate input
  if (!userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  try {
    // Create or update user
    const user = await db.query(
      `INSERT INTO app_user (app_id, user_id, display_name, avatar_url, metadata, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (app_id, user_id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         metadata = EXCLUDED.metadata,
         last_seen_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [appId, userId, displayName, avatar, metadata ? JSON.stringify(metadata) : null]
    );

    // Generate API token (15 minutes)
    const apiToken = jwt.sign(
      {
        sub: userId,
        app_id: appId,
        type: 'access'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    // Generate refresh token (24 hours)
    const refreshToken = jwt.sign(
      {
        sub: userId,
        app_id: appId,
        type: 'refresh'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Generate WebSocket token (24 hours, for Centrifugo)
    const wsToken = jwt.sign(
      {
        sub: userId,
        app_id: appId
      },
      process.env.CENTRIFUGO_SECRET!,
      { expiresIn: '24h' }
    );

    // Store refresh token in database
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await db.query(
      `INSERT INTO refresh_token (app_id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours', $4, $5)`,
      [
        appId,
        userId,
        tokenHash,
        c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        c.req.header('user-agent')
      ]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_log (app_id, user_id, event_type, event_category, action, success, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [appId, userId, 'auth.connect', 'authentication', 'login', true, c.req.header('x-forwarded-for'), c.req.header('user-agent')]
    );

    return c.json({
      user: {
        id: user.user_id,
        displayName: user.display_name,
        avatar: user.avatar_url,
        metadata: user.metadata
      },
      token: apiToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      _internal: {
        wsToken // SDK will use this internally, developer doesn't see it
      }
    });

  } catch (err) {
    console.error('Connect error:', err);
    return c.json({ error: 'Failed to connect user' }, 500);
  }
});

export default auth;
```

**2. SDK: Simplify `connect()` Method**

```typescript
// packages/core/src/ChatSDK.ts

import { ChatClient, createChatClient } from './client/ChatClient';

export interface ConnectConfig {
  // Required
  apiKey: string;
  userId: string;

  // Optional user details
  displayName?: string;
  avatar?: string;
  metadata?: Record<string, any>;

  // Optional configuration
  apiUrl?: string;
  wsUrl?: string;
  debug?: boolean;
}

export class ChatSDK {
  /**
   * Connect to ChatSDK with a single method call.
   *
   * This handles:
   * - User authentication
   * - Token generation
   * - WebSocket connection
   * - User creation/update
   *
   * @example
   * const client = await ChatSDK.connect({
   *   apiKey: 'your-api-key',
   *   userId: 'alice',
   *   displayName: 'Alice Smith'
   * });
   *
   * await client.sendMessage(channelId, { text: 'Hello!' });
   */
  static async connect(config: ConnectConfig): Promise<ChatClient> {
    const {
      apiKey,
      userId,
      displayName,
      avatar,
      metadata,
      apiUrl = 'http://localhost:3000',
      wsUrl = 'ws://localhost:8000/connection/websocket',
      debug = false
    } = config;

    // Create client
    const client = createChatClient({
      apiKey,
      apiUrl,
      wsUrl,
      debug
    });

    // Call /api/auth/connect to get tokens
    const response = await fetch(`${apiUrl}/api/auth/connect`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        displayName,
        avatar,
        metadata
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Authentication failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();

    // Connect user with tokens (WS token handled internally)
    await client.connectUser(
      data.user,
      {
        token: data.token,
        wsToken: data._internal.wsToken,
        refreshToken: data.refreshToken
      }
    );

    return client;
  }

  /**
   * Connect in development mode (zero config).
   *
   * This automatically:
   * - Uses localhost URLs
   * - Creates app if needed
   * - Creates user if needed
   *
   * Only for development! Do not use in production.
   *
   * @example
   * const client = await ChatSDK.connectDevelopment({
   *   userId: 'alice'
   * });
   */
  static async connectDevelopment(config: {
    userId: string;
    displayName?: string;
  }): Promise<ChatClient> {
    // Use development API key (auto-generated by dev server)
    const apiKey = 'dev-api-key';

    return ChatSDK.connect({
      apiKey,
      userId: config.userId,
      displayName: config.displayName || config.userId,
      apiUrl: 'http://localhost:3000',
      wsUrl: 'ws://localhost:8000/connection/websocket',
      debug: true
    });
  }
}
```

**3. React: Update Provider**

```typescript
// packages/react/src/providers/ChatProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ChatClient } from '@chatsdk/core';
import { ChatSDK } from '@chatsdk/core';

interface ChatProviderProps {
  children: React.ReactNode;

  // Option 1: Pass existing client
  client?: ChatClient;

  // Option 2: Auto-connect with config
  apiKey?: string;
  userId?: string;
  displayName?: string;
  avatar?: string;
  apiUrl?: string;
  wsUrl?: string;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  client: existingClient,
  apiKey,
  userId,
  displayName,
  avatar,
  apiUrl,
  wsUrl
}) => {
  const [client, setClient] = useState<ChatClient | null>(existingClient || null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If client already provided, use it
    if (existingClient) {
      setClient(existingClient);
      return;
    }

    // Auto-connect if config provided
    if (apiKey && userId) {
      setIsConnecting(true);

      ChatSDK.connect({
        apiKey,
        userId,
        displayName,
        avatar,
        apiUrl,
        wsUrl
      })
        .then((newClient) => {
          setClient(newClient);
          setIsConnecting(false);
        })
        .catch((err) => {
          console.error('Failed to connect:', err);
          setError(err);
          setIsConnecting(false);
        });
    }
  }, [apiKey, userId, displayName, avatar, apiUrl, wsUrl, existingClient]);

  if (!client && !isConnecting) {
    return <div>Please provide either a client or connection config to ChatProvider</div>;
  }

  if (isConnecting) {
    return <div>Connecting...</div>;
  }

  if (error) {
    return <div>Connection failed: {error.message}</div>;
  }

  return (
    <ChatContext.Provider value={{ client: client! }}>
      {children}
    </ChatContext.Provider>
  );
};

// Usage example
export default function App() {
  return (
    <ChatProvider
      apiKey="your-api-key"
      userId="alice"
      displayName="Alice Smith"
    >
      <YourApp />
    </ChatProvider>
  );
}
```

#### Testing

```typescript
// packages/core/src/__tests__/ChatSDK.test.ts

import { ChatSDK } from '../ChatSDK';
import { setupTestServer } from './helpers/testServer';

describe('ChatSDK.connect()', () => {
  let server: any;

  beforeAll(() => {
    server = setupTestServer();
  });

  afterAll(() => {
    server.close();
  });

  it('should connect with single token', async () => {
    const client = await ChatSDK.connect({
      apiKey: 'test-api-key',
      userId: 'alice',
      displayName: 'Alice Smith',
      apiUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:8001/connection/websocket'
    });

    expect(client).toBeDefined();
    expect(client.isConnected()).toBe(true);
    expect(client.getCurrentUser()).toEqual({
      id: 'alice',
      displayName: 'Alice Smith'
    });
  });

  it('should handle authentication failure', async () => {
    await expect(
      ChatSDK.connect({
        apiKey: 'invalid-key',
        userId: 'alice'
      })
    ).rejects.toThrow('Authentication failed');
  });

  it('should work in development mode', async () => {
    const client = await ChatSDK.connectDevelopment({
      userId: 'bob'
    });

    expect(client).toBeDefined();
    expect(client.isConnected()).toBe(true);
  });
});
```

#### Acceptance Criteria

- [ ] `/api/auth/connect` endpoint works
- [ ] Returns API token, refresh token, and WebSocket token
- [ ] `ChatSDK.connect()` method works with single call
- [ ] `ChatSDK.connectDevelopment()` works without config
- [ ] React `<ChatProvider>` auto-connects with props
- [ ] All tests passing
- [ ] Backward compatible (old dual-token flow still works)

#### Documentation Update

```markdown
## Authentication (New Simplified Flow)

Connect to ChatSDK with a single method:

\`\`\`typescript
import { ChatSDK } from '@chatsdk/core';

const client = await ChatSDK.connect({
  apiKey: 'your-api-key',
  userId: 'user-123',
  displayName: 'John Doe',
  avatar: 'https://...'
});

// Ready to send messages!
await client.sendMessage(channelId, {
  text: 'Hello world!'
});
\`\`\`

### React Integration

\`\`\`typescript
import { ChatProvider } from '@chatsdk/react';

function App() {
  return (
    <ChatProvider
      apiKey="your-api-key"
      userId="user-123"
      displayName="John Doe"
    >
      <YourApp />
    </ChatProvider>
  );
}
\`\`\`

### Development Mode

For local development, use zero-config mode:

\`\`\`typescript
const client = await ChatSDK.connectDevelopment({
  userId: 'test-user'
});
\`\`\`

This automatically uses localhost and creates the user for you.
```

---

### Day 3: All-in-One Docker Image

**Goal:** `docker run` starts everything

#### Current Setup (Complex)

Requires starting 6 services manually:
1. PostgreSQL
2. Centrifugo
3. MinIO
4. Meilisearch
5. Redis
6. ChatSDK API

Each needs configuration, networking, env vars.

#### Target Setup (Simple)

```bash
# One command starts everything
docker run -p 3000:3000 -p 8000:8000 chatsdk/dev

# Output:
# ✨ ChatSDK Development Server
#
# Services:
# ✅ PostgreSQL (port 5432)
# ✅ Redis (port 6379)
# ✅ MinIO (port 9000)
# ✅ Meilisearch (port 7700)
# ✅ Centrifugo (port 8000)
# ✅ ChatSDK API (port 3000)
#
# API: http://localhost:3000
# WebSocket: ws://localhost:8000/connection/websocket
# API Key: dev-6d5f3c2a1b4e
#
# Test it:
#   curl http://localhost:3000/api/health
```

#### Implementation

**1. Create Multi-Service Dockerfile**

```dockerfile
# Dockerfile.dev
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    postgresql16 \
    postgresql16-contrib \
    redis \
    curl \
    bash \
    s6-overlay

# Install Centrifugo
RUN wget https://github.com/centrifugal/centrifugo/releases/download/v5.0.0/centrifugo_5.0.0_linux_amd64.tar.gz \
    && tar -xzf centrifugo_5.0.0_linux_amd64.tar.gz \
    && mv centrifugo /usr/local/bin/ \
    && rm centrifugo_5.0.0_linux_amd64.tar.gz

# Install MinIO
RUN wget https://dl.min.io/server/minio/release/linux-amd64/minio \
    && chmod +x minio \
    && mv minio /usr/local/bin/

# Install Meilisearch
RUN wget https://github.com/meilisearch/meilisearch/releases/download/v1.5.0/meilisearch-linux-amd64 \
    && chmod +x meilisearch-linux-amd64 \
    && mv meilisearch-linux-amd64 /usr/local/bin/meilisearch

# Copy ChatSDK source
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY docker ./docker
RUN npm install && npm run build

# Create data directories
RUN mkdir -p /data/postgres /data/minio /data/meilisearch /data/redis

# Copy s6 service definitions
COPY docker/s6-services /etc/s6-overlay/s6-rc.d/

# Copy entrypoint script
COPY docker/dev-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/dev-entrypoint.sh

EXPOSE 3000 5432 6379 7700 8000 9000

ENTRYPOINT ["/init"]
CMD ["dev-entrypoint.sh"]
```

**2. Create S6 Service Definitions**

s6-overlay manages multiple processes in one container.

```bash
# docker/s6-services/postgresql/run
#!/usr/bin/execlineb -P
with-contenv
s6-setuidgid postgres
postgres -D /data/postgres
```

```bash
# docker/s6-services/redis/run
#!/usr/bin/execlineb -P
redis-server --dir /data/redis
```

```bash
# docker/s6-services/minio/run
#!/usr/bin/execlineb -P
minio server /data/minio --console-address ":9001"
```

```bash
# docker/s6-services/meilisearch/run
#!/usr/bin/execlineb -P
meilisearch --db-path /data/meilisearch --http-addr 0.0.0.0:7700
```

```bash
# docker/s6-services/centrifugo/run
#!/usr/bin/execlineb -P
centrifugo --config /app/docker/centrifugo-dev.json
```

```bash
# docker/s6-services/chatsdk-api/run
#!/usr/bin/execlineb -P
with-contenv
cd /app
node packages/api/dist/index.js
```

**3. Create Startup Script**

```bash
#!/bin/bash
# docker/dev-entrypoint.sh

set -e

echo "🚀 Starting ChatSDK Development Environment"

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h localhost -p 5432; do
  sleep 1
done

# Initialize database if needed
if [ ! -f /data/postgres/initialized ]; then
  echo "📦 Initializing database..."
  psql -U postgres -c "CREATE DATABASE chatsdk;"
  psql -U postgres -d chatsdk -f /app/docker/schema.sql
  touch /data/postgres/initialized
fi

# Run migrations
echo "🔄 Running database migrations..."
cd /app && npm run migrate

# Create default app
if [ ! -f /data/dev-api-key.txt ]; then
  echo "🔑 Creating development app..."
  DEV_API_KEY=$(node /app/scripts/create-dev-app.js)
  echo $DEV_API_KEY > /data/dev-api-key.txt
fi

DEV_API_KEY=$(cat /data/dev-api-key.txt)

# Create MinIO bucket
echo "📦 Setting up MinIO..."
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/chatsdk-uploads || true

echo ""
echo "✅ ChatSDK Development Server Ready!"
echo ""
echo "Services:"
echo "  ✅ PostgreSQL (port 5432)"
echo "  ✅ Redis (port 6379)"
echo "  ✅ MinIO (port 9000)"
echo "  ✅ Meilisearch (port 7700)"
echo "  ✅ Centrifugo (port 8000)"
echo "  ✅ ChatSDK API (port 3000)"
echo ""
echo "API: http://localhost:3000"
echo "WebSocket: ws://localhost:8000/connection/websocket"
echo "API Key: $DEV_API_KEY"
echo ""
echo "Test it:"
echo "  curl http://localhost:3000/api/health"
echo ""
```

**4. Build and Test**

```bash
# Build image
docker build -t chatsdk/dev:latest -f Dockerfile.dev .

# Run image
docker run -p 3000:3000 -p 8000:8000 chatsdk/dev:latest

# Test it
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}

# Connect with SDK
node -e "
const { ChatSDK } = require('@chatsdk/core');
ChatSDK.connectDevelopment({ userId: 'alice' })
  .then(client => console.log('Connected!', client.getCurrentUser()));
"
```

#### Acceptance Criteria

- [ ] Docker image builds successfully
- [ ] All 6 services start automatically
- [ ] PostgreSQL initialized with schema
- [ ] Development API key auto-generated
- [ ] Health check endpoint works
- [ ] Can connect with SDK
- [ ] Image size <500 MB

---

### Day 4: Smart Environment Defaults

**Goal:** 3 env vars instead of 20+

#### Current (Complex)

```bash
# .env (20+ variables required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatsdk
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatsdk
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

CENTRIFUGO_URL=http://localhost:8000
CENTRIFUGO_API_KEY=dev-api-key
CENTRIFUGO_SECRET=dev-secret

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=chatsdk-uploads

MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=dev-key

JWT_SECRET=change-this-in-production
API_PORT=3000
NODE_ENV=development
```

#### Target (Simple)

```bash
# .env.development (auto-generated)
NODE_ENV=development

# Optional overrides:
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...
# JWT_SECRET=your-secret
```

#### Implementation

**1. Create Config with Smart Defaults**

```typescript
// packages/api/src/config/index.ts

import { z } from 'zod';

const isDev = process.env.NODE_ENV !== 'production';

// Development defaults
const DEV_DEFAULTS = {
  database: {
    url: 'postgresql://postgres:postgres@localhost:5432/chatsdk',
    ssl: false,
    poolSize: 20
  },
  centrifugo: {
    url: 'http://localhost:8000',
    apiKey: 'dev-api-key',
    secret: 'dev-secret-change-in-production'
  },
  redis: {
    url: 'redis://localhost:6379'
  },
  s3: {
    endpoint: 'http://localhost:9000',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    bucket: 'chatsdk-uploads',
    region: 'us-east-1'
  },
  meilisearch: {
    host: 'http://localhost:7700',
    apiKey: 'dev-master-key'
  },
  jwt: {
    secret: 'dev-jwt-secret-CHANGE-THIS-IN-PRODUCTION',
    expiresIn: '15m'
  },
  port: 3000
};

// Configuration schema
const configSchema = z.object({
  env: z.enum(['development', 'production', 'test']),
  port: z.number().int().min(1).max(65535),

  database: z.object({
    url: z.string().url(),
    ssl: z.boolean(),
    poolSize: z.number().int().min(1).max(100)
  }),

  centrifugo: z.object({
    url: z.string().url(),
    apiKey: z.string().min(1),
    secret: z.string().min(1)
  }),

  redis: z.object({
    url: z.string().url()
  }),

  s3: z.object({
    endpoint: z.string().url().optional(),
    accessKey: z.string().min(1),
    secretKey: z.string().min(1),
    bucket: z.string().min(1),
    region: z.string().default('us-east-1')
  }),

  meilisearch: z.object({
    host: z.string().url(),
    apiKey: z.string().min(1)
  }),

  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('15m')
  })
});

export type Config = z.infer<typeof configSchema>;

// Load configuration
export function loadConfig(): Config {
  const config = {
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    port: parseInt(process.env.PORT || String(DEV_DEFAULTS.port)),

    database: {
      url: process.env.DATABASE_URL || (isDev ? DEV_DEFAULTS.database.url : undefined),
      ssl: process.env.DB_SSL === 'true' || !isDev,
      poolSize: parseInt(process.env.DB_POOL_SIZE || String(DEV_DEFAULTS.database.poolSize))
    },

    centrifugo: {
      url: process.env.CENTRIFUGO_URL || (isDev ? DEV_DEFAULTS.centrifugo.url : undefined),
      apiKey: process.env.CENTRIFUGO_API_KEY || (isDev ? DEV_DEFAULTS.centrifugo.apiKey : undefined),
      secret: process.env.CENTRIFUGO_SECRET || (isDev ? DEV_DEFAULTS.centrifugo.secret : undefined)
    },

    redis: {
      url: process.env.REDIS_URL || (isDev ? DEV_DEFAULTS.redis.url : undefined)
    },

    s3: {
      endpoint: process.env.S3_ENDPOINT || (isDev ? DEV_DEFAULTS.s3.endpoint : undefined),
      accessKey: process.env.S3_ACCESS_KEY || (isDev ? DEV_DEFAULTS.s3.accessKey : undefined),
      secretKey: process.env.S3_SECRET_KEY || (isDev ? DEV_DEFAULTS.s3.secretKey : undefined),
      bucket: process.env.S3_BUCKET || DEV_DEFAULTS.s3.bucket,
      region: process.env.S3_REGION || DEV_DEFAULTS.s3.region
    },

    meilisearch: {
      host: process.env.MEILISEARCH_HOST || (isDev ? DEV_DEFAULTS.meilisearch.host : undefined),
      apiKey: process.env.MEILISEARCH_API_KEY || (isDev ? DEV_DEFAULTS.meilisearch.apiKey : undefined)
    },

    jwt: {
      secret: process.env.JWT_SECRET || (isDev ? DEV_DEFAULTS.jwt.secret : undefined),
      expiresIn: process.env.JWT_EXPIRES_IN || DEV_DEFAULTS.jwt.expiresIn
    }
  };

  // Validate configuration
  try {
    return configSchema.parse(config);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('❌ Configuration Error:');
      err.errors.forEach((error) => {
        console.error(`  - ${error.path.join('.')}: ${error.message}`);
      });

      // Helpful hints for common errors
      if (err.errors.some(e => e.path.includes('DATABASE_URL'))) {
        console.error('\n💡 Hint: Set DATABASE_URL environment variable');
        console.error('   Example: DATABASE_URL=postgresql://user:pass@localhost:5432/chatsdk');
      }

      if (err.errors.some(e => e.path.includes('JWT_SECRET'))) {
        console.error('\n💡 Hint: Set JWT_SECRET to a random 32+ character string');
        console.error('   Generate one: openssl rand -base64 32');
      }

      process.exit(1);
    }
    throw err;
  }
}

// Validate production configuration
export function validateProductionConfig(config: Config): void {
  if (config.env !== 'production') return;

  const errors: string[] = [];

  // Check for development secrets in production
  if (config.jwt.secret.includes('dev') || config.jwt.secret.includes('change')) {
    errors.push('JWT_SECRET is using a development default. Set a secure secret.');
  }

  if (config.centrifugo.secret.includes('dev') || config.centrifugo.secret.includes('change')) {
    errors.push('CENTRIFUGO_SECRET is using a development default. Set a secure secret.');
  }

  if (config.s3.accessKey === 'minioadmin') {
    errors.push('S3_ACCESS_KEY is using MinIO default. Set proper credentials.');
  }

  if (!config.database.ssl) {
    console.warn('⚠️  Warning: Database SSL is disabled in production');
  }

  if (errors.length > 0) {
    console.error('❌ Production Configuration Errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}

// Export singleton
export const config = loadConfig();
validateProductionConfig(config);
```

**2. Update Server to Use Config**

```typescript
// packages/api/src/index.ts

import { Hono } from 'hono';
import { config } from './config';

const app = new Hono();

// ... routes ...

console.log(`
✨ ChatSDK API Server

Environment: ${config.env}
API: http://localhost:${config.port}
Database: ${config.database.url.replace(/:[^:]*@/, ':****@')}
Redis: ${config.redis.url}
WebSocket: ${config.centrifugo.url}

${config.env === 'development' ? '🔧 Development mode - using default configuration' : ''}
${config.env === 'production' ? '🚀 Production mode - ensure all secrets are set!' : ''}
`);

app.listen(config.port);
```

**3. Create `.env.example`**

```bash
# .env.example
# Minimal configuration for development

NODE_ENV=development

# Optional: Override defaults
# DATABASE_URL=postgresql://user:pass@localhost:5432/chatsdk
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-32-character-secret

# Required in production:
# JWT_SECRET=<random-32-char-string>
# CENTRIFUGO_SECRET=<random-32-char-string>
# S3_ACCESS_KEY=<your-key>
# S3_SECRET_KEY=<your-secret>
```

#### Testing

```bash
# Test with no env vars (should work)
npm run dev
# Should start successfully with defaults

# Test with invalid config (should fail with helpful error)
JWT_SECRET=short npm run dev
# Expected: ❌ jwt.secret: String must contain at least 32 character(s)
# 💡 Hint: Generate one: openssl rand -base64 32

# Test production mode without proper secrets (should fail)
NODE_ENV=production npm start
# Expected: ❌ Production Configuration Errors:
#   - JWT_SECRET is using a development default
```

#### Acceptance Criteria

- [ ] API starts with zero env vars in development
- [ ] All services connect with default values
- [ ] Production mode validates secrets
- [ ] Clear error messages for missing config
- [ ] Helpful hints for common errors
- [ ] `.env.example` documented

---

### Day 5: Testing & Documentation

**Goal:** Validate Week 1 improvements

#### Integration Testing

```typescript
// packages/api/src/__tests__/integration/week1.test.ts

describe('Week 1: Integration Simplicity', () => {
  describe('Single Token Authentication', () => {
    it('should connect with one method call', async () => {
      const client = await ChatSDK.connect({
        apiKey: testApiKey,
        userId: 'alice'
      });

      expect(client.isConnected()).toBe(true);
    });

    it('should work in development mode', async () => {
      const client = await ChatSDK.connectDevelopment({
        userId: 'bob'
      });

      expect(client.isConnected()).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should start with zero env vars', () => {
      // Clear all env vars except NODE_ENV
      const originalEnv = process.env;
      process.env = { NODE_ENV: 'development' };

      const config = loadConfig();

      expect(config.database.url).toBeDefined();
      expect(config.jwt.secret).toBeDefined();

      process.env = originalEnv;
    });

    it('should fail in production without secrets', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'dev-secret';

      expect(() => validateProductionConfig(loadConfig())).toThrow();
    });
  });
});
```

#### Manual Testing Checklist

- [ ] Start API with no env vars → works
- [ ] Connect with `ChatSDK.connect()` → works
- [ ] Connect with `ChatSDK.connectDevelopment()` → works
- [ ] Send message → delivers successfully
- [ ] Docker image → all services start
- [ ] Docker container → can connect from outside

#### Documentation

Update the following docs:
- [ ] README.md - Add "Quick Start" section
- [ ] docs/getting-started.md - Update authentication steps
- [ ] docs/api-reference.md - Document new `/api/auth/connect`
- [ ] CHANGELOG.md - List Week 1 improvements

#### Week 1 Demo

**Prepare 5-minute demo:**
1. Show old flow (dual tokens, manual setup)
2. Show new flow (one line of code)
3. Show Docker image (one command)
4. Show development mode (zero config)

**Demo Script:**
```bash
# Old way (don't do this anymore)
# - Start 6 services manually
# - Configure 20+ env vars
# - Get two tokens
# - Connect with both tokens
# Result: 2 hours

# New way (Week 1)
docker run -p 3000:3000 -p 8000:8000 chatsdk/dev

# In another terminal:
node -e "
const { ChatSDK } = require('@chatsdk/core');

ChatSDK.connectDevelopment({ userId: 'alice' })
  .then(async (client) => {
    console.log('Connected in 5 seconds!');
    const message = await client.sendMessage('channel-id', {
      text: 'Hello from ChatSDK 2.0!'
    });
    console.log('Message sent:', message);
  });
"

# Result: 5 minutes (including Docker pull)
```

---

## Week 1 Success Criteria

### Must Have ✅

- [ ] Single token authentication works
- [ ] `ChatSDK.connect()` method implemented
- [ ] `ChatSDK.connectDevelopment()` works
- [ ] All-in-one Docker image builds
- [ ] Docker image starts all services
- [ ] Smart environment defaults work
- [ ] API starts with zero env vars in dev
- [ ] All tests passing (unit + integration)
- [ ] Backward compatible (old flow still works)

### Metrics

- [ ] Time to first message: **15 minutes** (down from 2 hours)
- [ ] Setup steps: **5** (down from 15+)
- [ ] Required env vars: **0 in dev** (down from 20+)
- [ ] Docker image size: **<500 MB**

### Deliverables

- [ ] Working code merged to `feature/sdk-2.0` branch
- [ ] Documentation updated
- [ ] Demo video recorded (5 min)
- [ ] Team demo completed

---

## Next Week Preview

**Week 2: Developer Tooling**
- CLI scaffolding tool (`npx create-chatsdk-app`)
- Project templates (Next.js, Vite, React Native)
- Example applications
- **Target: 5-minute setup achieved ✅**

---

## Troubleshooting

### Docker image won't build

**Error:** `Cannot find module '@chatsdk/core'`

**Solution:**
```bash
# Build packages first
npm run build

# Then build Docker image
docker build -t chatsdk/dev -f Dockerfile.dev .
```

### Services not starting in Docker

**Error:** `PostgreSQL connection refused`

**Solution:**
```bash
# Check if services are running
docker exec -it <container-id> ps aux

# Check logs
docker logs <container-id>

# Restart container
docker restart <container-id>
```

### Config validation failing

**Error:** `JWT_SECRET is too short`

**Solution:**
```bash
# Generate secure secret
openssl rand -base64 32

# Set in .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

---

## Questions?

Ask in `#sdk-2.0-dev` or open an issue with the `week-1` label.
