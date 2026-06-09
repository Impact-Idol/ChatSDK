import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiUrl = process.env.CHATSDK_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500';
  const apiKey = process.env.CHATSDK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: { message: 'CHATSDK_API_KEY is not configured on the server' } },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const brokerSecret = process.env.CHATSDK_TOKEN_BROKER_SECRET;
  const providedSecret = request.headers.get('x-chatsdk-token-broker-secret');
  const canMintRequestedUser = Boolean(brokerSecret && providedSecret === brokerSecret);
  const demoUserId = process.env.CHATSDK_DEMO_USER_ID || 'demo-user-1';
  const requestedUserId = typeof body.userId === 'string' ? body.userId : demoUserId;
  const userId = canMintRequestedUser ? requestedUserId : demoUserId;
  const displayName = typeof body.displayName === 'string' && canMintRequestedUser
    ? body.displayName
    : userId;

  if (!canMintRequestedUser && requestedUserId !== demoUserId) {
    return NextResponse.json(
      { error: { message: 'This demo token route cannot mint arbitrary users. Replace it with your app session auth.' } },
      { status: 403 }
    );
  }

  const response = await fetch(`${apiUrl}/api/auth/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ userId, displayName }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json({
    token: data.token,
    wsToken: data.wsToken ?? data._internal?.wsToken ?? data.token,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    user: data.user,
  });
}
