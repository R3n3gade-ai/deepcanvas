import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
  workspace,
  workspaceMember,
  workspaceInvite,
  user as userTable,
} from "@/server/db/schema";

async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  return session.user;
}

// GET /api/workspaces/[id]/members — list members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  // Verify user has access
  const members = await db
    .select({
      id: workspaceMember.id,
      userId: workspaceMember.userId,
      role: workspaceMember.role,
      joinedAt: workspaceMember.joinedAt,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(eq(workspaceMember.workspaceId, workspaceId));

  const isMember = members.some((m) => m.userId === user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Also get pending invites
  const invites = await db
    .select()
    .from(workspaceInvite)
    .where(
      and(
        eq(workspaceInvite.workspaceId, workspaceId),
        eq(workspaceInvite.acceptedAt, null as unknown as Date),
      ),
    );

  return NextResponse.json({ members, pendingInvites: invites });
}

// POST /api/workspaces/[id]/members — invite a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  // Verify user is owner or editor
  const [member] = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, user.id),
      ),
    );

  if (!member || member.role === "viewer") {
    return NextResponse.json(
      { error: "Not authorized to invite" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role ?? "editor";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if user is already a member
  const [existingUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email));

  if (existingUser) {
    const [existingMember] = await db
      .select()
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, existingUser.id),
        ),
      );

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 },
      );
    }
  }

  // Create invite token
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invite] = await db
    .insert(workspaceInvite)
    .values({
      id: nanoid(10),
      workspaceId,
      email,
      token,
      role,
      invitedBy: user.id,
      expiresAt,
    })
    .returning();

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

  return NextResponse.json({ invite, inviteLink }, { status: 201 });
}

// DELETE /api/workspaces/[id]/members — remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;
  const body = await request.json();
  const userId = body.userId;

  // Verify user is owner
  const [ws] = await db
    .select()
    .from(workspace)
    .where(
      and(eq(workspace.id, workspaceId), eq(workspace.ownerId, user.id)),
    );

  if (!ws) {
    return NextResponse.json(
      { error: "Only workspace owner can remove members" },
      { status: 403 },
    );
  }

  // Can't remove owner
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Cannot remove workspace owner" },
      { status: 400 },
    );
  }

  await db
    .delete(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    );

  return NextResponse.json({ ok: true });
}
