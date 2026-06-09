import { describe, expect, it } from 'vitest';
import {
  normalizeContentKind,
  normalizeHttpRoute,
  trackUploadAccepted,
  trackUploadOperation,
  getMetrics,
} from '../src/services/metrics';

describe('observability metrics guardrails', () => {
  it('normalizes high-cardinality HTTP paths before metric labeling', () => {
    expect(normalizeHttpRoute('/api/channels/22222222-2222-4222-8222-222222222222/messages/11111111-1111-4111-8111-111111111111')).toBe(
      '/api/channels/:channelId/messages/:messageId'
    );
    expect(normalizeHttpRoute('/api/uploads/apps%2Ftenant%2Fchannels%2Fc%2Ffile.png/content')).toBe('/api/uploads/:key/content');
    expect(normalizeHttpRoute('/api/users/alice/export')).toBe('/api/users/:userId/export');
    expect(normalizeHttpRoute('/api/devices/apns.token:short')).toBe('/api/devices/:token');
    expect(normalizeHttpRoute('/api/users/bob/block')).toBe('/api/users/:userId/block');
    expect(normalizeHttpRoute('/api/workspaces/team-one/channels')).toBe('/api/workspaces/:workspaceId/channels');
    expect(normalizeHttpRoute('/api/workspaces/invites/invite.token:short')).toBe('/api/workspaces/invites/:token');
    expect(normalizeHttpRoute('/api/unregistered/short-secret.route')).toBe('/api/:id/:id');
  });

  it('normalizes upload content types into bounded metric labels', () => {
    expect(normalizeContentKind('image/png')).toBe('image');
    expect(normalizeContentKind('video/mp4')).toBe('video');
    expect(normalizeContentKind('audio/mpeg')).toBe('audio');
    expect(normalizeContentKind('application/pdf')).toBe('other');
  });

  it('exports upload metrics with bounded operation and content labels', async () => {
    trackUploadAccepted('app-obs', 'image/png', 1024);
    trackUploadOperation('app-obs', 'direct', 'failure', 'too_large', 0.01);
    trackUploadOperation('app-obs', 'direct', 'failure', 'exception', 0.01);

    const metrics = await getMetrics();

    expect(metrics).toContain('chatsdk_upload_operations_total');
    expect(metrics).toContain('operation="direct"');
    expect(metrics).toContain('reason="too_large"');
    expect(metrics).toContain('reason="exception"');
    expect(metrics).toContain('content_kind="image"');
    expect(metrics).not.toContain('content_type="image/png"');
  });
});
