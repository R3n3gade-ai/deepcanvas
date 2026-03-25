"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getBackendBaseURL } from "@/core/config";

/* ── Types ── */

export interface KanbanColumn {
    id: string;
    title: string;
    accent: string;
    order: number;
}

export interface KanbanCard {
    id: string;
    title: string;
    description?: string;
    columnId: string;
    createdAt: string;
    color?: string;
    linkedSubtaskId?: string;
}

export interface SubTask {
    id: string;
    title: string;
    sectionId: string;
    dueDate?: string;
    addedToBoard: boolean;
    kanbanCardId?: string;
}

export interface TaskSection {
    id: string;
    name: string;
    color: string;
    order: number;
    collapsed?: boolean;
    subtasks: SubTask[];
}

export interface KanbanState {
    columns: KanbanColumn[];
    cards: KanbanCard[];
    sections: TaskSection[];
}

/* ── API helpers ── */
const BASE = () => getBackendBaseURL();

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${BASE()}/api/kanban${path}`;
    const opts: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    if (!resp.ok) throw new Error(`Kanban API ${method} ${path}: ${resp.status}`);
    return resp.json() as Promise<T>;
}

/* ── Hook ── */
export function useKanban(workspaceId: string) {
    const [state, setState] = useState<KanbanState>({
        columns: [],
        cards: [],
        sections: [],
    });
    const pollRef = useRef<ReturnType<typeof setInterval>>();

    // Fetch board from API
    const fetchBoard = useCallback(async () => {
        try {
            const data = await api<KanbanState>("GET", `/${workspaceId}`);
            setState(data);
        } catch (e) {
            console.error("Failed to fetch Kanban board:", e);
        }
    }, [workspaceId]);

    // Initial fetch + poll every 3s for agent sync
    useEffect(() => {
        fetchBoard();
        pollRef.current = setInterval(fetchBoard, 3000);
        return () => clearInterval(pollRef.current);
    }, [fetchBoard]);

    /* ── Column operations ── */
    const addColumn = useCallback(
        async (title: string) => {
            await api("POST", `/${workspaceId}/columns`, { title });
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const renameColumn = useCallback(
        async (columnId: string, title: string) => {
            await api("PUT", `/${workspaceId}/columns/${columnId}`, { title });
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const deleteColumn = useCallback(
        async (columnId: string) => {
            await api("DELETE", `/${workspaceId}/columns/${columnId}`);
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    /* ── Card operations ── */
    const addCard = useCallback(
        async (title: string, columnId: string, description?: string, color?: string) => {
            const card = await api<KanbanCard>("POST", `/${workspaceId}/cards`, {
                title,
                column_id: columnId,
                description,
                color,
            });
            fetchBoard();
            return card.id;
        },
        [workspaceId, fetchBoard],
    );

    const moveCard = useCallback(
        async (cardId: string, toColumnId: string) => {
            await api("PUT", `/${workspaceId}/cards/${cardId}/move`, { column_id: toColumnId });
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const deleteCard = useCallback(
        async (cardId: string) => {
            await api("DELETE", `/${workspaceId}/cards/${cardId}`);
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const reorderCards = useCallback(
        (cardId: string, overCardId: string) => {
            // Local reorder for drag-and-drop responsiveness
            setState((prev) => {
                const cards = [...prev.cards];
                const dragIdx = cards.findIndex((c) => c.id === cardId);
                const overIdx = cards.findIndex((c) => c.id === overCardId);
                if (dragIdx === -1 || overIdx === -1) return prev;
                const [moved] = cards.splice(dragIdx, 1);
                if (!moved) return prev;
                const overCard = cards[overIdx];
                if (overCard) moved.columnId = overCard.columnId;
                cards.splice(overIdx, 0, moved);
                return { ...prev, cards };
            });
        },
        [],
    );

    const getColumnCards = useCallback(
        (columnId: string): KanbanCard[] => {
            return state.cards.filter((c) => c.columnId === columnId);
        },
        [state.cards],
    );

    /* ── Section operations ── */
    const addSection = useCallback(
        async (name: string) => {
            await api("POST", `/${workspaceId}/sections`, { name });
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const renameSection = useCallback(
        async (sectionId: string, name: string) => {
            await api("PUT", `/${workspaceId}/sections/${sectionId}`, { name });
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const deleteSection = useCallback(
        async (sectionId: string) => {
            await api("DELETE", `/${workspaceId}/sections/${sectionId}`);
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const toggleSectionCollapse = useCallback((sectionId: string) => {
        // Local-only toggle (UI state, not persisted)
        setState((prev) => ({
            ...prev,
            sections: prev.sections.map((s) =>
                s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s,
            ),
        }));
    }, []);

    /* ── Subtask operations ── */
    const addSubtask = useCallback(
        async (sectionId: string, title: string, dueDate?: string) => {
            await api("POST", `/${workspaceId}/sections/${sectionId}/subtasks`, {
                title,
                due_date: dueDate,
            });
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const deleteSubtask = useCallback(
        async (sectionId: string, subtaskId: string) => {
            await api("DELETE", `/${workspaceId}/sections/${sectionId}/subtasks/${subtaskId}`);
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    const pushSubtaskToBoard = useCallback(
        async (sectionId: string, subtaskId: string) => {
            await api("POST", `/${workspaceId}/sections/${sectionId}/subtasks/${subtaskId}/push`);
            fetchBoard();
        },
        [workspaceId, fetchBoard],
    );

    return {
        columns: state.columns,
        cards: state.cards,
        sections: state.sections,
        addColumn,
        renameColumn,
        deleteColumn,
        addCard,
        moveCard,
        deleteCard,
        reorderCards,
        getColumnCards,
        addSection,
        renameSection,
        deleteSection,
        toggleSectionCollapse,
        addSubtask,
        deleteSubtask,
        pushSubtaskToBoard,
    };
}
