"use client";

import { FolderPlusIcon, MessageSquarePlus, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { useWorkspaceContext } from "@/core/workspaces/workspace-context";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ className }: { className?: string }) {
  const { t } = useI18n();
  const { state } = useSidebar();
  const pathname = usePathname();
  const { canCreateMore, createWorkspace } = useWorkspaceContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (name) {
      createWorkspace(name);
      setNewName("");
      setIsCreating(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group/workspace-header flex h-12 flex-col justify-center",
          className,
        )}
      >
        {state === "collapsed" ? (
          <div className="group-has-data-[collapsible=icon]/sidebar-wrapper:-translate-y flex w-full cursor-pointer items-center justify-center">
            <div className="text-primary block pt-1 font-serif group-hover/workspace-header:hidden">
              DC
            </div>
            <SidebarTrigger className="hidden pl-2 group-hover/workspace-header:block" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
              <Link href="/" className="text-primary ml-2 font-serif">
                DEEP CANVAS
              </Link>
            ) : (
              <div className="text-primary ml-2 cursor-default font-serif">
                DEEP CANVAS
              </div>
            )}
            <SidebarTrigger />
          </div>
        )}
      </div>
      <SidebarMenu>
        {/* New Chat */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/workspace/chats/new"}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/chats/new">
              <MessageSquarePlus size={16} />
              <span>{t.sidebar.newChat}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* New Workspace */}
        {state !== "collapsed" && canCreateMore && !isCreating && (
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setIsCreating(true)}>
              <FolderPlusIcon size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">New workspace</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>

      {/* Inline workspace name input */}
      {isCreating && state !== "collapsed" && (
        <div className="flex items-center gap-1 px-2 pb-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewName("");
              }
            }}
            placeholder="Workspace name..."
            className="bg-muted text-foreground placeholder:text-muted-foreground h-7 flex-1 rounded-md border px-2 text-xs outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              setIsCreating(false);
              setNewName("");
            }}
            className="text-muted-foreground hover:text-foreground rounded p-0.5"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

