import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('Centrifugo config hardening', () => {
  it('does not allow insecure client subscriptions in the mounted config', () => {
    const configPath = path.resolve(__dirname, '../../../docker/centrifugo.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    expect(config.client_insecure).toBe(false);
    expect(config.debug).toBe(false);
    expect(config.user_subscribe_to_personal).toBeUndefined();

    for (const namespace of config.namespaces ?? []) {
      expect(namespace.allow_subscribe_for_client).not.toBe(true);
      expect(namespace.allow_publish_for_client).not.toBe(true);
      expect(namespace.allow_publish_for_subscriber).not.toBe(true);
    }
  });

  it('defines namespaces for every server-published realtime channel family', () => {
    const configPath = path.resolve(__dirname, '../../../docker/centrifugo.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const namespaceNames = new Set((config.namespaces ?? []).map((namespace: any) => namespace.name));

    expect([...namespaceNames]).toEqual(
      expect.arrayContaining(['chat', 'user', 'workspace', 'app'])
    );
  });
});
