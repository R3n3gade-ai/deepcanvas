"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ── */
export interface Workspace {
    id: string;
    name: string;
    createdAt: string;
}

interface WorkspaceState {
    workspaces: Workspace[];
    activeWorkspaceId: string;
}

/* ── Constants ── */
const STORAGE_KEY = "deep-canvas-workspaces";
const THREAD_MAP_KEY = "deep-canvas-thread-workspace-map";
const MAX_WORKSPACES = 3;

function defaultWorkspace(): Workspace {
    return {
        id: "default",
        name: "General",
        createdAt: new Date().toISOString(),
    };
}

function loadState(): WorkspaceState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as WorkspaceState;
            if (parsed.workspaces?.length > 0) return parsed;
        }
    } catch {
        /* ignore */
    }
    const ws = defaultWorkspace();
    return { workspaces: [ws], activeWorkspaceId: ws.id };
}

function saveState(state: WorkspaceState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* ignore */
    }
}

/* ── Thread ↔ Workspace map ── */
function loadThreadMap(): Record<string, string> {
    try {
        const raw = localStorage.getItem(THREAD_MAP_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /* ignore */
    }
    return {};
}

function saveThreadMap(map: Record<string, string>) {
    try {
        localStorage.setItem(THREAD_MAP_KEY, JSON.stringify(map));
    } catch {
        /* ignore */
    }
}

/* ── Hook ── */
export function useWorkspaces() {
    const [state, setState] = useState<WorkspaceState>(() => loadState());
    const [threadMap, setThreadMap] = useState<Record<string, string>>(() => loadThreadMap());

    /* Persist on change */
    useEffect(() => {
        saveState(state);
    }, [state]);

    useEffect(() => {
        saveThreadMap(threadMap);
    }, [threadMap]);

    const activeWorkspace =
        state.workspaces.find((w) => w.id === state.activeWorkspaceId) ??
        state.workspaces[0]!;

    const createWorkspace = useCallback(
        (name: string): boolean => {
            if (state.workspaces.length >= MAX_WORKSPACES) return false;
            const trimmed = name.trim();
            if (!trimmed) return false;

            const id = Date.now().toString(36);
            const ws: Workspace = {
                id,
                name: trimmed,
                createdAt: new Date().toISOString(),
            };
            setState((prev) => ({
                workspaces: [...prev.workspaces, ws],
                activeWorkspaceId: id,
            }));
            return true;
        },
        [state.workspaces.length],
    );

    const switchWorkspace = useCallback((id: string) => {
        setState((prev) => ({ ...prev, activeWorkspaceId: id }));
    }, []);

    const deleteWorkspace = useCallback(
        (id: string) => {
            if (state.workspaces.length <= 1) return; // can't delete last
            setState((prev) => {
                const filtered = prev.workspaces.filter((w) => w.id !== id);
                return {
                    workspaces: filtered,
                    activeWorkspaceId:
                        prev.activeWorkspaceId === id
                            ? filtered[0]!.id
                            : prev.activeWorkspaceId,
                };
            });
        },
        [state.workspaces.length],
    );

    const tagThread = useCallback(
        (threadId: string) => {
            setThreadMap((prev) => ({
                ...prev,
                [threadId]: state.activeWorkspaceId,
            }));
        },
        [state.activeWorkspaceId],
    );

    const getThreadWorkspaceId = useCallback(
        (threadId: string): string => {
            return threadMap[threadId] ?? "default";
        },
        [threadMap],
    );

    const isThreadInActiveWorkspace = useCallback(
        (threadId: string): boolean => {
            const wsId = threadMap[threadId] ?? "default";
            return wsId === state.activeWorkspaceId;
        },
        [threadMap, state.activeWorkspaceId],
    );

    return {
        workspaces: state.workspaces,
        activeWorkspace,
        activeWorkspaceId: state.activeWorkspaceId,
        canCreateMore: state.workspaces.length < MAX_WORKSPACES,
        createWorkspace,
        switchWorkspace,
        deleteWorkspace,
        tagThread,
        getThreadWorkspaceId,
        isThreadInActiveWorkspace,
    };
}
