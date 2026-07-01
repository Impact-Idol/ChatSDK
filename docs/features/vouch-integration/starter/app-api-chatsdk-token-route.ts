import { NextResponse } from 'next/server';

const tokenUrl = process.env.CHATSDK_TOKEN_URL;

type VouchChatUser = {
  id: string;
  displayName: string;
  email?: string | null;
  avatar?: string | null;
};

export async function POST() {
  if (!tokenUrl) {
    return NextResponse.json(
      { error: { message: 'CHATSDK_TOKEN_URL is not configured' } },
      { status: 500 }
    );
  }

  const user = await getEligibleVouchChatUser();

  if (!user) {
    return NextResponse.json(
      { error: { message: 'Not eligible for messaging' } },
      { status: 403 }
    );
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      avatar: user.avatar,
      metadata: { source: 'vouch' },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json({
    token: data.token,
    refreshToken: data.refreshToken,
    wsToken: data.wsToken ?? data._internal?.wsToken ?? data.token,
    expiresIn: data.expiresIn,
    user: data.user,
  });
}

async function getEligibleVouchChatUser(): Promise<VouchChatUser | null> {
  /*
   * Replace this adapter with Vouch's real session and policy checks.
   *
   * Required checks for the first slice:
   * - authenticated session
   * - accountStatus is ACTIVE
   * - isMinor is false
   * - parental approval is not pending
   * - user has a stable Vouch user ID
   *
   * Do not read userId, displayName, role, or eligibility from the browser body.
   */
  return null;
}
