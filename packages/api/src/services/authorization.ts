import { db } from './database';

export interface ChannelAccess {
  exists: boolean;
  isMember: boolean;
  isPublic: boolean;
  isWorkspaceMember: boolean;
  role?: string;
  type?: string;
  workspaceId?: string;
}

export async function getChannelAccess(
  appId: string,
  userId: string,
  channelId: string
): Promise<ChannelAccess> {
  const result = await db.query(
    `SELECT c.id, c.type, c.workspace_id, cm.role, wm.user_id as workspace_member_user_id
     FROM channel c
     LEFT JOIN channel_member cm
       ON cm.app_id = c.app_id
      AND cm.channel_id = c.id
      AND cm.user_id = $2
     LEFT JOIN workspace_member wm
       ON wm.app_id = c.app_id
      AND wm.workspace_id = c.workspace_id
      AND wm.user_id = $2
     WHERE c.app_id = $1 AND c.id = $3`,
    [appId, userId, channelId]
  );

  if (result.rows.length === 0) {
    return { exists: false, isMember: false, isPublic: false, isWorkspaceMember: false };
  }

  const row = result.rows[0];
  const type = row.type as string;
  const isWorkspaceMember = Boolean(row.workspace_member_user_id);
  const isPublicType = type === 'public' || type === 'team';
  const isPublic = isPublicType && (!row.workspace_id || isWorkspaceMember);

  return {
    exists: true,
    isMember: Boolean(row.role),
    isPublic,
    isWorkspaceMember,
    role: row.role ?? undefined,
    type,
    workspaceId: row.workspace_id ?? undefined,
  };
}

export async function isChannelMember(
  appId: string,
  userId: string,
  channelId: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM channel_member
     WHERE app_id = $1 AND user_id = $2 AND channel_id = $3`,
    [appId, userId, channelId]
  );

  return result.rows.length > 0;
}

export async function isAppAdmin(appId: string, userId: string): Promise<boolean> {
  const result = await db.query(
    `SELECT custom_data->>'is_admin' as is_admin
     FROM app_user
     WHERE app_id = $1 AND id = $2`,
    [appId, userId]
  );

  return result.rows[0]?.is_admin === 'true';
}

export async function getWorkspaceRole(
  appId: string,
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const result = await db.query(
    `SELECT role FROM workspace_member
     WHERE app_id = $1 AND workspace_id = $2 AND user_id = $3`,
    [appId, workspaceId, userId]
  );

  return result.rows[0]?.role ?? null;
}

export async function isWorkspaceMember(
  appId: string,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return (await getWorkspaceRole(appId, userId, workspaceId)) !== null;
}

export function isPrivilegedWorkspaceRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
