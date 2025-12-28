# ChatSDK Implementation Roadmap
**Enterprise Feature Completion Plan**

**Last Updated:** December 27, 2025
**Status:** 85-90% Complete
**Remaining Work:** 2-3 weeks

---

## Executive Summary

Based on comprehensive architecture analysis, ChatSDK has **already implemented 85-90% of enterprise features**. This roadmap focuses on completing the remaining 10-15% and preparing for Impact Idol integration.

### Progress Overview

| Category | Implemented | Remaining | Priority |
|----------|------------|-----------|----------|
| **Database Schema** | 100% (23/23 work streams) | 0% | - |
| **API Routes** | 100% (22/22 route files) | 0% | - |
| **Core Services** | 95% (Metrics/Logger exist, need middleware) | 5% | P1 |
| **React Components** | 85% (50+ components, missing Poll UI) | 15% | P1-P2 |
| **Infrastructure** | 100% (Docker Compose stack) | 0% | - |
| **Documentation** | 60% (API docs exist, need examples) | 40% | P2 |

**Overall Completion:** 85-90%

---

## Phase 1: Quick Wins (Days 1-5) - Infrastructure Wiring

### 1.1 Image Processing with Sharp & Blurhash ⚡ P1

**Status:** ⚠️ Dependencies installed ([`packages/api/package.json`](../../packages/api/package.json)), needs route wiring
**Effort:** 2-3 days
**Files to Modify:**
- `packages/api/src/services/image-processing.ts` (NEW)
- `packages/api/src/routes/uploads.ts` (UPDATE)
- `docker/init-db.sql` (ADD blurhash + thumbnail_url columns)

#### Tasks

**Task 1.1.1:** Create Image Processing Service (1 day)

**File:** `packages/api/src/services/image-processing.ts`

```typescript
import sharp from 'sharp';
import { encode } from 'blurhash';

export interface ProcessedImage {
  width: number;
  height: number;
  blurhash: string;
  thumbnailUrl: string;
  optimizedUrl: string;
}

/**
 * Process uploaded image - generate blurhash, thumbnail, optimized version
 */
export async function processImage(
  fileBuffer: Buffer,
  filename: string,
  uploadToStorage: (buffer: Buffer, key: string) => Promise<string>
): Promise<ProcessedImage> {
  const image = sharp(fileBuffer);
  const metadata = await image.metadata();

  // 1. Generate thumbnail (300x300 max, maintain aspect ratio)
  const thumbnailBuffer = await image
    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbnailUrl = await uploadToStorage(thumbnailBuffer, `thumbnails/${filename}`);

  // 2. Generate optimized version (1200px max width)
  const optimizedBuffer = await image
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  const optimizedUrl = await uploadToStorage(optimizedBuffer, `images/${filename}`);

  // 3. Generate blurhash (32x32 downscale for speed)
  const blurhashImage = sharp(fileBuffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw();

  const { data, info } = await blurhashImage.toBuffer({ resolveWithObject: true });

  // Blurhash needs Uint8ClampedArray
  const blurhash = encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4, // X components
    4  // Y components
  );

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    blurhash,
    thumbnailUrl,
    optimizedUrl,
  };
}

/**
 * Validate image file (Impact Idol requirements: max 10MB, allowed types)
 */
export function validateImage(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF' };
  }

  if (buffer.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image too large. Max 10MB' };
  }

  return { valid: true };
}
```

**Task 1.1.2:** Update Upload Route (1 day)

**File:** `packages/api/src/routes/uploads.ts`

