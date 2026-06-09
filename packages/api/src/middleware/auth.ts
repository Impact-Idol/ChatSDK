/**
 * Auth Middleware
 * JWT user authentication and server API key authentication
 */

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { QueryResultRow } from 'pg';
import { db } from '../services/database';
import {
  TokenValidationError,
  verifyAccessToken,
} from '../services/tokens';
import { verifyMediaToken } from '../services/media-tokens';

interface AppAuthRow extends QueryResultRow {
  id: string;
  name: string;
  settings: unknown;
}

interface UserAuthRow extends QueryResultRow {
  id: string;
  name: string;
  image_url: string | null;
}

export interface AuthContext {
  authType: 'user' | 'app';
  appId: string;
  mediaKey?: string;
  scopes?: string[];
  app?: {
    id: string;
    name: string;
    settings: unknown;
  };
  userId?: string;
  user?: {
    id: string;
    name: string;
    image?: string;
  };
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
    requestId: string;
  }
}

/**
 * Auth middleware - validates a user Bearer token or a server API key.
 *
 * User Bearer tokens are preferred when both headers are present. That keeps
 * user routes from being promoted into app-level operations by an API key
 * header accidentally or maliciously added to a browser request.
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  if (isServerBrokerPath(c.req.path)) {
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const auth = await authenticateBearer(authHeader.slice(7));
    c.set('auth', auth);
    await next();
    return;
  }

  const mediaAuth = authenticateMediaToken(
    c.req.path,
    c.req.query('mediaToken'),
    c.req.query('key')
  );
  if (mediaAuth) {
    c.set('auth', mediaAuth);
    await next();
    return;
  }

  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    const auth = await authenticateApiKey(apiKey);
    c.set('auth', auth);
    await next();
    return;
  }

  throw new HTTPException(401, { message: 'Missing authorization' });
});

function isServerBrokerPath(path: string): boolean {
  return path === '/api/server' || path.startsWith('/api/server/');
}

function authenticateMediaToken(
  path: string,
  token: string | undefined,
  queryKey: string | undefined
): AuthContext | null {
  if (!token) {
    return null;
  }

  const pathMatch = path.match(/^\/api\/uploads\/(.+)\/content$/);
  const encodedKey = path === '/api/uploads/content' ? queryKey : pathMatch?.[1];
  if (!encodedKey) {
    return null;
  }

  let key: string;
  try {
    key = decodeURIComponent(encodedKey);
  } catch {
    throw new HTTPException(401, { message: 'Invalid media token' });
  }

  const verified = verifyMediaToken(token, key);
  if (!verified) {
    throw new HTTPException(401, { message: 'Invalid media token' });
  }

  return {
    authType: 'user',
    appId: verified.appId,
    userId: verified.userId,
    mediaKey: verified.key,
  };
}

/**
 * Require user authentication (not just API key)
 */
export const requireUser = createMiddleware(async (c, next) => {
  const auth = c.get('auth');

  if (auth?.authType !== 'user' || !auth.userId) {
    throw new HTTPException(401, {
      message: 'User authentication required. Include Authorization: Bearer <token> header.'
    });
  }

  await next();
});

export const requireApp = createMiddleware(async (c, next) => {
  const auth = c.get('auth');

  if (auth?.authType !== 'app') {
    throw new HTTPException(401, {
      message: 'App authentication required. Include X-API-Key header.',
    });
  }

  await next();
});

export function requireScope(scope: string) {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    if (auth?.authType === 'user' && auth.scopes && !auth.scopes.includes(scope)) {
      throw new HTTPException(403, { message: `Token scope required: ${scope}` });
    }
    await next();
  });
}

type BrokerScopedRoute = {
  method: string;
  pattern: RegExp;
  scope: string;
};

