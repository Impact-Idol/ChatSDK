# Integration Simplicity: 5-Minute Setup

**Goal:** Reduce time-to-first-message from **2 hours → 5 minutes**

## Current Integration Flow (2 hours)

### Developer Journey Today

```
1. Read documentation (20 min)
2. Install dependencies (10 min)
   - PostgreSQL
   - Centrifugo
   - MinIO/S3
   - Meilisearch
   - Redis
3. Configure environment (30 min)
   - 20+ environment variables
   - Database connection
   - S3 credentials
   - Centrifugo secret
4. Run migrations (10 min)
5. Create app + API key (10 min)
6. Generate tokens (15 min)
   - Understand dual token system
   - POST /api/tokens with API key
   - Store both tokens
7. Initialize SDK (10 min)
   - Configure ChatClient
   - Set up ChatProvider
8. Build UI (15 min)
   - Import components
   - Wire up hooks
9. Test and debug (30 min)
   - Connection issues
   - Token problems
   - Missing env vars

Total: ~2 hours (if everything goes right)
```

**Pain Points:**
- 😫 6 services to install
- 😫 20+ environment variables
- 😫 Dual token system confusing
- 😫 Multiple steps to create app
- 😫 Cryptic error messages

## Target Integration Flow (5 minutes)

### Developer Journey (Future)

```
1. Install CLI (30 sec)
   npx create-chatsdk-app

2. Choose template (30 sec)
   - Next.js + React
   - Vite + React
   - React Native
   - Vanilla JS

3. Start development (1 min)
   npm run dev
   # All services start automatically

4. Copy auth code (1 min)
   # Pre-generated example with working tokens

5. Build UI (2 min)
   # Pre-built components, just customize

Total: 5 minutes to first message
```

**Improvements:**
- ✅ 1 command (CLI scaffolding)
- ✅ 0 env vars (pre-configured)
- ✅ 1 token (unified auth)
- ✅ Auto-start services (Docker Compose)
- ✅ Working examples (copy-paste)

## Implementation Plan

### 1. Single Token Authentication (Priority 1)

**Problem:** Dual tokens (API + WebSocket) confuse developers

**Current:**
```typescript
// Step 1: Get both tokens from API
const response = await fetch('/api/tokens', {
  headers: { 'x-api-key': apiKey },
  body: JSON.stringify({ userId })
});
const { apiToken, wsToken } = await response.json();

// Step 2: Use both tokens
const client = createChatClient({
  apiKey,
  apiUrl: '...',
  wsUrl: '...',
});

await client.connectUser(
  { id: userId },
  { token: apiToken, wsToken }
);
```

**Target:**
```typescript
// One method, one token
const client = await ChatSDK.connect({
  apiKey: 'your-api-key',
  userId: 'user-123',
  userToken: 'single-user-token'  // API generates WS token internally
});

// Or even simpler for development:
const client = await ChatSDK.connectDevelopment({
  userId: 'user-123'
  // Uses localhost, creates app/user automatically
});
```

**Implementation:**

