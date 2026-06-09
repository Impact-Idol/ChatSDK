import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config/defaults';

const MEDIA_TOKEN_TTL_SECONDS = 5 * 60;

export interface VerifiedMediaToken {
  appId: string;
  userId: string;
  key: string;
}

interface MediaTokenPayload extends VerifiedMediaToken {
  typ: 'media';
  exp: number;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload: string): string {
  return createHmac('sha256', config.jwt.secret).update(payload).digest('base64url');
}

export function issueMediaToken(input: VerifiedMediaToken): string {
  const payload: MediaTokenPayload = {
    typ: 'media',
    appId: input.appId,
    userId: input.userId,
    key: input.key,
    exp: Math.floor(Date.now() / 1000) + MEDIA_TOKEN_TTL_SECONDS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyMediaToken(token: string, expectedKey: string): VerifiedMediaToken | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(signature, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let payload: Partial<MediaTokenPayload>;
  try {
    payload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    return null;
  }

  if (
    payload.typ !== 'media'
    || typeof payload.appId !== 'string'
    || typeof payload.userId !== 'string'
    || typeof payload.key !== 'string'
    || typeof payload.exp !== 'number'
  ) {
    return null;
  }

  if (payload.key !== expectedKey || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    appId: payload.appId,
    userId: payload.userId,
    key: payload.key,
  };
}