```typescript
import { processImage, validateImage } from '../services/image-processing';

// Add to existing POST /api/uploads/images route
uploadRoutes.post('/images', requireUser, async (c) => {
  const auth = c.get('auth');
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate
  const validation = validateImage(buffer, file.type);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // Process image
  const processed = await processImage(buffer, file.name, async (buf, key) => {
    return await uploadToS3(buf, key, auth.appId);
  });

  // Save to database
  const upload = await db.query(
    `INSERT INTO upload (app_id, user_id, filename, content_type, size,
     url, thumbnail_url, width, height, blurhash, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed')
     RETURNING *`,
    [
      auth.appId,
      auth.userId,
      file.name,
      file.type,
      buffer.length,
      processed.optimizedUrl,
      processed.thumbnailUrl,
      processed.width,
      processed.height,
      processed.blurhash,
    ]
  );

  return c.json(upload.rows[0], 201);
});
```

**Task 1.1.3:** Database Migration (0.5 days)

```sql
-- Add columns to upload table
ALTER TABLE upload
  ADD COLUMN IF NOT EXISTS blurhash VARCHAR(50),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

CREATE INDEX IF NOT EXISTS idx_upload_blurhash ON upload (blurhash)
  WHERE blurhash IS NOT NULL;
```

**Acceptance Criteria:**
- ✅ Upload image → Returns blurhash string
- ✅ Thumbnail generated (300x300 max)
- ✅ Optimized version generated (1200px max)
- ✅ Blurhash renders correctly in React components
- ✅ Progressive image loading works (blur → full image)

---

### 1.2 Prometheus Metrics Middleware ⚡ P1

**Status:** ⚠️ Metrics exist ([`packages/api/src/services/metrics.ts`](../../packages/api/src/services/metrics.ts)), needs middleware
**Effort:** 1 day
**Files to Modify:**
- `packages/api/src/middleware/metrics.ts` (NEW)
- `packages/api/src/index.ts` (UPDATE - add middleware)

#### Tasks

**Task 1.2.1:** Create Metrics Middleware (0.5 days)

**File:** `packages/api/src/middleware/metrics.ts`

```typescript
import { Context, Next } from 'hono';
import { httpRequestsInFlight, trackHttpRequest } from '../services/metrics';

export async function metricsMiddleware(c: Context, next: Next) {
  const start = process.hrtime.bigint();
  const path = c.req.path;
  const method = c.req.method;

  // Increment in-flight requests
  httpRequestsInFlight.inc();

  try {
    await next();
  } finally {
    // Decrement in-flight requests
    httpRequestsInFlight.dec();

    // Calculate duration in seconds
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const statusCode = c.res.status;

    // Get app_id from context (if authenticated)
    const auth = c.get('auth');
    const appId = auth?.appId;

    // Track request metrics
    trackHttpRequest(method, path, statusCode, duration, appId);
  }
}
```

**Task 1.2.2:** Wire Up Middleware (0.5 days)

**File:** `packages/api/src/index.ts`

```typescript
import { Hono } from 'hono';
import { metricsMiddleware } from './middleware/metrics';
import { getMetrics, register } from './services/metrics';

const app = new Hono();

// Apply metrics middleware to all routes
app.use('*', metricsMiddleware);

// Metrics endpoint (should be protected in production)
app.get('/metrics', async (c) => {
  const metrics = await getMetrics();
  return c.text(metrics, 200, {
    'Content-Type': register.contentType()
  });
});

// ... rest of routes
```

**Acceptance Criteria:**
- ✅ `/metrics` endpoint returns Prometheus format
- ✅ All HTTP requests tracked (method, route, status_code, duration)
- ✅ In-flight requests gauge works
- ✅ Metrics can be scraped by Prometheus server

---

### 1.3 Pino Logger Middleware ⚡ P1

**Status:** ⚠️ Logger exists ([`packages/api/src/services/logger.ts`](../../packages/api/src/services/logger.ts)), needs middleware
**Effort:** 1 day
**Files to Modify:**
- `packages/api/src/middleware/logging.ts` (NEW)
- `packages/api/src/index.ts` (UPDATE)

#### Tasks

**Task 1.3.1:** Create Logging Middleware (0.5 days)

**File:** `packages/api/src/middleware/logging.ts`

```typescript
import { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { logger, logRequest } from '../services/logger';

export async function loggingMiddleware(c: Context, next: Next) {
  const requestId = uuidv4();
  const start = Date.now();

  const auth = c.get('auth');
  const reqLogger = logger.child({
    requestId,
    userId: auth?.userId,
    appId: auth?.appId,
  });

  // Attach logger to context
  c.set('logger', reqLogger);

  reqLogger.debug({
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
  }, 'Request started');

  await next();

  const duration = Date.now() - start;

  logRequest(
    c.req.method,
    c.req.path,
    c.res.status,
    duration,
    {
      requestId,
      userId: auth?.userId,
      appId: auth?.appId,
    }
  );
}
```

**Task 1.3.2:** Wire Up Middleware (0.5 days)

**File:** `packages/api/src/index.ts`

```typescript
import { loggingMiddleware } from './middleware/logging';

app.use('*', loggingMiddleware);
```

**Acceptance Criteria:**
- ✅ All requests logged with request ID, user ID, app ID
- ✅ Duration tracking works
- ✅ Pretty print in development, JSON in production
- ✅ Error stack traces logged
- ✅ Request context attached to all logs in a request

---

### 1.4 Link Preview Generation ⚡ P2

**Status:** ⚠️ Table column exists (`message.link_previews`), Inngest job needs implementation
**Effort:** 2 days
**Files to Modify:**
- `packages/api/src/inngest/link-preview.ts` (NEW)
- `packages/api/src/inngest/index.ts` (UPDATE - register function)

#### Tasks

**Task 1.4.1:** Create Link Preview Function (1.5 days)

**File:** `packages/api/src/inngest/link-preview.ts`

```typescript
import { inngest } from './client';
import { db } from '../services/database';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

/**
 * Extract URLs from message text
 */
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Fetch Open Graph metadata
 */
async function fetchOpenGraphData(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (ChatSDK LinkPreview Bot)',
      },
      timeout: 5000,
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract og: tags
    const getMetaTag = (property: string) => {
      const tag = document.querySelector(`meta[property="${property}"]`);
      return tag?.getAttribute('content') || null;
    };

    // Check for video embed (YouTube, Vimeo)
    const isVideo = url.includes('youtube.com') || url.includes('vimeo.com');
    let videoEmbedUrl = null;

    if (url.includes('youtube.com') && url.includes('watch?v=')) {
      const videoId = new URL(url).searchParams.get('v');
      videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      videoEmbedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    return {
      url,
      title: getMetaTag('og:title') || document.querySelector('title')?.textContent,
      description: getMetaTag('og:description'),
      image: getMetaTag('og:image'),
      video: isVideo ? {
        embedUrl: videoEmbedUrl,
        thumbnail: getMetaTag('og:image'),
      } : null,
    };
  } catch (error) {
    console.error(`Failed to fetch link preview for ${url}:`, error);
    return null;
  }
}

/**
 * Generate link previews for a message
 */
export const generateLinkPreview = inngest.createFunction(
  { id: 'generate-link-preview' },
  { event: 'chat/message.created' },
  async ({ event, step }) => {
    const { messageId, text, appId } = event.data;

    // Extract URLs from message text
    const urls = extractUrls(text);

    if (urls.length === 0) {
      return { skipped: true, reason: 'No URLs found' };
    }

    // Fetch metadata for each URL (max 3)
    const previews = await Promise.all(
      urls.slice(0, 3).map(url => fetchOpenGraphData(url))
    );

    const validPreviews = previews.filter(p => p !== null);

    if (validPreviews.length === 0) {
      return { skipped: true, reason: 'No valid previews generated' };
    }

    // Update message with link previews
    await step.run('update-message', async () => {
      await db.query(
        `UPDATE message SET link_previews = $1 WHERE id = $2`,
        [JSON.stringify(validPreviews), messageId]
      );
    });

    return {
      messageId,
      previewsGenerated: validPreviews.length,
      previews: validPreviews,
    };
  }
);
```

**Task 1.4.2:** Trigger Event on Message Send (0.5 days)

**File:** `packages/api/src/routes/messages.ts`

```typescript
import { inngest } from '../inngest/client';

// After message insert
await inngest.send({
  name: 'chat/message.created',
  data: {
    messageId: message.id,
    text: message.text,
    appId: auth.appId,
    channelId: message.channel_id,
  },
});
```

**Acceptance Criteria:**
- ✅ URLs extracted from message text
- ✅ Open Graph metadata fetched
- ✅ YouTube/Vimeo video embeds detected
- ✅ Link previews stored in `message.link_previews` JSONB
- ✅ React component displays link previews

---

## Phase 2: React Component Completion (Days 6-10)

### 2.1 Poll UI Components ⚡ P1

**Status:** ⚠️ API fully implemented ([`polls.ts`](../../packages/api/src/routes/polls.ts)), needs React components
**Effort:** 2-3 days
**Files to Create:**
- `packages/react/src/components/sdk/PollMessage.tsx` (NEW)
- `packages/react/src/components/sdk/CreatePollDialog.tsx` (NEW)
- `packages/react/src/hooks/usePolls.ts` (NEW)

#### Tasks

**Task 2.1.1:** Create Poll Hook (1 day)

**File:** `packages/react/src/hooks/usePolls.ts`

```typescript
import { useState, useEffect } from 'react';
import { useChatContext } from './useChatContext';

export interface PollOption {
  id: string;
  text: string;
  voteCount?: number;
  voters?: Array<{ userId: string; name: string; image: string }>;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  isMultiChoice: boolean;
  totalVotes: number;
  userVotes: string[];
  endsAt?: string;
  createdAt: string;
}

export function usePolls(messageId: string) {
  const { client } = useChatContext();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch poll results
  const fetchPoll = async () => {
    setLoading(true);
    try {
      // Get poll ID from message
      const message = await client.getMessage(messageId);
      if (!message.pollId) {
        setPoll(null);
        return;
      }

      const response = await client.http.get(`/api/polls/${message.pollId}/results`);
      setPoll(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Vote on poll
  const vote = async (optionIds: string[]) => {
    if (!poll) return;

    setLoading(true);
    try {
      await client.http.post(`/api/polls/${poll.id}/vote`, { optionIds });
      await fetchPoll(); // Refresh results
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Remove vote
  const removeVote = async () => {
    if (!poll) return;

    setLoading(true);
    try {
      await client.http.delete(`/api/polls/${poll.id}/vote`);
      await fetchPoll();
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();

    // Subscribe to poll updates
    const unsubscribe = client.on('poll.voted', (event) => {
      if (event.pollId === poll?.id) {
        fetchPoll();
      }
    });

    return () => unsubscribe();
  }, [messageId]);

  return {
    poll,
    loading,
    error,
    vote,
    removeVote,
    refresh: fetchPoll,
  };
}
```

**Task 2.1.2:** Create Poll Message Component (1 day)

**File:** `packages/react/src/components/sdk/PollMessage.tsx`

```typescript
import React from 'react';
import { usePolls } from '../../hooks/usePolls';

interface PollMessageProps {
  messageId: string;
}

export function PollMessage({ messageId }: PollMessageProps) {
  const { poll, loading, vote, removeVote } = usePolls(messageId);

  if (!poll || loading) {
    return <div className="poll-loading">Loading poll...</div>;
  }

  const hasEnded = poll.endsAt && new Date(poll.endsAt) < new Date();
  const hasVoted = poll.userVotes.length > 0;

  const handleVote = (optionId: string) => {
    if (poll.isMultiChoice) {
      // Toggle option in multi-choice
      const newVotes = hasVoted && poll.userVotes.includes(optionId)
        ? poll.userVotes.filter(id => id !== optionId)
        : [...poll.userVotes, optionId];
      vote(newVotes);
    } else {
      // Single choice
      vote([optionId]);
    }
  };

  return (
    <div className="poll-container">
      <div className="poll-question">{poll.question}</div>

      <div className="poll-options">
        {poll.options.map((option) => {
          const percentage = poll.totalVotes > 0
            ? ((option.voteCount || 0) / poll.totalVotes) * 100
            : 0;

          const isSelected = poll.userVotes.includes(option.id);

          return (
            <div
              key={option.id}
              className={`poll-option ${isSelected ? 'selected' : ''}`}
              onClick={() => !hasEnded && handleVote(option.id)}
            >
              <div className="poll-option-text">{option.text}</div>
              <div className="poll-option-bar" style={{ width: `${percentage}%` }} />
              <div className="poll-option-stats">
                {option.voteCount || 0} votes ({percentage.toFixed(0)}%)
              </div>

              {!poll.isAnonymous && option.voters && (
                <div className="poll-voters">
                  {option.voters.map(voter => (
                    <img
                      key={voter.userId}
                      src={voter.image}
                      alt={voter.name}
                      title={voter.name}
                      className="poll-voter-avatar"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="poll-footer">
        <span>{poll.totalVotes} total votes</span>
        {poll.isAnonymous && <span className="poll-anonymous-badge">Anonymous</span>}
        {hasEnded && <span className="poll-ended-badge">Poll ended</span>}
        {hasVoted && !hasEnded && (
          <button onClick={removeVote} className="poll-remove-vote">
            Remove vote
          </button>
        )}
      </div>
    </div>
  );
}
```

**Task 2.1.3:** Create Poll Dialog (1 day)

**File:** `packages/react/src/components/sdk/CreatePollDialog.tsx`

```typescript
import React, { useState } from 'react';
import { useChatContext } from '../../hooks/useChatContext';

interface CreatePollDialogProps {
  messageId: string;
  onClose: () => void;
}

export function CreatePollDialog({ messageId, onClose }: CreatePollDialogProps) {
  const { client } = useChatContext();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleCreate = async () => {
    if (!question || options.filter(o => o.trim()).length < 2) {
      alert('Please provide a question and at least 2 options');
      return;
    }

    setLoading(true);
    try {
      await client.http.post(`/api/messages/${messageId}/polls`, {
        question,
        options: options.filter(o => o.trim()).map((text, index) => ({
          id: `opt${index + 1}`,
          text,
        })),
        isAnonymous,
        isMultiChoice,
        endsAt: endsAt || undefined,
      });

      onClose();
    } catch (error) {
      alert('Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="poll-dialog">
      <h3>Create Poll</h3>

      <label>
        Question
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What's your question?"
          maxLength={1000}
        />
      </label>

      <div className="poll-options-editor">
        {options.map((option, index) => (
          <div key={index} className="poll-option-input">
            <input
              type="text"
              value={option}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[index] = e.target.value;
                setOptions(newOptions);
              }}
              placeholder={`Option ${index + 1}`}
              maxLength={500}
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(index)}>Remove</button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <button onClick={addOption}>Add option</button>
        )}
      </div>

      <label>
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
        />
        Anonymous voting
      </label>

      <label>
        <input
          type="checkbox"
          checked={isMultiChoice}
          onChange={(e) => setIsMultiChoice(e.target.checked)}
        />
        Allow multiple choices
      </label>

      <label>
        Poll end date (optional)
        <input
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
      </label>

      <div className="poll-dialog-actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create Poll'}
        </button>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ Poll displays question + options
- ✅ Vote percentages calculated correctly
- ✅ Single-choice vs multi-choice works
- ✅ Anonymous vs public voter display works
- ✅ Real-time vote updates via Centrifugo
- ✅ Create poll dialog with 2-10 options
- ✅ Poll expiration works

---

### 2.2 Workspace Switcher UI ⚡ P2

**Status:** ⚠️ API fully implemented ([`workspaces.ts`](../../packages/api/src/routes/workspaces.ts)), needs React component
**Effort:** 1-2 days
**Files to Create:**
- `packages/react/src/components/sdk/WorkspaceSwitcher.tsx` (NEW)
- `packages/react/src/hooks/useWorkspaces.ts` (NEW)

#### Tasks

**Task 2.2.1:** Create Workspace Hook (0.5 days)

**File:** `packages/react/src/hooks/useWorkspaces.ts`

```typescript
import { useState, useEffect } from 'react';
import { useChatContext } from './useChatContext';

export interface Workspace {
  id: string;
  name: string;
  type: string;
  image?: string;
  memberCount: number;
  channelCount: number;
  role: string;
  isDefault: boolean;
  expiresAt?: string;
}

export function useWorkspaces() {
  const { client } = useChatContext();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const response = await client.http.get('/api/workspaces');
      setWorkspaces(response.workspaces);

      // Set default workspace as active
      const defaultWorkspace = response.workspaces.find((w: Workspace) => w.isDefault);
      setActiveWorkspace(defaultWorkspace || response.workspaces[0] || null);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    loading,
    refresh: fetchWorkspaces,
  };
}
```

**Task 2.2.2:** Create Workspace Switcher Component (1 day)

**File:** `packages/react/src/components/sdk/WorkspaceSwitcher.tsx`

```typescript
import React, { useState } from 'react';
import { useWorkspaces } from '../../hooks/useWorkspaces';

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspaces();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="workspace-switcher">
      <button
        className="workspace-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeWorkspace?.image && (
          <img src={activeWorkspace.image} alt={activeWorkspace.name} />
        )}
        <span>{activeWorkspace?.name || 'Select Workspace'}</span>
        <span className="workspace-switcher-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="workspace-switcher-dropdown">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className={`workspace-switcher-item ${
                workspace.id === activeWorkspace?.id ? 'active' : ''
              }`}
              onClick={() => {
                setActiveWorkspace(workspace);
                setIsOpen(false);
              }}
            >
              {workspace.image && (
                <img src={workspace.image} alt={workspace.name} />
              )}
              <div className="workspace-switcher-item-details">
                <div className="workspace-switcher-item-name">{workspace.name}</div>
                <div className="workspace-switcher-item-stats">
                  {workspace.channelCount} channels · {workspace.memberCount} members
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ List all user's workspaces
- ✅ Active workspace highlighted
- ✅ Switching workspace updates channel list
- ✅ Default workspace selected on load

---

## Phase 3: Impact Idol Integration (Days 11-15)

### 3.1 Prisma Schema Integration ⚡ P1

**Status:** ⚠️ Impact Idol uses Prisma, ChatSDK uses raw SQL
**Effort:** 2-3 days
**Strategy:** Dual-write pattern (write to both Prisma and ChatSDK)

#### Tasks

**Task 3.1.1:** Map Impact Idol Prisma Models to ChatSDK Tables (1 day)

| Impact Idol Model | ChatSDK Table | Mapping Strategy |
|-------------------|---------------|------------------|
| `Workspace` | `workspace` | 1:1 mapping via workspace_id |
| `Channel` | `channel` | 1:1 mapping, add workspace_id foreign key |
| `Message` | `message` | 1:1 mapping, keep both Prisma + ChatSDK |
| `User` | `app_user` | 1:1 mapping via app_id + user_id |
| `Poll` | `poll` | 1:1 mapping |
| `Report` | `message_report` | 1:1 mapping |

**Task 3.1.2:** Create Sync Service (1 day)

**File:** `app/services/chatsdk-sync.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { ChatSDKClient } from '@chatsdk/core';

