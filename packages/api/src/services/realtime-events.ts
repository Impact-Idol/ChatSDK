import type { PoolClient } from 'pg';
import {
  enqueueRealtimeEvent,
  triggerRealtimeOutboxDrain,
} from './realtime-outbox';

export interface DomainRealtimeEventInput {
  appId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  channels: string[];
  payload: unknown;
  idempotencyKey?: string;
}

export function chatChannel(appId: string, channelId: string): string {
  return `chat:${appId}:${channelId}`;
}

export function userChannel(appId: string, userId: string): string {
  return `user:${appId}:${userId}`;
}

export function workspaceChannel(appId: string, workspaceId: string): string {
  return `workspace:${appId}:${workspaceId}`;
}

export function appChannel(appId: string): string {
  return `app:${appId}`;
}

export async function enqueueDomainRealtimeEvent(
  client: PoolClient,
  input: DomainRealtimeEventInput
): Promise<void> {
  await enqueueRealtimeEvent(client, {
    appId: input.appId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    eventType: input.eventType,
    channels: input.channels,
    payload: {
      type: input.eventType,
      payload: input.payload,
    },
    idempotencyKey: input.idempotencyKey,
  });
}

export function triggerRealtimeOutboxDrainSafely(): void {
  try {
    triggerRealtimeOutboxDrain();
  } catch (error) {
    console.warn('Failed to trigger realtime outbox drain:', error);
  }
}
