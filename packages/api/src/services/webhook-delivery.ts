/**
 * Webhook Delivery Service
 * Work Stream 21 - TIER 4
 *
 * Handles sending webhooks to subscribers with:
 * - Retry logic with exponential backoff
 * - Failure tracking
 * - Auto-disable after consecutive failures
 */

import { db } from './database';
import { generateSignature } from '../routes/webhooks';

export interface WebhookPayload {
  event: string;
  created_at: string;
  app_id: string;
  data: any;
}

interface Webhook {
  id: string;
  app_id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  failure_count: number;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_CONSECUTIVE_FAILURES = 10;

/**
 * Send webhook event to all subscribed webhooks
 */
export async function deliverWebhookEvent(
  appId: string,
  eventType: string,
  data: any
): Promise<void> {
  // Get all enabled webhooks subscribed to this event
  const result = await db.query(
    `SELECT *
     FROM webhook
     WHERE app_id = $1
       AND enabled = true
       AND events @> $2::jsonb`,
    [appId, JSON.stringify([eventType])]
  );

  const webhooks = result.rows as Webhook[];

  // Deliver to each webhook (fire and forget)
  for (const webhook of webhooks) {
    // Don't await - process in background
    deliverToWebhook(webhook, eventType, data).catch((error) => {
      console.error(`[WebhookDelivery] Failed to deliver to ${webhook.url}:`, error);
    });
  }
}

/**
 * Deliver event to a single webhook with retry logic
 */
async function deliverToWebhook(
  webhook: Webhook,
  eventType: string,
  data: any
): Promise<void> {
  const payload: WebhookPayload = {
    event: eventType,
    created_at: new Date().toISOString(),
    app_id: webhook.app_id,
    data,
  };

  let lastError: string | null = null;
  let statusCode: number | null = null;
  let retryCount = 0;

  // Retry with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const signature = generateSignature(payload, webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ChatSDK-Signature': signature,
          'X-ChatSDK-Event': eventType,
          'X-ChatSDK-Delivery-Id': crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      statusCode = response.status;

      if (response.ok) {
        // Success - log delivery
        await logDelivery(
          webhook.id,
          eventType,
          true,
          statusCode,
          null,
          retryCount
        );

        // Reset failure count on success
        await db.query(
          'UPDATE webhook SET failure_count = 0 WHERE id = $1',
          [webhook.id]
        );

        return;
      }

      // Non-2xx response - log and retry
      lastError = await response.text().catch(() => `HTTP ${response.status}`);

      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        break;
      }
    } catch (error: any) {
      lastError = error.message;
    }

    // Retry with exponential backoff
    if (attempt < MAX_RETRIES) {
      retryCount++;
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // All retries failed - log failure
  await logDelivery(
    webhook.id,
    eventType,
    false,
    statusCode,
    lastError,
    retryCount
  );

  // Increment failure count
  const failureResult = await db.query(
    `UPDATE webhook
     SET failure_count = failure_count + 1,
         last_failure_at = NOW()
     WHERE id = $1
     RETURNING failure_count`,
    [webhook.id]
  );

  const failureCount = failureResult.rows[0]?.failure_count || 0;

  // Auto-disable after consecutive failures
  if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
    await db.query(
      `UPDATE webhook
       SET enabled = false
       WHERE id = $1`,
      [webhook.id]
    );

    console.warn(
      `[WebhookDelivery] Disabled webhook ${webhook.id} after ${failureCount} consecutive failures`
    );
  }
}

/**
 * Log webhook delivery attempt
 */
async function logDelivery(
  webhookId: string,
  event: string,
  success: boolean,
  statusCode: number | null,
  errorMessage: string | null,
  retryCount: number
): Promise<void> {
  await db.query(
    `INSERT INTO webhook_delivery
     (webhook_id, event, success, status_code, error_message, retry_count)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [webhookId, event, success, statusCode, errorMessage, retryCount]
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Manually retry a failed webhook delivery
 */
export async function retryWebhookDelivery(
  deliveryId: string
): Promise<{ success: boolean; error?: string }> {
  // Get delivery record
  const deliveryResult = await db.query(
    `SELECT d.*, w.*
     FROM webhook_delivery d
     JOIN webhook w ON d.webhook_id = w.id
     WHERE d.id = $1`,
    [deliveryId]
  );

  if (deliveryResult.rows.length === 0) {
    return { success: false, error: 'Delivery record not found' };
  }

  const record = deliveryResult.rows[0];

  // Retry delivery
  try {
    await deliverToWebhook(
      {
        id: record.webhook_id,
        app_id: record.app_id,
        url: record.url,
        events: record.events,
        secret: record.secret,
        enabled: record.enabled,
        failure_count: record.failure_count,
      },
      record.event,
      {} // Original data not stored, send empty
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
