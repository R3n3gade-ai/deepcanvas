import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { workspace, workspaceMember } from "@/server/db/schema";

async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  return session.user;
}

// GET /api/workspaces — list user's workspaces
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get workspaces where user is owner or member
  const ownedWorkspaces = await db
    .select()
    .from(workspace)
    .where(eq(workspace.ownerId, user.id));

  const memberWorkspaces = await db
    .select({ workspace: workspace })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, user.id));

  // Merge and deduplicate
  const allWorkspaces = [
    ...ownedWorkspaces.map((w) => ({ ...w, role: "owner" as const })),
    ...memberWorkspaces
      .filter((m) => !ownedWorkspaces.some((o) => o.id === m.workspace.id))
      .map((m) => ({ ...m.workspace, role: "editor" as const })),
  ];

  return NextResponse.json(allWorkspaces);
}

// POST /api/workspaces — create a workspace
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const id = nanoid(10);

  const [newWorkspace] = await db
    .insert(workspace)
    .values({
      id,
      name,
      ownerId: user.id,
    })
    .returning();

  // Also add owner as a member
  await db.insert(workspaceMember).values({
    id: nanoid(10),
    workspaceId: id,
    userId: user.id,
    role: "owner",
  });

  return NextResponse.json(newWorkspace, { status: 201 });
}
