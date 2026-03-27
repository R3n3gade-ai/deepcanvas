"use client";

import {
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    XIcon,
    CalendarDaysIcon,
    LayoutGridIcon,
    ListIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWorkspaceContext } from "@/core/workspaces/workspace-context";
import { getBackendBaseURL } from "@/core/config";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface CalendarEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    color: string;
    source: "kanban" | "manual";
    sectionName?: string;
}

type ViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/* ── Helpers ── */
function fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function startOfWeek(d: Date): Date {
    const r = new Date(d);
    r.setDate(r.getDate() - r.getDay());
    return r;
}

function isSameDay(a: string, b: string): boolean {
    return a === b;
}

/* ── Calendar Page ── */
export default function CalendarPage() {
    const { activeWorkspace } = useWorkspaceContext();
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDate, setNewDate] = useState(fmt(new Date()));

    useEffect(() => {
        document.title = `Calendar - ${activeWorkspace.name} - DEEP CANVAS`;
    }, [activeWorkspace.name]);

    // Fetch Kanban subtasks with due dates AND manual events from backend
    const fetchEvents = useCallback(async () => {
        try {
            const base = getBackendBaseURL();

            // Fetch kanban events
            const kanbanEvents: CalendarEvent[] = [];
            try {
                const resp = await fetch(`${base}/api/kanban/${activeWorkspace.id}`);
                if (resp.ok) {
                    const board = await resp.json();
                    for (const section of board.sections || []) {
                        for (const st of section.subtasks || []) {
                            if (st.dueDate) {
                                kanbanEvents.push({
                                    id: `kanban-${st.id}`,
                                    title: st.title,
                                    date: st.dueDate,
                                    color: section.color || "#3B82F6",
                                    source: "kanban",
                                    sectionName: section.name,
                                });
                            }
                        }
                    }
                }
            } catch { /* ignore kanban errors */ }

            // Fetch manual events from backend
            const manualEvents: CalendarEvent[] = [];
            try {
                const calResp = await fetch(`${base}/api/calendar/${activeWorkspace.id}`);
                if (calResp.ok) {
                    const events = await calResp.json();
                    for (const evt of events) {
                        manualEvents.push({
                            id: evt.id,
                            title: evt.title,
                            date: evt.date,
                            color: evt.color || "#8B5CF6",
                            source: "manual",
                        });
                    }
                }
            } catch { /* ignore calendar errors */ }

            setEvents([...manualEvents, ...kanbanEvents]);
        } catch {
            /* ignore */
        }
    }, [activeWorkspace.id]);

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, [fetchEvents]);

    // Navigation
    const navigate = (dir: number) => {
        setCurrentDate((prev) => {
            const d = new Date(prev);
            if (viewMode === "month") d.setMonth(d.getMonth() + dir);
            else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
            else d.setDate(d.getDate() + dir);
            return d;
        });
    };

    const goToday = () => setCurrentDate(new Date());

    // Add manual event via backend API
    const handleAddEvent = async () => {
        if (!newTitle.trim()) return;
        try {
            const base = getBackendBaseURL();
            const resp = await fetch(`${base}/api/calendar/${activeWorkspace.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim(), date: newDate }),
            });
            if (resp.ok) {
                setNewTitle("");
                setIsAdding(false);
                fetchEvents();
            }
        } catch { /* ignore */ }
    };

    const deleteEvent = async (id: string) => {
        // Only delete manual events via backend
        if (id.startsWith("kanban-")) return;
        try {
            const base = getBackendBaseURL();
            await fetch(`${base}/api/calendar/${activeWorkspace.id}/${id}`, {
                method: "DELETE",
            });
            fetchEvents();
        } catch {
            // Fallback: remove from local state
            setEvents((prev) => prev.filter((e) => e.id !== id));
        }
    };

    // Get events for a specific date
    const getEventsForDate = useCallback(
        (date: string) => events.filter((e) => isSameDay(e.date, date)),
        [events],
    );

    // Header label
    const headerLabel = useMemo(() => {
        if (viewMode === "month")
            return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        if (viewMode === "week") {
            const ws = startOfWeek(currentDate);
            const we = addDays(ws, 6);
            return `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${MONTHS[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
        }
        return `${WEEKDAYS[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }, [viewMode, currentDate]);

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
                <button
                    onClick={goToday}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                    Today
                </button>

                <button
                    onClick={() => navigate(-1)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <ChevronLeftIcon className="size-4" />
                </button>
                <button
                    onClick={() => navigate(1)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <ChevronRightIcon className="size-4" />
                </button>

                <h2 className="min-w-0 flex-1 text-sm font-semibold">{headerLabel}</h2>

                {/* View switcher */}
                <div className="flex rounded-lg border bg-muted/30 p-0.5">
                    <button
                        onClick={() => setViewMode("month")}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            viewMode === "month"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <LayoutGridIcon className="size-3" />
                        Month
                    </button>
                    <button
                        onClick={() => setViewMode("week")}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            viewMode === "week"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <CalendarDaysIcon className="size-3" />
                        Week
                    </button>
                    <button
                        onClick={() => setViewMode("day")}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            viewMode === "day"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <ListIcon className="size-3" />
                        Day
                    </button>
                </div>

                {/* Add event */}
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                    <PlusIcon className="size-3" />
                    Event
                </button>
            </div>

            {/* Add event form */}
            {isAdding && (
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-2">
                    <input
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddEvent();
                            if (e.key === "Escape") setIsAdding(false);
                        }}
                        placeholder="Event title..."
                        className="min-w-0 flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                        onClick={handleAddEvent}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Add
                    </button>
                    <button
                        onClick={() => setIsAdding(false)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    >
                        <XIcon className="size-4" />
                    </button>
                </div>
            )}

            {/* Calendar body */}
            <div className="flex-1 overflow-auto">
                {viewMode === "month" && (
                    <MonthView
                        currentDate={currentDate}
                        getEventsForDate={getEventsForDate}
                        onDateClick={(d) => {
                            setCurrentDate(d);
                            setViewMode("day");
                        }}
                        onDeleteEvent={deleteEvent}
                    />
                )}
                {viewMode === "week" && (
                    <WeekView
                        currentDate={currentDate}
                        getEventsForDate={getEventsForDate}
                        onDateClick={(d) => {
                            setCurrentDate(d);
                            setViewMode("day");
                        }}
                        onDeleteEvent={deleteEvent}
                    />
                )}
                {viewMode === "day" && (
                    <DayView
                        currentDate={currentDate}
                        events={getEventsForDate(fmt(currentDate))}
                        onDeleteEvent={deleteEvent}
                    />
                )}
            </div>
        </div>
    );
}

/* ── Event Pill ── */
function EventPill({
    event,
    compact,
    onDelete,
}: {
    event: CalendarEvent;
    compact?: boolean;
    onDelete: (id: string) => void;
}) {
    return (
        <div
            className={cn(
                "group flex items-center gap-1 rounded px-1.5 text-[10px] font-medium leading-tight",
                compact ? "py-0.5" : "py-1",
            )}
            style={{ backgroundColor: `${event.color}20`, color: event.color }}
        >
            <div
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: event.color }}
            />
            <span className="min-w-0 flex-1 truncate">{event.title}</span>
            {event.source === "kanban" && (
                <span className="shrink-0 opacity-60 text-[8px]">KB</span>
            )}
            {event.source === "manual" && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(event.id);
                    }}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                >
                    <XIcon className="size-2.5" />
                </button>
            )}
        </div>
    );
}

/* ── Month View ── */
function MonthView({
    currentDate,
    getEventsForDate,
    onDateClick,
    onDeleteEvent,
}: {
    currentDate: Date;
    getEventsForDate: (date: string) => CalendarEvent[];
    onDateClick: (d: Date) => void;
    onDeleteEvent: (id: string) => void;
}) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const todayStr = fmt(new Date());

    // Build grid: start from Sunday of first week
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    // Build 6 weeks (42 cells)
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
        cells.push(addDays(gridStart, i));
    }

    return (
        <div className="flex h-full flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/50">
                {WEEKDAYS.map((d) => (
                    <div
                        key={d}
                        className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid flex-1 grid-cols-7 grid-rows-6">
                {cells.map((cell, i) => {
                    const dateStr = fmt(cell);
                    const isCurrentMonth = cell.getMonth() === month;
                    const isToday = dateStr === todayStr;
                    const dayEvents = getEventsForDate(dateStr);

                    return (
                        <button
                            key={i}
                            onClick={() => onDateClick(cell)}
                            className={cn(
                                "flex flex-col border-b border-r border-border/20 p-1 text-left transition-colors hover:bg-muted/30",
                                !isCurrentMonth && "opacity-40",
                            )}
                        >
                            <span
                                className={cn(
                                    "mb-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                                    isToday
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground",
                                )}
                            >
                                {cell.getDate()}
                            </span>
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                {dayEvents.slice(0, 3).map((evt) => (
                                    <EventPill
                                        key={evt.id}
                                        event={evt}
                                        compact
                                        onDelete={onDeleteEvent}
                                    />
                                ))}
                                {dayEvents.length > 3 && (
                                    <span className="px-1 text-[9px] text-muted-foreground">
                                        +{dayEvents.length - 3} more
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Week View ── */
function WeekView({
    currentDate,
    getEventsForDate,
    onDateClick,
    onDeleteEvent,
}: {
    currentDate: Date;
    getEventsForDate: (date: string) => CalendarEvent[];
    onDateClick: (d: Date) => void;
    onDeleteEvent: (id: string) => void;
}) {
    const ws = startOfWeek(currentDate);
    const todayStr = fmt(new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

    return (
        <div className="flex h-full flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
                <div /> {/* Time gutter spacer */}
                {days.map((d) => {
                    const dateStr = fmt(d);
                    const isToday = dateStr === todayStr;
                    return (
                        <button
                            key={dateStr}
                            onClick={() => onDateClick(d)}
                            className="flex flex-col items-center py-2 hover:bg-muted/20"
                        >
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                {WEEKDAYS[d.getDay()]}
                            </span>
                            <span
                                className={cn(
                                    "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-bold",
                                    isToday
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground",
                                )}
                            >
                                {d.getDate()}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                    {HOURS.map((hour) => (
                        <div key={hour} className="contents">
                            {/* Time label */}
                            <div className="flex h-14 items-start justify-end border-b border-r border-border/20 pr-2 pt-0.5 text-[10px] text-muted-foreground">
                                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                            </div>
                            {/* Day cells */}
                            {days.map((d) => {
                                const dateStr = fmt(d);
                                const dayEvents = hour === 9 ? getEventsForDate(dateStr) : []; // Show events at 9 AM slot
                                return (
                                    <div
                                        key={`${dateStr}-${hour}`}
                                        className="relative h-14 border-b border-r border-border/10 hover:bg-muted/10"
                                    >
                                        {dayEvents.map((evt) => (
                                            <EventPill
                                                key={evt.id}
                                                event={evt}
                                                onDelete={onDeleteEvent}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Day View ── */
function DayView({
    currentDate,
    events: dayEvents,
    onDeleteEvent,
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onDeleteEvent: (id: string) => void;
}) {
    const todayStr = fmt(new Date());
    const dateStr = fmt(currentDate);
    const isToday = dateStr === todayStr;

    return (
        <div className="flex h-full flex-col">
            {/* Day header */}
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
                <span
                    className={cn(
                        "flex size-12 items-center justify-center rounded-full text-2xl font-bold",
                        isToday
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                    )}
                >
                    {currentDate.getDate()}
                </span>
                <div>
                    <p className="text-sm font-semibold">
                        {WEEKDAYS[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            {/* Events list */}
            {dayEvents.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {dayEvents.map((evt) => (
                            <div
                                key={evt.id}
                                className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                            >
                                <div
                                    className="h-10 w-1 rounded-full"
                                    style={{ backgroundColor: evt.color }}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm">{evt.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {evt.source === "kanban" && (
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                                Kanban{evt.sectionName ? ` · ${evt.sectionName}` : ""}
                                            </span>
                                        )}
                                        {evt.source === "manual" && (
                                            <span className="rounded bg-violet-500/10 text-violet-500 px-1.5 py-0.5 text-[10px] font-medium">
                                                Manual
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {evt.source === "manual" && (
                                    <button
                                        onClick={() => onDeleteEvent(evt.id)}
                                        className="shrink-0 rounded p-1 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/50 hover:!text-red-400"
                                    >
                                        <XIcon className="size-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <CalendarDaysIcon className="size-10 opacity-30" />
                    <p className="text-sm">No events scheduled</p>
                    <p className="text-xs opacity-60">
                        Add events or set due dates on Kanban subtasks
                    </p>
                </div>
            )}

            {/* Time grid */}
            <div className="border-t max-h-[50%] overflow-y-auto">
                {HOURS.map((hour) => (
                    <div
                        key={hour}
                        className="flex h-12 items-start border-b border-border/10"
                    >
                        <div className="flex w-16 shrink-0 items-start justify-end pr-3 pt-0.5 text-[10px] text-muted-foreground">
                            {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                        </div>
                        <div className="flex-1 border-l border-border/20" />
                    </div>
                ))}
            </div>
        </div>
    );
}
