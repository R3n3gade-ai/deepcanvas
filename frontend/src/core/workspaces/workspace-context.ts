"use client";

import { createContext, useContext } from "react";
import type { Workspace } from "./use-workspaces";

export interface WorkspaceContextValue {
    workspaces: Workspace[];
    activeWorkspace: Workspace;
    activeWorkspaceId: string;
    canCreateMore: boolean;
    createWorkspace: (name: string) => boolean;
    switchWorkspace: (id: string) => void;
    deleteWorkspace: (id: string) => void;
    tagThread: (threadId: string) => void;
    getThreadWorkspaceId: (threadId: string) => string;
    isThreadInActiveWorkspace: (threadId: string) => boolean;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceContext(): WorkspaceContextValue {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) {
        throw new Error("useWorkspaceContext must be used within WorkspaceContext.Provider");
    }
    return ctx;
}
