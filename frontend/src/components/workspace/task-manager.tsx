"use client";

import {
    BotIcon,
    CalendarIcon,
    CheckCircle2Icon,
    CircleIcon,
    FileTextIcon,
    PlusIcon,
    StickyNoteIcon,
    Trash2Icon,
    XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

/* ── Types ── */
interface UserTask {
    id: string;
    type: "task" | "note";
    title: string;
    dueDate?: string; // ISO string
    dueTime?: string; // HH:mm
    comment?: string;
    assignedToAgent?: boolean;
    completed: boolean;
    createdAt: string;
}

const STORAGE_KEY = "deep-canvas-tasks";

/* ── Persistence ── */
function loadTasks(): UserTask[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveTasks(tasks: UserTask[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ── Add Task Dialog ── */
function AddTaskForm({
    onSave,
    onCancel,
}: {
    onSave: (task: Omit<UserTask, "id" | "completed" | "createdAt">) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [dueTime, setDueTime] = useState("");
    const [comment, setComment] = useState("");
    const [assignToAgent, setAssignToAgent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave({
            type: "task",
            title: title.trim(),
            dueDate: dueDate || undefined,
            dueTime: dueTime || undefined,
            comment: comment.trim() || undefined,
            assignedToAgent: assignToAgent || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 p-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    New Task
                </span>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <XIcon className="size-3.5" />
                </button>
            </div>
            <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task name"
                className="border-input bg-background w-full rounded-md border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
                <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border-input bg-background flex-1 rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="border-input bg-background w-24 rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment (optional)"
                rows={2}
                className="border-input bg-background w-full resize-none rounded-md border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {/* Hand to Agent toggle */}
            <button
                type="button"
                onClick={() => setAssignToAgent((v) => !v)}
                className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                    assignToAgent
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:bg-muted",
                )}
            >
                <BotIcon className="size-3.5" />
                <span className="flex-1 text-left font-medium">
                    {assignToAgent ? "Agent will handle this" : "Hand to Agent"}
                </span>
                <div
                    className={cn(
                        "h-4 w-7 rounded-full transition-colors",
                        assignToAgent ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                >
                    <div
                        className={cn(
                            "size-3 translate-y-0.5 rounded-full bg-white shadow transition-transform",
                            assignToAgent ? "translate-x-3.5" : "translate-x-0.5",
                        )}
                    />
                </div>
            </button>
            <button
                type="submit"
                disabled={!title.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
                Save Task
            </button>
        </form>
    );
}

/* ── Add Note Dialog ── */
function AddNoteForm({
    onSave,
    onCancel,
}: {
    onSave: (task: Omit<UserTask, "id" | "completed" | "createdAt">) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave({ type: "note", title: title.trim() });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 p-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    Quick Note
                </span>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <XIcon className="size-3.5" />
                </button>
            </div>
            <textarea
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                className="border-input bg-background w-full resize-none rounded-md border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
                type="submit"
                disabled={!title.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
                Save Note
            </button>
        </form>
    );
}

/* ── Task Item ── */
function TaskItem({
    task,
    onToggle,
    onDelete,
}: {
    task: UserTask;
    onToggle: () => void;
    onDelete: () => void;
}) {
    const isOverdue = useMemo(() => {
        if (!task.dueDate || task.completed) return false;
        const now = new Date();
        const due = new Date(
            task.dueDate + (task.dueTime ? `T${task.dueTime}` : "T23:59"),
        );
        return due < now;
    }, [task.dueDate, task.dueTime, task.completed]);

    const dueDateLabel = useMemo(() => {
        if (!task.dueDate) return null;
        const d = new Date(task.dueDate + "T00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let label: string;
        if (d.getTime() === today.getTime()) label = "Today";
        else if (d.getTime() === tomorrow.getTime()) label = "Tomorrow";
        else
            label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        if (task.dueTime) {
            const [h, m] = task.dueTime.split(":");
            const hour = parseInt(h!);
            const ampm = hour >= 12 ? "PM" : "AM";
            const h12 = hour % 12 || 12;
            label += ` ${h12}:${m} ${ampm}`;
        }
        return label;
    }, [task.dueDate, task.dueTime]);

    return (
        <div
            className={cn(
                "group flex items-start gap-2 rounded-md border px-3 py-2 transition-colors",
                task.completed && "opacity-50",
                isOverdue && !task.completed && "border-red-500/30 bg-red-500/5",
            )}
        >
            <button
                onClick={onToggle}
                className="mt-0.5 shrink-0"
                title={task.completed ? "Mark incomplete" : "Mark complete"}
            >
                {task.completed ? (
                    <CheckCircle2Icon className="size-4 text-green-500" />
                ) : (
                    <CircleIcon className="text-muted-foreground size-4 hover:text-green-500" />
                )}
            </button>
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1">
                    <p
                        className={cn(
                            "text-xs font-medium leading-snug break-words",
                            task.completed && "line-through",
                        )}
                    >
                        {task.type === "note" && (
                            <StickyNoteIcon className="mr-1 inline size-3 opacity-50" />
                        )}
                        {task.title}
                    </p>
                    <button
                        onClick={onDelete}
                        className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Delete"
                    >
                        <Trash2Icon className="size-3" />
                    </button>
                </div>
                {task.comment && (
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                        {task.comment}
                    </p>
                )}
                {dueDateLabel && (
                    <div
                        className={cn(
                            "mt-1 inline-flex items-center gap-1 text-[10px] font-medium",
                            isOverdue && !task.completed
                                ? "text-red-500"
                                : "text-muted-foreground",
                        )}
                    >
                        <CalendarIcon className="size-2.5" />
                        {dueDateLabel}
                    </div>
                )}
                {task.assignedToAgent && (
                    <div className="text-primary mt-1 inline-flex items-center gap-1 text-[10px] font-medium ml-2">
                        <BotIcon className="size-2.5" />
                        Agent
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Main Component ── */
export function TaskManager() {
    const [tasks, setTasks] = useState<UserTask[]>([]);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);

    // Load on mount
    useEffect(() => {
        setTasks(loadTasks());
    }, []);

    // Persist
    const persist = useCallback((updated: UserTask[]) => {
        setTasks(updated);
        saveTasks(updated);
    }, []);

    const addItem = useCallback(
        (item: Omit<UserTask, "id" | "completed" | "createdAt">) => {
            const newTask: UserTask = {
                ...item,
                id: crypto.randomUUID(),
                completed: false,
                createdAt: new Date().toISOString(),
            };
            const updated = [...loadTasks(), newTask];
            persist(updated);
            setShowAddTask(false);
            setShowAddNote(false);
        },
        [persist],
    );

    const toggleComplete = useCallback(
        (id: string) => {
            const updated = tasks.map((t) =>
                t.id === id ? { ...t, completed: !t.completed } : t,
            );
            persist(updated);
        },
        [tasks, persist],
    );

    const deleteTask = useCallback(
        (id: string) => {
            const updated = tasks.filter((t) => t.id !== id);
            persist(updated);
        },
        [tasks, persist],
    );

    // Sort: incomplete first, then by due date (soonest first), then notes, then completed
    const sortedTasks = useMemo(() => {
        const incomplete = tasks.filter((t) => !t.completed);
        const completed = tasks.filter((t) => t.completed);

        incomplete.sort((a, b) => {
            // Tasks with due dates first
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            if (a.dueDate && b.dueDate) {
                const da = a.dueDate + (a.dueTime || "23:59");
                const db = b.dueDate + (b.dueTime || "23:59");
                return da.localeCompare(db);
            }
            // Notes after tasks without dates
            if (a.type === "note" && b.type !== "note") return 1;
            if (a.type !== "note" && b.type === "note") return -1;
            return 0;
        });

        completed.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        return [...incomplete, ...completed];
    }, [tasks]);

    const incompleteCount = tasks.filter((t) => !t.completed).length;

    return (
        <div className="flex flex-col gap-2 px-2 pt-1">
            {/* Header + Actions */}
            <div className="flex items-center justify-between px-1">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                    {incompleteCount > 0 ? `${incompleteCount} open` : "No tasks"}
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={() => {
                            setShowAddNote(false);
                            setShowAddTask((v) => !v);
                        }}
                        title="New Task"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition-colors"
                    >
                        <PlusIcon className="size-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            setShowAddTask(false);
                            setShowAddNote((v) => !v);
                        }}
                        title="Quick Note"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition-colors"
                    >
                        <FileTextIcon className="size-3.5" />
                    </button>
                </div>
            </div>

            {/* Inline Forms */}
            {showAddTask && (
                <div className="rounded-lg border shadow-sm">
                    <AddTaskForm
                        onSave={addItem}
                        onCancel={() => setShowAddTask(false)}
                    />
                </div>
            )}
            {showAddNote && (
                <div className="rounded-lg border shadow-sm">
                    <AddNoteForm
                        onSave={addItem}
                        onCancel={() => setShowAddNote(false)}
                    />
                </div>
            )}

            {/* Task List */}
            <div className="flex flex-col gap-1.5">
                {sortedTasks.map((task) => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={() => toggleComplete(task.id)}
                        onDelete={() => deleteTask(task.id)}
                    />
                ))}
            </div>

            {/* Empty State */}
            {tasks.length === 0 && !showAddTask && !showAddNote && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <CalendarIcon className="text-muted-foreground/30 size-8" />
                    <p className="text-muted-foreground text-xs">No tasks yet</p>
                    <p className="text-muted-foreground/70 text-[10px]">
                        Click + to add a task or 📝 for a quick note
                    </p>
                </div>
            )}
        </div>
    );
}
