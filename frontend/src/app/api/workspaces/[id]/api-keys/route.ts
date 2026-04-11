import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";

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

async function verifyWorkspaceAccess(userId: string, workspaceId: string) {
  const ownedWorkspace = await db.query.workspace.findFirst({
    where: and(eq(workspace.id, workspaceId), eq(workspace.ownerId, userId)),
  });
  if (ownedWorkspace) return true;

  const member = await db.query.workspaceMember.findFirst({
    where: and(
      eq(workspaceMember.workspaceId, workspaceId),
      eq(workspaceMember.userId, userId),
      eq(workspaceMember.role, "owner") // only owners can edit API keys for safety? Or editors too? Let's say any member for now to preserve old behavior, or 'owner'/'editor'
    ),
  });
  return !!member;
}

// Known API key definitions grouped by category (duplicated from Python for masking)
const API_KEY_DEFINITIONS = [
    { key: "GEMINI_API_KEY", label: "Gemini API Key", group: "LLM Providers", required: true, description: "Google Gemini API key for the main agent" },
    { key: "OPENAI_API_KEY", label: "OpenAI API Key", group: "LLM Providers", required: false, description: "OpenAI API key (GPT models)" },
    { key: "DEEPSEEK_API_KEY", label: "DeepSeek API Key", group: "LLM Providers", required: false, description: "DeepSeek API key" },
    { key: "NOVITA_API_KEY", label: "Novita API Key", group: "LLM Providers", required: false, description: "Novita AI API key (OpenAI-compatible)" },
    { key: "MINIMAX_API_KEY", label: "MiniMax API Key", group: "LLM Providers", required: false, description: "MiniMax API key (OpenAI-compatible)" },
    { key: "TAVILY_API_KEY", label: "Tavily API Key", group: "Search & Tools", required: false, description: "Tavily search API key for web research" },
    { key: "JINA_API_KEY", label: "Jina API Key", group: "Search & Tools", required: false, description: "Jina API key for web content reading" },
    { key: "FIRECRAWL_API_KEY", label: "Firecrawl API Key", group: "Search & Tools", required: false, description: "Firecrawl API key for web scraping" },
    { key: "VOLCENGINE_API_KEY", label: "Volcengine API Key", group: "Skills", required: false, description: "Volcengine API key for image/video generation" },
    { key: "VOLCENGINE_TTS_APPID", label: "Volcengine TTS App ID", group: "Skills", required: false, description: "Volcengine text-to-speech app ID" },
    { key: "VOLCENGINE_TTS_ACCESS_TOKEN", label: "Volcengine TTS Token", group: "Skills", required: false, description: "Volcengine text-to-speech access token" },
    { key: "TELEGRAM_BOT_TOKEN", label: "Telegram Bot Token", group: "Channels", required: false, description: "Telegram bot token" },
    { key: "SLACK_BOT_TOKEN", label: "Slack Bot Token", group: "Channels", required: false, description: "Slack bot OAuth token" },
    { key: "SLACK_APP_TOKEN", label: "Slack App Token", group: "Channels", required: false, description: "Slack app-level token" },
    { key: "FEISHU_APP_ID", label: "Feishu App ID", group: "Channels", required: false, description: "Feishu application ID" },
    { key: "FEISHU_APP_SECRET", label: "Feishu App Secret", group: "Channels", required: false, description: "Feishu app secret" },
];

function maskValue(value: string | null | undefined): string {
  if (!value || value.startsWith("your-")) return "";
  if (value.length <= 8) return "••••••••";
  return value.substring(0, 4) + "••••" + value.substring(value.length - 4);
}

// GET /api/workspaces/[id]/api-keys
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await verifyWorkspaceAccess(user.id, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.id, id),
    columns: { apiKeys: true },
  });

  const savedKeys = (ws?.apiKeys as Record<string, string>) || {};

  const keys = API_KEY_DEFINITIONS.map((defn) => {
    const raw = savedKeys[defn.key] || "";
    const isSet = !!raw && !raw.startsWith("your-");
    return {
      key: defn.key,
      label: defn.label,
      group: defn.group,
      required: defn.required,
      description: defn.description,
      is_set: isSet,
      masked_value: isSet ? maskValue(raw) : "",
    };
  });

  return NextResponse.json({ keys });
}

// PUT /api/workspaces/[id]/api-keys
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await verifyWorkspaceAccess(user.id, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const newKeys = body.keys || {};

  // Fetch existing
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.id, id),
    columns: { apiKeys: true },
  });
  
  const currentKeys = (ws?.apiKeys as Record<string, string>) || {};
  const mergedKeys = { ...currentKeys, ...newKeys };

  // Remove empty keys
  for (const [k, v] of Object.entries(mergedKeys)) {
    if (!v || typeof v !== "string" || v.trim() === "") {
      delete mergedKeys[k];
    }
  }

  await db
    .update(workspace)
    .set({ apiKeys: mergedKeys })
    .where(eq(workspace.id, id));

  return NextResponse.json({ success: true, updated: Object.keys(newKeys) });
}
