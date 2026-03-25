"use client";

import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    GripVerticalIcon,
    PlusIcon,
    Trash2Icon,
    XIcon,
    PencilIcon,
    CheckIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useWorkspaceContext } from "@/core/workspaces/workspace-context";
import { useKanban, type KanbanCard, type KanbanColumn } from "@/core/kanban/use-kanban";
import { cn } from "@/lib/utils";

import { KanbanTaskPanel } from "./kanban-task-panel";

/* ── Sortable Card ── */
function SortableCard({
    card,
    onDelete,
}: {
    card: KanbanCard;
    onDelete: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
                isDragging && "opacity-50 shadow-lg",
            )}
        >
            <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
                style={{ backgroundColor: card.color ?? "#0D9488" }}
            />
            <div className="flex items-start gap-2 pl-2">
                <button
                    className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <GripVerticalIcon className="size-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{card.title}</p>
                    {card.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {card.description}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => onDelete(card.id)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60 hover:!text-red-400"
                >
                    <Trash2Icon className="size-3" />
                </button>
            </div>
        </div>
    );
}

/* ── Drag Overlay ── */
function CardOverlay({ card }: { card: KanbanCard }) {
    return (
        <div className="rounded-lg border bg-card p-3 shadow-xl">
            <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
                style={{ backgroundColor: card.color ?? "#0D9488" }}
            />
            <div className="pl-3">
                <p className="text-sm font-medium">{card.title}</p>
            </div>
        </div>
    );
}

/* ── Column ── */
function KanbanColumnComp({
    column,
    cards,
    onAddCard,
    onDeleteCard,
    onRenameColumn,
    onDeleteColumn,
}: {
    column: KanbanColumn;
    cards: KanbanCard[];
    onAddCard: (columnId: string, title: string) => void;
    onDeleteCard: (id: string) => void;
    onRenameColumn: (columnId: string, title: string) => void;
    onDeleteColumn: (columnId: string) => void;
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title);

    const handleAdd = () => {
        if (newTitle.trim()) {
            onAddCard(column.id, newTitle.trim());
            setNewTitle("");
            setIsAdding(false);
        }
    };

    const handleRename = () => {
        if (editTitle.trim()) {
            onRenameColumn(column.id, editTitle.trim());
        }
        setIsEditing(false);
    };

    return (
        <div className="flex h-full w-72 shrink-0 flex-col rounded-xl bg-muted/30 border border-border/50">
            {/* Column header */}
            <div className="group flex items-center gap-2 px-3 py-2.5">
                <div
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: column.accent }}
                />
                {isEditing ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                        <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename();
                                if (e.key === "Escape") setIsEditing(false);
                            }}
                            onBlur={handleRename}
                            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                        />
                        <button onClick={handleRename} className="text-primary">
                            <CheckIcon className="size-3" />
                        </button>
                    </div>
                ) : (
                    <h3
                        className="min-w-0 flex-1 truncate text-sm font-semibold cursor-pointer"
                        onDoubleClick={() => {
                            setIsEditing(true);
                            setEditTitle(column.title);
                        }}
                    >
                        {column.title}
                    </h3>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {cards.length}
                </span>
                <button
                    onClick={() => {
                        setIsEditing(true);
                        setEditTitle(column.title);
                    }}
                    className="shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/50 hover:!text-foreground"
                >
                    <PencilIcon className="size-3" />
                </button>
                <button
                    onClick={() => onDeleteColumn(column.id)}
                    className="shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/40 hover:!text-red-400"
                >
                    <Trash2Icon className="size-3" />
                </button>
            </div>

            {/* Cards */}
            <SortableContext
                items={cards.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[60px]" data-column-id={column.id}>
                    {cards.map((card) => (
                        <SortableCard key={card.id} card={card} onDelete={onDeleteCard} />
                    ))}
                    {cards.length === 0 && !isAdding && (
                        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/50">
                            Drop cards here
                        </div>
                    )}
                </div>
            </SortableContext>

            {/* Add card */}
            <div className="border-t border-border/30 px-2 py-2">
                {isAdding ? (
                    <div className="space-y-2">
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAdd();
                                if (e.key === "Escape") {
                                    setIsAdding(false);
                                    setNewTitle("");
                                }
                            }}
                            placeholder="Card title..."
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        <div className="flex gap-1">
                            <button
                                onClick={handleAdd}
                                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewTitle("");
                                }}
                                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                            >
                                <XIcon className="size-3" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <PlusIcon className="size-3.5" />
                        Add card
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Add Column Button ── */
function AddColumnButton({ onAdd }: { onAdd: (title: string) => void }) {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState("");

    const handleAdd = () => {
        if (title.trim()) {
            onAdd(title.trim());
            setTitle("");
            setIsAdding(false);
        }
    };

    if (isAdding) {
        return (
            <div className="flex w-60 shrink-0 flex-col rounded-xl bg-muted/20 border border-dashed border-border/50 p-3">
                <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                        if (e.key === "Escape") {
                            setIsAdding(false);
                            setTitle("");
                        }
                    }}
                    placeholder="Column name..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="mt-2 flex gap-1">
                    <button
                        onClick={handleAdd}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Add Column
                    </button>
                    <button
                        onClick={() => {
                            setIsAdding(false);
                            setTitle("");
                        }}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                        <XIcon className="size-3" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsAdding(true)}
            className="flex h-12 w-60 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/20 hover:text-foreground"
        >
            <PlusIcon className="size-4" />
            Add Column
        </button>
    );
}

