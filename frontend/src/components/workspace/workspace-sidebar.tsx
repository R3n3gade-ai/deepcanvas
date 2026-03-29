"use client";

import {
  BotIcon,
  CheckIcon,
  FolderKanbanIcon,
  LinkIcon,
  MessageSquareIcon,
  PlusIcon,
  Share2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useCallback } from "react";
import Link from "next/link";
import { useState } from "react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { useAgents } from "@/core/agents";
import { useWorkspaceContext } from "@/core/workspaces/workspace-context";

import { RecentChatList } from "./recent-chat-list";
import { TaskManager } from "./task-manager";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceNavChatList } from "./workspace-nav-chat-list";
import { WorkspaceNavMenu } from "./workspace-nav-menu";
import { AgentActivityPanel } from "./agent-activity-panel";

type SidebarTab = "chats" | "tasks" | "agents";

function SidebarTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}

function TasksPlaceholder() {
  return <TaskManager />;
}

/* ── Workspace pills row ── */
function WorkspacePills() {
  const { workspaces, activeWorkspaceId, switchWorkspace, deleteWorkspace } = useWorkspaceContext();
  if (workspaces.length <= 1) return null;

  return (
    <div className="flex gap-1 px-3 pb-1 pt-1">
      {workspaces.map((ws) => (
        <div
          key={ws.id}
          className="group/pill relative flex items-center"
        >
          <button
            onClick={() => switchWorkspace(ws.id)}
            className={cn(
              "truncate rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors pr-5",
              ws.id === activeWorkspaceId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {ws.name}
          </button>
          {workspaces.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteWorkspace(ws.id);
              }}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 opacity-0 transition-opacity group-hover/pill:opacity-100",
                ws.id === activeWorkspaceId
                  ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20"
                  : "text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10",
              )}
              title={`Delete ${ws.name}`}
            >
              <XIcon className="size-2.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Invite Link Button ── */
function InviteButton() {
  const { activeWorkspace } = useWorkspaceContext();
  const [showPopover, setShowPopover] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const generateInviteLink = useCallback(async () => {
    try {
      const resp = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `invite-link-${Date.now()}@placeholder.com`, role: "member" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.inviteToken) {
          const url = `${window.location.origin}/invite/${data.inviteToken}`;
          await navigator.clipboard.writeText(url);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          return;
        }
      }
    } catch { /* ignore */ }
    // Fallback: just copy a placeholder
    const url = `${window.location.origin}/invite/${activeWorkspace.id}`;
    await navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [activeWorkspace.id]);

  const handleEmailInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    setStatusMsg("");
    try {
      const resp = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: "member" }),
      });
      if (resp.ok) {
        setStatusMsg("Invite sent!");
        setInviteEmail("");
      } else {
        const data = await resp.json();
        setStatusMsg(data.error || "Failed to send");
      }
    } catch {
      setStatusMsg("Network error");
    } finally {
      setIsSending(false);
    }
  }, [inviteEmail, activeWorkspace.id]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(v => !v)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1 transition-colors"
        title="Invite to workspace"
      >
        <Share2Icon className="size-3.5" />
      </button>
      {showPopover && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-popover p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <UsersIcon className="size-3.5 text-primary" />
              <span className="text-xs font-semibold">Invite to Workspace</span>
            </div>
            <button onClick={() => setShowPopover(false)} className="text-muted-foreground hover:text-foreground">
              <XIcon className="size-3" />
            </button>
          </div>

          {/* Email invite */}
          <div className="space-y-1.5 mb-3">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleEmailInvite(); }}
              placeholder="Email address..."
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button
              onClick={handleEmailInvite}
              disabled={!inviteEmail.trim() || isSending}
              className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send Invite"}
            </button>
            {statusMsg && (
              <p className={cn("text-[10px]", statusMsg.includes("sent") ? "text-green-500" : "text-destructive")}>
                {statusMsg}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center"><span className="bg-popover px-2 text-[10px] text-muted-foreground">or</span></div>
          </div>

          {/* Copy link */}
          <button
            onClick={generateInviteLink}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              isCopied
                ? "border-green-500/40 bg-green-500/10 text-green-500"
                : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {isCopied ? (
              <><CheckIcon className="size-3" /> Link Copied!</>
            ) : (
              <><LinkIcon className="size-3" /> Copy Invite Link</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function AgentListSidebar() {
  const { agents, isLoading } = useAgents();

  return (
    <div className="flex flex-col gap-2 px-2 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
          {agents.length > 0 ? `${agents.length} Agent${agents.length > 1 ? "s" : ""}` : "No agents"}
        </span>
        <Link
          href="/workspace/agents/new"
          title="New Agent"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition-colors"
        >
          <PlusIcon className="size-3.5" />
        </Link>
      </div>

      {/* Agent list */}
      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center py-8 text-xs">Loading...</div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <BotIcon className="text-muted-foreground/30 size-8" />
          <p className="text-muted-foreground text-xs">No agents yet</p>
          <Link
            href="/workspace/agents/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <PlusIcon className="size-3" />
            Create Agent
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {agents.map((agent) => (
            <Link
              key={agent.name}
              href={`/workspace/agents/${encodeURIComponent(agent.name)}/chats/new`}
              className="group flex items-start gap-2 rounded-md border px-3 py-2 transition-colors hover:bg-muted"
            >
              <BotIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{agent.name}</p>
                {agent.description && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-snug">
                    {agent.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { open: isSidebarOpen } = useSidebar();
  const [activeTab, setActiveTab] = useState<SidebarTab>("chats");

  return (
    <>
      <Sidebar variant="sidebar" collapsible="icon" {...props}>
        <SidebarHeader className="py-0">
          <WorkspaceHeader />
        </SidebarHeader>
        <SidebarContent>
          {isSidebarOpen && (
            <div className="flex gap-1 px-2 pt-1 pb-1">
              <SidebarTabButton
                active={activeTab === "chats"}
                icon={MessageSquareIcon}
                label="Chats"
                onClick={() => setActiveTab("chats")}
              />
              <SidebarTabButton
                active={activeTab === "tasks"}
                icon={FolderKanbanIcon}
                label="Tasks"
                onClick={() => setActiveTab("tasks")}
              />
              <SidebarTabButton
                active={activeTab === "agents"}
                icon={BotIcon}
                label="Agents"
                onClick={() => setActiveTab("agents")}
              />
            </div>
          )}
          {activeTab === "chats" && (
            <>
              {isSidebarOpen && (
                <div className="flex items-center gap-1 px-2">
                  <div className="flex-1"><WorkspacePills /></div>
                  <InviteButton />
                </div>
              )}
              <WorkspaceNavChatList />
              {isSidebarOpen && <RecentChatList />}
            </>
          )}
          {activeTab === "tasks" && isSidebarOpen && <TasksPlaceholder />}
          {activeTab === "agents" && isSidebarOpen && (
            <AgentActivityPanel />
          )}
        </SidebarContent>
        <SidebarFooter>
          <WorkspaceNavMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}