const chatSDK = new ChatSDKClient({
  apiUrl: process.env.CHATSDK_API_URL,
  apiKey: process.env.CHATSDK_API_KEY,
});

/**
 * Sync Impact Idol message to ChatSDK
 */
export async function syncMessageToChatSDK(messageId: string) {
  // Get message from Prisma
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { user: true, channel: true },
  });

  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  // Send to ChatSDK
  await chatSDK.channels.sendMessage(message.channelId, {
    id: message.id,
    text: message.content,
    userId: message.userId,
    createdAt: message.createdAt.toISOString(),
  });
}

/**
 * Sync ChatSDK message to Impact Idol Prisma
 */
export async function syncMessageFromChatSDK(chatSDKMessage: any) {
  await prisma.message.create({
    data: {
      id: chatSDKMessage.id,
      channelId: chatSDKMessage.channelId,
      userId: chatSDKMessage.userId,
      content: chatSDKMessage.text,
      createdAt: chatSDKMessage.createdAt,
    },
  });
}
```

**Task 3.1.3:** Update Server Actions (1 day)

**File:** `app/actions/chat.ts`

```typescript
'use server';

import { syncMessageToChatSDK } from '@/services/chatsdk-sync';

export async function sendMessage(channelId: string, content: string) {
  // 1. Write to Prisma (source of truth)
  const message = await prisma.message.create({
    data: { channelId, userId: auth.userId, content },
  });

  // 2. Async sync to ChatSDK (for real-time, offline, etc.)
  await syncMessageToChatSDK(message.id);

  return message;
}
```

**Acceptance Criteria:**
- ✅ Messages written to both Prisma and ChatSDK
- ✅ Sync is async (doesn't block user)
- ✅ Sync failures logged but don't break UI
- ✅ Idempotent sync (re-running doesn't duplicate)

---

### 3.2 UI Customization for Impact Idol Branding ⚡ P2

**Effort:** 2 days
**Files to Modify:**
- `packages/react/src/styles/themes.ts` (NEW)
- Impact Idol's `tailwind.config.js` (UPDATE)

#### Tasks

**Task 3.2.1:** Create Impact Idol Theme (1 day)

**File:** `packages/react/src/styles/themes.ts`

```typescript
export const impactIdolTheme = {
  colors: {
    primary: '#YOUR_BRAND_COLOR',
    secondary: '#YOUR_SECONDARY_COLOR',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#333333',
    textSecondary: '#666666',
  },
  borderRadius: '8px',
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  fonts: {
    body: 'Inter, sans-serif',
    heading: 'Inter, sans-serif',
  },
};
```

**Task 3.2.2:** Apply Theme to ChatSDK Components (1 day)

```typescript
import { ChatProvider } from '@chatsdk/react';
import { impactIdolTheme } from './themes';

