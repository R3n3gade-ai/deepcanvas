"use client";

import {
  BotIcon,
  FolderKanbanIcon,
  MessageSquareIcon,
  PlusIcon,
} from "lucide-react";
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
  const { workspaces, activeWorkspaceId, switchWorkspace } = useWorkspaceContext();
  if (workspaces.length <= 1) return null;

  return (
    <div className="flex gap-1 px-3 pb-1 pt-1">
      {workspaces.map((ws) => (
        <button
          key={ws.id}
          onClick={() => switchWorkspace(ws.id)}
          className={cn(
            "truncate rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
            ws.id === activeWorkspaceId
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {ws.name}
        </button>
      ))}
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
              {isSidebarOpen && <WorkspacePills />}
              <WorkspaceNavChatList />
              {isSidebarOpen && <RecentChatList />}
            </>
          )}
          {activeTab === "tasks" && isSidebarOpen && <TasksPlaceholder />}
          {activeTab === "agents" && isSidebarOpen && (
            <AgentListSidebar />
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