```typescript
// Backend: Generate both tokens in one endpoint
// POST /api/auth/connect
export const connect = async (c: Context) => {
  const { userId, displayName, avatar } = await c.req.json();
  const appId = c.get('appId'); // From API key

  // Create/update user
  await db.query(
    `INSERT INTO app_user (app_id, user_id, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (app_id, user_id) DO UPDATE
       SET display_name = $3, avatar_url = $4`,
    [appId, userId, displayName, avatar]
  );

  // Generate API token (15 min)
  const apiToken = jwt.sign({ sub: userId, app_id: appId }, JWT_SECRET, { expiresIn: '15m' });

  // Generate WS token (embedded in API token metadata)
  const wsToken = jwt.sign({ sub: userId, app_id: appId }, CENTRIFUGO_SECRET, { expiresIn: '24h' });

  return c.json({
    user: { id: userId, displayName, avatar },
    token: apiToken,
    // SDK extracts WS token from API response, developer only handles one token
    _wsToken: wsToken  // Internal use
  });
};
```

```typescript
// SDK: Handle token internally
export const connect = async (config: {
  apiKey: string;
  userId: string;
  userToken?: string;
  displayName?: string;
  avatar?: string;
}): Promise<ChatClient> => {
  const client = createChatClient({
    apiKey: config.apiKey,
    apiUrl: config.apiUrl || 'http://localhost:3000',
    wsUrl: config.wsUrl || 'ws://localhost:8000/connection/websocket'
  });

  // Generate tokens via API
  const response = await fetch(`${config.apiUrl}/api/auth/connect`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: config.userId,
      displayName: config.displayName,
      avatar: config.avatar
    })
  });

  const { user, token, _wsToken } = await response.json();

  // Connect with both tokens (developer only sees one)
  await client.connectUser(user, { token, wsToken: _wsToken });

  return client;
};
```

**Benefit:** Developer handles 1 token instead of 2, 50% simpler

**Timeline:** 2 days

### 2. All-in-One Docker Image (Priority 1)

**Problem:** 6 services to install manually

**Current:**
```yaml
# docker-compose.yml (developer must create)
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ...
  centrifugo:
    image: centrifugo/centrifugo:v5
    command: ...
  minio:
    image: minio/minio
  meilisearch:
    image: getmeili/meilisearch
  redis:
    image: redis:7
  chatsdk-api:
    build: .
    depends_on: [postgres, centrifugo, minio, redis]
```

**Target:**
```bash
# One command
npx chatsdk dev

# Or with Docker
docker run -p 3000:3000 -p 8000:8000 chatsdk/dev

# Everything starts automatically:
# ✅ PostgreSQL (with migrations)
# ✅ Centrifugo (configured)
# ✅ MinIO (with test bucket)
# ✅ Meilisearch (indexed)
# ✅ Redis (ready)
# ✅ ChatSDK API (running)
```

**Implementation:**

```dockerfile
# Dockerfile.dev - All-in-one development image
FROM node:20-alpine AS base

# Install PostgreSQL
RUN apk add --no-cache postgresql postgresql-contrib

# Install Redis
RUN apk add --no-cache redis

# Copy Centrifugo binary
COPY --from=centrifugo/centrifugo:v5 /usr/local/bin/centrifugo /usr/local/bin/

# Copy MinIO binary
COPY --from=minio/minio:latest /usr/bin/minio /usr/bin/

# Copy Meilisearch binary
COPY --from=getmeili/meilisearch:latest /bin/meilisearch /usr/bin/

# Copy ChatSDK code
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Startup script
COPY docker/dev-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/dev-entrypoint.sh

EXPOSE 3000 8000 5432 6379 7700 9000

CMD ["dev-entrypoint.sh"]
```

```bash
#!/bin/bash
# docker/dev-entrypoint.sh

echo "🚀 Starting ChatSDK Development Environment"

# Start PostgreSQL
echo "📦 Starting PostgreSQL..."
su-exec postgres initdb -D /var/lib/postgresql/data
su-exec postgres pg_ctl start -D /var/lib/postgresql/data -l /tmp/postgres.log
sleep 2
su-exec postgres createdb chatsdk

# Run migrations
echo "🔄 Running database migrations..."
cd /app && npx flyway migrate

# Start Redis
echo "📦 Starting Redis..."
redis-server --daemonize yes

# Start MinIO
echo "📦 Starting MinIO..."
mkdir -p /tmp/minio/chatsdk-uploads
minio server /tmp/minio --console-address ":9001" &

# Start Meilisearch
echo "📦 Starting Meilisearch..."
meilisearch --db-path /tmp/meilisearch --http-addr 0.0.0.0:7700 &

# Start Centrifugo
echo "📦 Starting Centrifugo..."
centrifugo --config /app/docker/centrifugo-dev.json &

# Wait for services
sleep 5

# Create default app
echo "🔑 Creating development app..."
node /app/scripts/create-dev-app.js

# Start ChatSDK API
echo "✅ Starting ChatSDK API..."
cd /app && npm run dev

# Keep container running
wait
```

**Benefit:** 1 command instead of 15+ steps

**Timeline:** 1 day

### 3. CLI Scaffolding Tool (Priority 2)

**Problem:** Manual project setup, no templates

**Target:**
```bash
$ npx create-chatsdk-app my-chat-app

✨ Create ChatSDK App

? Choose a template:
  ❯ Next.js + React + TypeScript (Recommended)
    Vite + React + TypeScript
    React Native + TypeScript
    Vanilla JavaScript + HTML
    Vue + TypeScript (coming soon)

? Choose features:
  ✔ Message threads
  ✔ File uploads
  ✔ Reactions
  ✔ User mentions
  ❯ Voice messages
    Video messages
    Message search

? Development environment:
  ❯ Local (Docker)
    Cloud (ChatSDK Cloud)

📦 Installing dependencies...
✅ Project created successfully!

🚀 Next steps:
  cd my-chat-app
  npm run dev

Your app is running at:
  - Frontend: http://localhost:3000
  - API: http://localhost:3001
  - Dashboard: http://localhost:3001/admin

Test credentials:
  User 1: alice (Token: abc123)
  User 2: bob (Token: def456)
```

**Implementation:**

```typescript
// packages/create-chatsdk-app/src/index.ts
import { Command } from 'commander';
import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();

program
  .name('create-chatsdk-app')
  .description('Create a new ChatSDK application')
  .argument('[project-name]', 'Name of the project')
  .action(async (projectName?: string) => {
    // Prompt for project name if not provided
    if (!projectName) {
      const response = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'my-chat-app'
      });
      projectName = response.projectName;
    }

    // Choose template
    const { template } = await prompts({
      type: 'select',
      name: 'template',
      message: 'Choose a template:',
      choices: [
        { title: 'Next.js + React + TypeScript (Recommended)', value: 'nextjs' },
        { title: 'Vite + React + TypeScript', value: 'vite' },
        { title: 'React Native + TypeScript', value: 'react-native' },
        { title: 'Vanilla JavaScript + HTML', value: 'vanilla' }
      ]
    });

    // Choose features
    const { features } = await prompts({
      type: 'multiselect',
      name: 'features',
      message: 'Choose features:',
      choices: [
        { title: 'Message threads', value: 'threads', selected: true },
        { title: 'File uploads', value: 'files', selected: true },
        { title: 'Reactions', value: 'reactions', selected: true },
        { title: 'User mentions', value: 'mentions', selected: true },
        { title: 'Voice messages', value: 'voice' },
        { title: 'Video messages', value: 'video' },
        { title: 'Message search', value: 'search' }
      ]
    });

    // Choose environment
    const { environment } = await prompts({
      type: 'select',
      name: 'environment',
      message: 'Development environment:',
      choices: [
        { title: 'Local (Docker)', value: 'local' },
        { title: 'Cloud (ChatSDK Cloud)', value: 'cloud' }
      ]
    });

    // Create project
    const projectPath = path.join(process.cwd(), projectName);

    console.log(`\n📦 Creating project at ${projectPath}...\n`);

    // Copy template
    const templatePath = path.join(__dirname, '../templates', template);
    await fs.copy(templatePath, projectPath);

    // Generate config based on features
    const config = {
      features,
      environment,
      apiUrl: environment === 'local' ? 'http://localhost:3001' : 'https://api.chatsdk.dev',
      wsUrl: environment === 'local' ? 'ws://localhost:8000/connection/websocket' : 'wss://ws.chatsdk.dev'
    };

    await fs.writeJSON(path.join(projectPath, 'chatsdk.config.json'), config, { spaces: 2 });

    // Install dependencies
    console.log('📦 Installing dependencies...\n');
    await exec(`cd ${projectPath} && npm install`);

    // Start services if local
    if (environment === 'local') {
      console.log('🐳 Starting Docker services...\n');
      await exec(`cd ${projectPath} && docker-compose up -d`);

      // Create test users
      console.log('👥 Creating test users...\n');
      await exec(`cd ${projectPath} && node scripts/create-test-users.js`);
    }

    console.log(`\n✅ Project created successfully!\n`);
    console.log(`🚀 Next steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm run dev\n`);

    if (environment === 'local') {
      console.log(`Your app is running at:`);
      console.log(`  - Frontend: http://localhost:3000`);
      console.log(`  - API: http://localhost:3001`);
      console.log(`  - Dashboard: http://localhost:3001/admin\n`);
      console.log(`Test credentials:`);
      console.log(`  User 1: alice (Token: abc123)`);
      console.log(`  User 2: bob (Token: def456)`);
    }
  });

