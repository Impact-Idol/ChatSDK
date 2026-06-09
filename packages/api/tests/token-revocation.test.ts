import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  tokensValidAfter: new Date(0),
  sessions: new Map<string, { revoked_at: string | null; expires_at: string }>(),
  revokedTokens: new Set<string>(),
}));

const mockQuery = vi.hoisted(() => vi.fn(async (sql: string, params?: any[]) => {
  if (sql.includes('INSERT INTO auth_session')) {
    state.sessions.set(params![0], {
      revoked_at: null,
      expires_at: params![3].toISOString(),
    });
    return { rows: [], rowCount: 1 };
  }

  if (sql.includes('UPDATE auth_session') && sql.includes('last_used_at')) {
    return { rows: [], rowCount: 1 };
  }

  if (sql.includes('UPDATE auth_session') && sql.includes('revoked_at')) {
    for (const [sessionId, session] of state.sessions) {
      state.sessions.set(sessionId, {
        ...session,
        revoked_at: new Date().toISOString(),
      });
    }
    return { rows: [], rowCount: state.sessions.size };
  }

  if (sql.includes('tokens_valid_after')) {
    return { rows: [{ tokens_valid_after: state.tokensValidAfter.toISOString() }] };
  }

  if (sql.includes('SELECT revoked_at, expires_at')) {
    const session = state.sessions.get(params![1]);
    return { rows: session ? [session] : [] };
  }

  if (sql.includes('SELECT 1') && sql.includes('FROM revoked_token')) {
    return { rows: state.revokedTokens.has(params![1]) ? [{ '?column?': 1 }] : [] };
  }

  if (sql.includes('INSERT INTO revoked_token')) {
    if (state.revokedTokens.has(params![1])) {
      return { rows: [], rowCount: 0 };
    }
    state.revokedTokens.add(params![1]);
    return { rows: [{ token_id: params![1] }], rowCount: 1 };
  }

  if (sql.includes('UPDATE app_user') && sql.includes('tokens_valid_after')) {
    state.tokensValidAfter = new Date(Date.now() + 5000);
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}));

vi.mock('../src/services/database', () => ({
  db: {
    query: mockQuery,
    transaction: async (fn: any) => fn({ query: mockQuery }),
  },
}));

import {
  issueTokenBundle,
  refreshTokenBundle,
  revokeUserTokens,
  TokenValidationError,
  verifyAccessToken,
} from '../src/services/tokens';

const APP_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = 'm2-revoked-user';

describe('token revocation', () => {
  beforeEach(() => {
    state.tokensValidAfter = new Date(0);
    state.sessions.clear();
    state.revokedTokens.clear();
    mockQuery.mockClear();
  });

  it('invalidates already-minted access tokens when user tokens are revoked', async () => {
    const bundle = await issueTokenBundle({ appId: APP_ID, userId: USER_ID });

    await expect(verifyAccessToken(bundle.token)).resolves.toMatchObject({
      appId: APP_ID,
      userId: USER_ID,
    });

    await revokeUserTokens({ appId: APP_ID, userId: USER_ID, reason: 'test' });

    await expect(verifyAccessToken(bundle.token)).rejects.toMatchObject({
      code: 'TOKEN_REVOKED',
    } satisfies Partial<TokenValidationError>);
  });

  it('rejects refresh-token replay after rotation revokes the old jti', async () => {
    const bundle = await issueTokenBundle({ appId: APP_ID, userId: USER_ID });

    await expect(refreshTokenBundle(bundle.refreshToken)).resolves.toMatchObject({
      token: expect.any(String),
      refreshToken: expect.any(String),
    });

    await expect(refreshTokenBundle(bundle.refreshToken)).rejects.toMatchObject({
      code: 'TOKEN_REVOKED',
    } satisfies Partial<TokenValidationError>);
  });
});
