import { NextResponse } from 'next/server';

const chatsdkApiUrl = process.env.CHATSDK_API_URL;
const chatsdkApiKey = process.env.CHATSDK_API_KEY;

type VouchChatUser = {
  id: string;
};

export async function POST(request: Request) {
  if (!chatsdkApiUrl || !chatsdkApiKey) {
    return NextResponse.json(
      { error: { message: 'CHATSDK_API_URL or CHATSDK_API_KEY is not configured' } },
      { status: 500 }
    );
  }

  const currentUser = await getEligibleVouchChatUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { message: 'Not eligible for messaging' } },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const peerUserId = typeof body.peerUserId === 'string' ? body.peerUserId.trim() : '';
  if (!peerUserId) {
    return NextResponse.json(
      { error: { message: 'peerUserId is required' } },
      { status: 400 }
    );
  }

  const allowed = await canCurrentUserMessagePeer(currentUser.id, peerUserId);
  if (!allowed) {
    return NextResponse.json(
      { error: { message: 'This conversation is not allowed by Vouch policy' } },
      { status: 403 }
    );
  }

  const response = await fetch(`${chatsdkApiUrl.replace(/\/+$/, '')}/api/channels/dm/ensure`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Do not forward the browser Authorization header to this app-auth endpoint.
      'X-API-Key': chatsdkApiKey,
    },
    body: JSON.stringify({
      requesterUserId: currentUser.id,
      peerUserId,
      custom: { source: 'vouch' },
    }),
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

async function getEligibleVouchChatUser(): Promise<VouchChatUser | null> {
  /*
   * Replace with Vouch session and account checks:
   * - authenticated session
   * - active account
   * - adult account for the first launch slice
   * - stable Vouch user ID
   */
  return null;
}

async function canCurrentUserMessagePeer(
  requesterUserId: string,
  peerUserId: string
): Promise<boolean> {
  /*
   * Replace with Vouch policy:
   * - peer exists and is eligible
   * - neither user has blocked the other
   * - account and privacy settings allow the DM
   * - minor and parental-approval rules allow the DM
   */
  return requesterUserId !== peerUserId && peerUserId.length > 0;
}
