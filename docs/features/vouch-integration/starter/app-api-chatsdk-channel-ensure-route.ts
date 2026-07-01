import { NextResponse } from 'next/server';

const chatsdkApiUrl = process.env.CHATSDK_API_URL;
const chatsdkApiKey = process.env.CHATSDK_API_KEY;

type VouchChatUser = {
  id: string;
};

type ChannelKind = 'group' | 'squad';

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
  const kind = body.kind === 'squad' ? 'squad' : 'group';
  const externalId = typeof body.externalId === 'string' ? body.externalId.trim() : '';
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.filter((memberId: unknown): memberId is string => (
      typeof memberId === 'string' && memberId.trim().length > 0
    ))
    : [];

  if (!externalId) {
    return NextResponse.json(
      { error: { message: 'externalId is required' } },
      { status: 400 }
    );
  }
  if (memberIds.length === 0) {
    return NextResponse.json(
      { error: { message: 'memberIds is required' } },
      { status: 400 }
    );
  }

  const allowed = await canCurrentUserOpenChannel(currentUser.id, kind, externalId, memberIds);
  if (!allowed) {
    return NextResponse.json(
      { error: { message: 'This channel is not allowed by Vouch policy' } },
      { status: 403 }
    );
  }

  const response = await fetch(
    `${chatsdkApiUrl.replace(/\/+$/, '')}/api/channels/${kind}/ensure`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Do not forward the browser Authorization header to this app-auth endpoint.
        'X-API-Key': chatsdkApiKey,
      },
      body: JSON.stringify({
        externalId,
        name: typeof body.name === 'string' ? body.name : undefined,
        memberIds,
        custom: {
          source: 'vouch',
          kind,
          vouchExternalId: externalId,
          ...(typeof body.custom === 'object' && body.custom !== null ? body.custom : {}),
        },
      }),
    }
  );

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

async function canCurrentUserOpenChannel(
  requesterUserId: string,
  kind: ChannelKind,
  externalId: string,
  memberIds: string[]
): Promise<boolean> {
  /*
   * Replace with Vouch policy:
   * - requester belongs to the group/squad/org relationship
   * - memberIds exactly match the approved Vouch membership set
   * - all accounts are active and eligible
   * - minor and parental-approval rules allow participation
   * - block/privacy checks allow the conversation
   */
  return Boolean(requesterUserId && kind && externalId && memberIds.includes(requesterUserId));
}