program.parse();
```

**Benefit:** Zero-config setup, templates for all platforms

**Timeline:** 3 days

### 4. Smart Environment Defaults (Priority 2)

**Problem:** 20+ environment variables required

**Current:**
```bash
# .env (must configure all of these)
DATABASE_URL=postgresql://...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatsdk
DB_USER=postgres
DB_PASSWORD=...
DB_SSL=false

CENTRIFUGO_URL=http://localhost:8000
CENTRIFUGO_API_KEY=...
CENTRIFUGO_SECRET=...

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=chatsdk-uploads

MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=...

JWT_SECRET=...
API_KEY=...

# ... 10 more
```

**Target:**
```bash
# .env.development (auto-generated)
CHATSDK_ENV=development
CHATSDK_API_KEY=dev-api-key-auto-generated

# Optional overrides:
# DATABASE_URL=...
# REDIS_URL=...
```

**Implementation:**

```typescript
// packages/api/src/config/defaults.ts
export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDev = env === 'development';

  return {
    // Database - smart defaults
    database: {
      url: process.env.DATABASE_URL || (isDev
        ? 'postgresql://postgres:postgres@localhost:5432/chatsdk'
        : undefined // Required in production
      ),
      ssl: process.env.DB_SSL === 'true' || !isDev,
      poolSize: parseInt(process.env.DB_POOL_SIZE || '20')
    },

    // Centrifugo - auto-configure in dev
    centrifugo: {
      url: process.env.CENTRIFUGO_URL || 'http://localhost:8000',
      apiKey: process.env.CENTRIFUGO_API_KEY || (isDev ? 'dev-api-key' : undefined),
      secret: process.env.CENTRIFUGO_SECRET || (isDev ? 'dev-secret' : undefined)
    },

    // Redis - localhost default
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },

    // S3 - MinIO defaults for dev
    s3: {
      endpoint: process.env.S3_ENDPOINT || (isDev ? 'http://localhost:9000' : undefined),
      accessKey: process.env.S3_ACCESS_KEY || (isDev ? 'minioadmin' : undefined),
      secretKey: process.env.S3_SECRET_KEY || (isDev ? 'minioadmin' : undefined),
      bucket: process.env.S3_BUCKET || 'chatsdk-uploads',
      region: process.env.S3_REGION || 'us-east-1'
    },

    // Meilisearch - localhost default
    search: {
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY || (isDev ? 'dev-key' : undefined)
    },

    // JWT - auto-generate for dev
    jwt: {
      secret: process.env.JWT_SECRET || (isDev
        ? 'dev-jwt-secret-change-in-production'
        : undefined // Required in production
      ),
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    },

    // API key - auto-generate for dev
    apiKey: process.env.CHATSDK_API_KEY || (isDev
      ? 'dev-api-key'
      : undefined // Required in production
    )
  };
};

