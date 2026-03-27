import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
  workspaceInvite,
  workspaceMember,
  workspace,
  user as userTable,
} from "@/server/db/schema";

async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  return session.user;
}

// GET /api/invite/[token] — get invite details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const [invite] = await db
    .select({
      id: workspaceInvite.id,
      email: workspaceInvite.email,
      role: workspaceInvite.role,
      expiresAt: workspaceInvite.expiresAt,
      acceptedAt: workspaceInvite.acceptedAt,
      workspaceName: workspace.name,
      workspaceId: workspace.id,
    })
    .from(workspaceInvite)
    .innerJoin(workspace, eq(workspaceInvite.workspaceId, workspace.id))
    .where(eq(workspaceInvite.token, token));

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json(
      { error: "Invite already accepted" },
      { status: 410 },
    );
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  return NextResponse.json(invite);
}

// POST /api/invite/[token] — accept invite
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const [invite] = await db
    .select()
    .from(workspaceInvite)
    .where(eq(workspaceInvite.token, token));

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json(
      { error: "Invite already accepted" },
      { status: 410 },
    );
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, invite.workspaceId),
        eq(workspaceMember.userId, user.id),
      ),
    );

  if (existing) {
    // Mark invite as accepted
    await db
      .update(workspaceInvite)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvite.id, invite.id));

    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  // Add user to workspace
  await db.insert(workspaceMember).values({
    id: nanoid(10),
    workspaceId: invite.workspaceId,
    userId: user.id,
    role: invite.role,
  });

  // Mark invite as accepted
  await db
    .update(workspaceInvite)
    .set({ acceptedAt: new Date() })
    .where(eq(workspaceInvite.id, invite.id));

  return NextResponse.json({ ok: true, workspaceId: invite.workspaceId });
}