/* ── Main Page ── */
export default function KanbanPage() {
    const { activeWorkspace } = useWorkspaceContext();
    const kanban = useKanban(activeWorkspace.id);
    const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);

    useEffect(() => {
        document.title = `Kanban - ${activeWorkspace.name} - DEEP CANVAS`;
    }, [activeWorkspace.name]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        const card = kanban.cards.find((c) => c.id === event.active.id);
        if (card) setActiveCard(card);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
        const activeId = active.id as string;
        const overId = over.id as string;

        // Check if over a column
        const isOverColumn = kanban.columns.some((c) => c.id === overId);
        if (isOverColumn) {
            kanban.moveCard(activeId, overId);
            return;
        }

        // Over another card
        const overCard = kanban.cards.find((c) => c.id === overId);
        if (overCard) {
            const dragCard = kanban.cards.find((c) => c.id === activeId);
            if (dragCard && dragCard.columnId !== overCard.columnId) {
                kanban.moveCard(activeId, overCard.columnId);
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);
        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const isOverColumn = kanban.columns.some((c) => c.id === overId);
        if (isOverColumn) {
            kanban.moveCard(activeId, overId);
            return;
        }

        kanban.reorderCards(activeId, overId);
    };

    return (
        <div className="flex h-full">
            {/* Left: Task Hierarchy Panel */}
            <div className="w-80 shrink-0">
                <KanbanTaskPanel
                    sections={kanban.sections}
                    onAddSection={kanban.addSection}
                    onRenameSection={kanban.renameSection}
                    onDeleteSection={kanban.deleteSection}
                    onToggleCollapse={kanban.toggleSectionCollapse}
                    onAddSubtask={kanban.addSubtask}
                    onDeleteSubtask={kanban.deleteSubtask}
                    onPushToBoard={kanban.pushSubtaskToBoard}
                />
            </div>

            {/* Right: Kanban Board */}
            <div className="flex-1 overflow-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex h-full gap-4 overflow-x-auto p-4">
                        {kanban.columns
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((col) => (
                                <KanbanColumnComp
                                    key={col.id}
                                    column={col}
                                    cards={kanban.getColumnCards(col.id)}
                                    onAddCard={(colId, title) => kanban.addCard(title, colId)}
                                    onDeleteCard={kanban.deleteCard}
                                    onRenameColumn={kanban.renameColumn}
                                    onDeleteColumn={kanban.deleteColumn}
                                />
                            ))}

                        <AddColumnButton onAdd={kanban.addColumn} />
                    </div>

                    <DragOverlay>
                        {activeCard ? <CardOverlay card={activeCard} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