// Validation
export const validateConfig = (config: ReturnType<typeof getConfig>) => {
  const errors: string[] = [];

  if (!config.database.url) {
    errors.push('DATABASE_URL is required in production');
  }

  if (!config.jwt.secret || config.jwt.secret.includes('dev')) {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }

  if (!config.apiKey || config.apiKey === 'dev-api-key') {
    errors.push('CHATSDK_API_KEY must be set in production');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
};
```

**Benefit:** 3 env vars instead of 20+

**Timeline:** 1 day

### 5. Embedded Quickstart Guide (Priority 3)

**Problem:** Developers don't know where to start

**Target:**
```typescript
// When developer first runs API
$ npm run dev

✨ ChatSDK Development Server

📚 Getting Started Guide:
  1. Create your first app:
     curl -X POST http://localhost:3001/api/apps \\
       -H "Content-Type: application/json" \\
       -d '{"name":"My Chat App"}'

  2. Get API key from response, then:
     curl -X POST http://localhost:3001/api/auth/connect \\
       -H "x-api-key: YOUR_API_KEY" \\
       -d '{"userId":"alice","displayName":"Alice"}'

  3. Copy token from response and use in your app:
     import { ChatSDK } from '@chatsdk/react';

     const client = await ChatSDK.connect({
       apiKey: 'YOUR_API_KEY',
       userId: 'alice',
       userToken: 'TOKEN_FROM_STEP_2'
     });

📖 Full documentation: http://localhost:3001/docs
🎮 Try the playground: http://localhost:3001/playground

✅ Server running at http://localhost:3001
```

**Implementation:**

```typescript
// packages/api/src/server.ts
const app = new Hono();

// Add quickstart endpoint
app.get('/docs/quickstart', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>ChatSDK Quickstart</title>
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 50px auto; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>🚀 ChatSDK Quickstart</h1>

        <h2>Step 1: Create an App</h2>
        <pre><code>curl -X POST http://localhost:3001/api/apps \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Chat App"}'</code></pre>

        <p>Copy the <code>apiKey</code> from the response.</p>

        <h2>Step 2: Connect a User</h2>
        <pre><code>curl -X POST http://localhost:3001/api/auth/connect \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"alice","displayName":"Alice"}'</code></pre>

        <p>Copy the <code>token</code> from the response.</p>

        <h2>Step 3: Use in Your App</h2>
        <pre><code>import { ChatSDK } from '@chatsdk/react';

const client = await ChatSDK.connect({
  apiKey: 'YOUR_API_KEY',
  userId: 'alice',
  userToken: 'TOKEN_FROM_STEP_2'
});

// Send a message
await client.sendMessage('channel-id', {
  text: 'Hello world!'
});</code></pre>

        <h2>Next Steps</h2>
        <ul>
          <li><a href="/docs">Full Documentation</a></li>
          <li><a href="/playground">Interactive Playground</a></li>
          <li><a href="https://github.com/chatsdk/examples">Example Apps</a></li>
        </ul>
      </body>
    </html>
  `);
});

// Show quickstart URL on startup
app.onError((err, c) => {
  console.error(err);
  return c.text('Internal Server Error', 500);
});

console.log(`
✨ ChatSDK Development Server

📚 Quickstart: http://localhost:3001/docs/quickstart
📖 Documentation: http://localhost:3001/docs
🎮 Playground: http://localhost:3001/playground

✅ Server running at http://localhost:3001
`);
```

**Benefit:** Self-service onboarding

**Timeline:** 2 days

## Success Metrics

### Quantitative

| Metric | Current | Target |
|--------|---------|--------|
| **Time to first message** | 2 hours | 5 minutes |
| **Setup steps** | 15+ | 3 |
| **Required env vars** | 20+ | 3 |
| **Services to install** | 6 | 1 (Docker) |
| **Integration success rate** | 60% | 95% |

### Qualitative

**Developer Feedback:**
- "Easiest chat SDK I've ever used"
- "Worked on first try"
- "Better DX than Stream"

**Comparison:**
- Simpler than Stream Chat: ✅
- Simpler than SendBird: ✅
- Simpler than Twilio: ✅

## Timeline

**Week 1:**
- ✅ Single token authentication (2 days)
- ✅ All-in-one Docker image (1 day)
- ✅ Smart environment defaults (1 day)
- ✅ Embedded quickstart guide (2 days)

**Week 2:**
- ✅ CLI scaffolding tool (3 days)
- ✅ Template examples (2 days)
- ✅ Testing with 10 developers (2 days)

**Week 3:**
- ✅ Documentation updates (3 days)
- ✅ Video tutorial (1 day)
- ✅ Blog post launch (1 day)
- ✅ Community feedback (ongoing)

**Launch:** End of Week 3

## Next Steps

1. Implement single token authentication
2. Build all-in-one Docker image
3. Create CLI tool
4. Test with 10 developers
5. Iterate based on feedback
6. Launch "ChatSDK 2.0 - Developer Edition"
