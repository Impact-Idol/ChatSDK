import { describe, expect, it } from 'vitest';

const smoke = await import('../../../scripts/smoke/project-smoke.mjs');

describe('project smoke CLI helpers', () => {
  it('builds config from CLI/env and redacts API keys', async () => {
    const config = await smoke.buildSmokeConfig(
      {
        slug: 'seed-project-a-dev',
        apiUrl: 'http://api.example/',
        tokenUrl: 'http://broker.example/token',
        wsUrl: 'ws://ws.example/connection/websocket',
        apiKey: 'chatsdk_1234567890abcdef1234567890abcdef12345678',
        primaryUserId: 'seed-a-user-1',
        origin: 'https://a.example',
        skipWs: true,
      },
      {}
    );

    expect(config.apiUrl).toBe('http://api.example');
    expect(config.seed.peerUserId).toBe('seed-a-user-1-peer');
    expect(config.skipWs).toBe(true);

    const redacted = smoke.redactedConfig(config);
    expect(redacted.apiKey).toBe('chatsdk_...345678');
    expect(JSON.stringify(redacted)).not.toContain('1234567890abcdef');
  });

  it('supports dry-run config without network-only values', async () => {
    const config = await smoke.buildSmokeConfig(
      {
        slug: 'seed-project-b-dev',
        dryRun: true,
      },
      {
        CHATSDK_API_URL: 'http://localhost:5500',
        CHATSDK_TOKEN_URL: 'http://localhost:5511/api/chatsdk-token',
        CHATSDK_WS_URL: 'ws://localhost:8001/connection/websocket',
      }
    );

    expect(config.slug).toBe('seed-project-b-dev');
    expect(config.seed.primaryUserId).toMatch(/^smoke-primary-/);
    expect(smoke.redactedConfig(config).apiKey).toBeNull();
  });

  it('parses boolean and value flags', () => {
    expect(smoke.parseArgs([
      '--slug',
      'vouch-dev',
      '--dry-run',
      '--json=false',
      '--skip-ws=true',
    ])).toEqual({
      options: {
        slug: 'vouch-dev',
        dryRun: true,
        json: false,
        skipWs: true,
      },
    });
  });
});
