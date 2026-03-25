"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Toaster } from "sonner";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CommandPalette } from "@/components/workspace/command-palette";
import { RightPanel } from "@/components/workspace/right-panel";
import { RightPanelProvider } from "@/components/workspace/right-panel-context";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { getLocalSettings, useLocalSettings } from "@/core/settings";
import { useWorkspaces } from "@/core/workspaces/use-workspaces";
import { WorkspaceContext } from "@/core/workspaces/workspace-context";

const queryClient = new QueryClient();

export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, setSettings] = useLocalSettings();
  const [open, setOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const workspaceStore = useWorkspaces();
  useLayoutEffect(() => {
    setOpen(!getLocalSettings().layout.sidebar_collapsed);
  }, []);
  useEffect(() => {
    setOpen(!settings.layout.sidebar_collapsed);
  }, [settings.layout.sidebar_collapsed]);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      setSettings("layout", { sidebar_collapsed: !open });
    },
    [setSettings],
  );
  const rightPanelContext = useMemo(
    () => ({
      isOpen: isRightPanelOpen,
      toggle: () => setIsRightPanelOpen((v) => !v),
      close: () => setIsRightPanelOpen(false),
    }),
    [isRightPanelOpen],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceContext.Provider value={workspaceStore}>
        <RightPanelProvider value={rightPanelContext}>
          <SidebarProvider
            className="h-screen"
            open={open}
            onOpenChange={handleOpenChange}
          >
            <WorkspaceSidebar />
            <SidebarInset className="min-w-0">{children}</SidebarInset>
            <RightPanel
              isOpen={isRightPanelOpen}
              onClose={() => setIsRightPanelOpen(!isRightPanelOpen)}
            />
          </SidebarProvider>
        </RightPanelProvider>
      </WorkspaceContext.Provider>
      <CommandPalette />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}