const BROKER_SCOPED_ROUTES: BrokerScopedRoute[] = [
  { method: 'GET', pattern: /^\/api\/channels(?:\/[^/]+)?$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/channels$/, scope: 'chat:write' },
  { method: 'PATCH', pattern: /^\/api\/channels\/[^/]+$/, scope: 'chat:write' },
  { method: 'DELETE', pattern: /^\/api\/channels\/[^/]+$/, scope: 'chat:write' },
  { method: 'GET', pattern: /^\/api\/channels\/[^/]+\/members$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/channels\/[^/]+\/members$/, scope: 'chat:write' },
  { method: 'PATCH', pattern: /^\/api\/channels\/[^/]+\/members\/[^/]+$/, scope: 'chat:write' },
  { method: 'DELETE', pattern: /^\/api\/channels\/[^/]+\/members\/[^/]+$/, scope: 'chat:write' },
  { method: 'GET', pattern: /^\/api\/channels\/[^/]+\/messages(?:\/[^/]+)?$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/channels\/[^/]+\/messages$/, scope: 'chat:write' },
  { method: 'PATCH', pattern: /^\/api\/channels\/[^/]+\/messages\/[^/]+$/, scope: 'chat:write' },
  { method: 'DELETE', pattern: /^\/api\/channels\/[^/]+\/messages\/[^/]+(?:\/purge)?$/, scope: 'chat:write' },
  { method: 'GET', pattern: /^\/api\/channels\/[^/]+\/messages\/[^/]+\/thread(?:\/participants)?$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/channels\/[^/]+\/messages\/[^/]+\/thread$/, scope: 'chat:write' },
  { method: 'POST', pattern: /^\/api\/messages\/[^/]+\/reactions$/, scope: 'reaction:write' },
  { method: 'DELETE', pattern: /^\/api\/messages\/[^/]+\/reactions\/[^/]+$/, scope: 'reaction:write' },
  { method: 'POST', pattern: /^\/api\/messages\/[^/]+\/polls$/, scope: 'chat:write' },
  { method: 'GET', pattern: /^\/api\/polls\/[^/]+\/results$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/polls\/[^/]+\/vote$/, scope: 'chat:write' },
  { method: 'DELETE', pattern: /^\/api\/polls\/[^/]+\/vote$/, scope: 'chat:write' },
  { method: 'POST', pattern: /^\/api\/realtime\/subscription-token$/, scope: 'chat:read' },
  { method: 'GET', pattern: /^\/api\/presence(?:\/.*)?$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/presence\/(?:heartbeat|online|offline)$/, scope: 'typing:write' },
  { method: 'POST', pattern: /^\/api\/channels\/[^/]+\/typing$/, scope: 'typing:write' },
  { method: 'GET', pattern: /^\/api\/channels\/[^/]+\/presence$/, scope: 'chat:read' },
  { method: 'GET', pattern: /^\/api\/channels\/[^/]+\/search$/, scope: 'search:read' },
  { method: 'GET', pattern: /^\/api\/search(?:\/.*)?$/, scope: 'search:read' },
  { method: 'GET', pattern: /^\/api\/channels\/[^/]+\/uploads$/, scope: 'chat:read' },
  { method: 'GET', pattern: /^\/api\/uploads(?:\/.*)?$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/uploads(?:\/.*)?$/, scope: 'upload:write' },
  { method: 'DELETE', pattern: /^\/api\/uploads(?:\/.*)?$/, scope: 'upload:write' },
  { method: 'GET', pattern: /^\/api\/channels\/[^/]+\/receipts(?:\/.*)?$/, scope: 'chat:read' },
  { method: 'POST', pattern: /^\/api\/channels\/[^/]+\/read$/, scope: 'chat:write' },
  { method: 'GET', pattern: /^\/api\/mentions(?:\/.*)?$/, scope: 'chat:read' },
];

export const brokerScopedRouteGuard = createMiddleware(async (c, next) => {
  const auth = c.get('auth');
  if (auth?.authType !== 'user' || !auth.scopes) {
    await next();
    return;
  }

  const method = c.req.method.toUpperCase();
  const path = c.req.path;
  const route = BROKER_SCOPED_ROUTES.find(
    (candidate) => candidate.method === method && candidate.pattern.test(path)
  );

  if (!route) {
    throw new HTTPException(403, { message: 'Broker-scoped token is not allowed for this route' });
  }

  if (!auth.scopes.includes(route.scope)) {
    throw new HTTPException(403, { message: `Token scope required: ${route.scope}` });
  }

  await next();
});

async function authenticateBearer(token: string): Promise<AuthContext> {
  let verifiedToken: Awaited<ReturnType<typeof verifyAccessToken>>;

  try {
    verifiedToken = await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof TokenValidationError && error.code === 'TOKEN_EXPIRED') {
      throw new HTTPException(401, { message: 'Token expired' });
    }
    throw new HTTPException(401, {
      message: error instanceof TokenValidationError ? error.message : 'Invalid token',
    });
  }

  const payload = verifiedToken.payload;
  if (payload.type === 'refresh') {
    throw new HTTPException(401, { message: 'Invalid token type' });
  }

  const appId = verifiedToken.appId;
  const userId = verifiedToken.userId;

  const appResult = await db.query<AppAuthRow>(
    'SELECT id, name, settings FROM app WHERE id = $1',
    [appId]
  );

  if (appResult.rows.length === 0) {
    throw new HTTPException(401, { message: 'Token app not found' });
  }

  const withTenantContext = db.withTenantContext?.bind(db) ?? ((_tenant, fn) => fn());
  const userResult = await withTenantContext(
    { appId, userId },
    () => db.query<UserAuthRow>(
      'SELECT id, name, image_url FROM app_user WHERE app_id = $1 AND id = $2',
      [appId, userId]
    )
  );

  if (userResult.rows.length === 0) {
    throw new HTTPException(401, { message: 'Token user not found' });
  }

  const app = appResult.rows[0];
  const user = userResult.rows[0];

  return {
    authType: 'user',
    appId,
    app,
    userId,
    scopes: getTokenScopes(payload),
    user: {
      id: user.id,
      name: user.name,
      image: user.image_url ?? undefined,
    },
  };
}

function getTokenScopes(payload: Record<string, unknown>): string[] | undefined {
  const rawScopes = payload.scopes ?? payload.scp;
  if (Array.isArray(rawScopes) && rawScopes.every((scope) => typeof scope === 'string')) {
    return rawScopes;
  }
  if (typeof rawScopes === 'string') {
    return rawScopes.split(' ').filter(Boolean);
  }
  return undefined;
}

async function authenticateApiKey(apiKey: string): Promise<AuthContext> {
  const appResult = await db.query<AppAuthRow>(
    'SELECT id, name, settings FROM app WHERE api_key = $1',
    [apiKey]
  );

  if (appResult.rows.length === 0) {
    throw new HTTPException(401, { message: 'Invalid API key' });
  }

  const app = appResult.rows[0];

  return {
    authType: 'app',
    appId: app.id,
    app,
  };
}