<ChatProvider client={client} theme={impactIdolTheme}>
  <ChannelList />
  <MessageList />
</ChatProvider>
```

**Acceptance Criteria:**
- ✅ ChatSDK components match Impact Idol's design system
- ✅ Colors, fonts, spacing consistent
- ✅ No visual jarring between Impact Idol and ChatSDK UI

---

## Phase 4: Testing & Validation (Days 16-20)

### 4.1 Integration Testing ⚡ P1

**Effort:** 3 days

#### Tasks

**Task 4.1.1:** Write API Integration Tests (1 day)

```bash
npm run test:api
```

**Test coverage:**
- ✅ Workspace CRUD operations
- ✅ Poll creation + voting
- ✅ Message reporting + moderation
- ✅ User blocking
- ✅ Auto-enrollment rules
- ✅ Webhook delivery

**Task 4.1.2:** Write E2E Tests (Playwright) (2 days)

```bash
npm run test:e2e
```

**Test scenarios:**
- ✅ User joins workspace → auto-enrolled in channels
- ✅ User sends message → appears in real-time
- ✅ User creates poll → others can vote
- ✅ User reports message → admin sees in queue
- ✅ User blocks another user → messages filtered
- ✅ Guardian monitors supervised user → sees activity

**Acceptance Criteria:**
- ✅ All API tests pass
- ✅ All E2E tests pass
- ✅ Code coverage > 80%

---

### 4.2 Load Testing ⚡ P2

**Effort:** 2 days

#### Tasks

**Task 4.2.1:** Load Test with k6 (1 day)

**File:** `tests/load/message-sending.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.post('http://localhost:3000/api/channels/CHANNEL_ID/messages', {
    text: 'Load test message',
  }, {
    headers: {
      'Authorization': `Bearer ${__ENV.JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

```bash
k6 run tests/load/message-sending.js
```

**Target Metrics:**
- ✅ 100 concurrent users sending messages
- ✅ p95 latency < 500ms
- ✅ 0% error rate

**Task 4.2.2:** Database Performance Tuning (1 day)

- ✅ Analyze slow queries with `EXPLAIN ANALYZE`
- ✅ Add missing indexes
- ✅ Optimize JOIN queries
- ✅ Configure connection pooling

**Acceptance Criteria:**
- ✅ System handles 1000+ concurrent users
- ✅ Message send latency < 200ms (p95)
- ✅ Database CPU < 70% under load

---

## Phase 5: Documentation & Deployment (Days 21-25)

### 5.1 Documentation ⚡ P2

**Effort:** 2 days

#### Tasks

**Task 5.1.1:** Update API Documentation (1 day)

- ✅ OpenAPI spec for all endpoints
- ✅ Code examples for each endpoint
- ✅ Authentication flow documentation

**Task 5.1.2:** Create Integration Guide (1 day)

**File:** `docs/IMPACT_IDOL_INTEGRATION.md`

```markdown
# Impact Idol Integration Guide

## Setup

1. Install ChatSDK packages:
```bash
npm install @chatsdk/core @chatsdk/react @chatsdk/nextjs
```

2. Configure environment variables:
```bash
CHATSDK_API_URL=https://chat-api.impactidol.com
CHATSDK_API_KEY=your_api_key_here
```

3. Initialize ChatClient:
```typescript
import { ChatClient } from '@chatsdk/core';

const client = new ChatClient({
  apiUrl: process.env.CHATSDK_API_URL,
  apiKey: process.env.CHATSDK_API_KEY,
});
```

## Examples

### Send Message
```typescript
await client.channels.sendMessage('channel-id', {
  text: 'Hello world',
});
```

### Create Poll
```typescript
await client.polls.create('message-id', {
  question: 'What's your favorite color?',
  options: [
    { id: 'red', text: 'Red' },
    { id: 'blue', text: 'Blue' },
  ],
});
```

### Report Message
```typescript
await client.moderation.reportMessage('message-id', {
  reason: 'spam',
  details: 'This message is spam',
});
```
```

**Acceptance Criteria:**
- ✅ All API endpoints documented
- ✅ Integration guide complete
- ✅ Code examples tested

---

### 5.2 Deployment ⚡ P1

**Effort:** 1 day

#### Tasks

**Task 5.2.1:** Production Deployment (0.5 days)

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

**Services to deploy:**
- PostgreSQL (managed: RDS, Cloud SQL, or self-hosted)
- Centrifugo (managed: Centrifugo Cloud or self-hosted)
- Redis (managed: ElastiCache, Upstash, or self-hosted)
- MinIO (managed: S3, Cloudflare R2, or self-hosted)
- Hono API (Node.js on Vercel, Railway, Fly.io, or Kubernetes)

**Task 5.2.2:** Monitoring Setup (0.5 days)

- ✅ Prometheus + Grafana for metrics
- ✅ ELK/Datadog for logs
- ✅ Sentry for error tracking
- ✅ Uptime monitoring (Pingdom, UptimeRobot)

**Acceptance Criteria:**
- ✅ Production environment running
- ✅ Monitoring dashboards set up
- ✅ Alerts configured for critical metrics

---

## Summary Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| **Phase 1: Quick Wins** | 5 days | Day 1 | Day 5 |
| **Phase 2: React Components** | 5 days | Day 6 | Day 10 |
| **Phase 3: Impact Idol Integration** | 5 days | Day 11 | Day 15 |
| **Phase 4: Testing & Validation** | 5 days | Day 16 | Day 20 |
| **Phase 5: Documentation & Deployment** | 3 days | Day 21 | Day 23 |

**Total:** 23 working days (~5 weeks with buffer)

---

## Resource Requirements

### Team
- **1 Backend Engineer** - API wiring, database migrations, services
- **1 Frontend Engineer** - React components, UI integration
- **1 DevOps Engineer** - Deployment, monitoring (part-time in Phase 5)

### Infrastructure
- PostgreSQL database (16+ GB RAM recommended)
- Centrifugo server (4+ GB RAM)
- Redis (2+ GB RAM)
- MinIO/S3 storage (scalable)
- API servers (2+ instances for high availability)

### Budget Estimate
- **Cloud infrastructure:** $200-500/month (AWS/GCP)
- **Monitoring tools:** $50-200/month (Datadog, Sentry)
- **Total:** $250-700/month

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Prisma sync delays** | Medium | Medium | Use async queue (Inngest) for sync, don't block UI |
| **Centrifugo scaling issues** | Low | High | Load test early, configure Redis pub/sub |
| **Image processing performance** | Low | Medium | Use background jobs (Inngest) for processing |
| **Missing UI components** | Low | Low | ChatSDK has 50+ components, minimal custom work |
| **Database migration errors** | Low | High | Test migrations on staging environment first |

---

## Success Criteria

### Technical
- ✅ All 23 work streams from feasibility document implemented
- ✅ API response time < 200ms (p95)
- ✅ Real-time message delivery < 100ms
- ✅ System handles 1000+ concurrent users
- ✅ Code coverage > 80%

### Business
- ✅ Impact Idol can self-host chat (cost savings vs Stream Chat)
- ✅ Feature parity with Stream Chat (polls, moderation, etc.)
- ✅ Guardian monitoring enabled for minors
- ✅ Auto-enrollment rules reduce manual work

### User Experience
- ✅ Seamless UI integration with Impact Idol design
- ✅ Mobile-first responsive design
- ✅ Offline support with sync
- ✅ Progressive image loading (blurhash)

---

## Next Steps

1. **Week 1:** Complete Phase 1 (Quick Wins)
2. **Week 2:** Complete Phase 2 (React Components)
3. **Week 3:** Complete Phase 3 (Impact Idol Integration)
4. **Week 4:** Complete Phase 4 (Testing)
5. **Week 5:** Complete Phase 5 (Deployment)

**Start Date:** [To be determined]
**Target Completion:** [5 weeks from start]
