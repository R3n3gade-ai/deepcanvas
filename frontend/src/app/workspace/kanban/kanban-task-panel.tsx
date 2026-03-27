"use client";

import {
    ArrowDownIcon,
    ArrowRightToLineIcon,
    ArrowUpIcon,
    CalendarIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    PlusIcon,
    Trash2Icon,
    XIcon,
} from "lucide-react";
import { useState } from "react";

import type { TaskSection } from "@/core/kanban/use-kanban";
import { cn } from "@/lib/utils";

interface KanbanTaskPanelProps {
    sections: TaskSection[];
    onAddSection: (name: string) => void;
    onRenameSection: (sectionId: string, name: string) => void;
    onDeleteSection: (sectionId: string) => void;
    onToggleCollapse: (sectionId: string) => void;
    onMoveSectionUp: (sectionId: string) => void;
    onMoveSectionDown: (sectionId: string) => void;
    onAddSubtask: (sectionId: string, title: string, dueDate?: string) => void;
    onDeleteSubtask: (sectionId: string, subtaskId: string) => void;
    onPushToBoard: (sectionId: string, subtaskId: string) => void;
}

export function KanbanTaskPanel({
    sections,
    onAddSection,
    onRenameSection,
    onDeleteSection,
    onToggleCollapse,
    onMoveSectionUp,
    onMoveSectionDown,
    onAddSubtask,
    onDeleteSubtask,
    onPushToBoard,
}: KanbanTaskPanelProps) {
    const [newSectionName, setNewSectionName] = useState("");
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [newSubtaskDate, setNewSubtaskDate] = useState("");
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingSectionName, setEditingSectionName] = useState("");

    // Global row counter across all sections
    let rowNum = 0;

    const handleAddSection = () => {
        if (newSectionName.trim()) {
            onAddSection(newSectionName.trim());
            setNewSectionName("");
            setIsAddingSection(false);
        }
    };

    const handleAddSubtask = (sectionId: string) => {
        if (newSubtaskTitle.trim()) {
            onAddSubtask(sectionId, newSubtaskTitle.trim(), newSubtaskDate || undefined);
            setNewSubtaskTitle("");
            setNewSubtaskDate("");
            setAddingSubtaskFor(null);
        }
    };

    const handleRenameSection = (sectionId: string) => {
        if (editingSectionName.trim()) {
            onRenameSection(sectionId, editingSectionName.trim());
        }
        setEditingSectionId(null);
    };

    return (
        <div className="flex h-full flex-col border-r border-border/50 bg-muted/20">
            {/* Header */}
            <div className="flex items-center border-b border-border/50 px-3 py-2.5">
                <span className="w-10 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    #
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Task Name
                </span>
            </div>

            {/* Scrollable sections */}
            <div className="flex-1 overflow-y-auto">
                {sections.map((section) => {
                    rowNum++;
                    const sectionRowNum = rowNum;

                    return (
                        <div key={section.id}>
                            {/* Section header row */}
                            <div
                                className="group flex items-center border-b border-border/20 hover:bg-muted/40"
                            >
                                {/* Row number */}
                                <div className="flex w-10 items-center justify-center py-2 text-xs text-muted-foreground">
                                    {sectionRowNum}
                                </div>

                                {/* Color bar */}
                                <div
                                    className="mr-2 h-4 w-1 rounded-sm"
                                    style={{ backgroundColor: section.color }}
                                />

                                {/* Collapse toggle */}
                                <button
                                    onClick={() => onToggleCollapse(section.id)}
                                    className="mr-1 text-muted-foreground/60 hover:text-foreground"
                                >
                                    {section.collapsed ? (
                                        <ChevronRightIcon className="size-3.5" />
                                    ) : (
                                        <ChevronDownIcon className="size-3.5" />
                                    )}
                                </button>

                                {/* Section name (editable) */}
                                {editingSectionId === section.id ? (
                                    <input
                                        autoFocus
                                        value={editingSectionName}
                                        onChange={(e) => setEditingSectionName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleRenameSection(section.id);
                                            if (e.key === "Escape") setEditingSectionId(null);
                                        }}
                                        onBlur={() => handleRenameSection(section.id)}
                                        className="min-w-0 flex-1 bg-transparent py-2 text-sm font-bold outline-none"
                                    />
                                ) : (
                                    <button
                                        onDoubleClick={() => {
                                            setEditingSectionId(section.id);
                                            setEditingSectionName(section.name);
                                        }}
                                        className="min-w-0 flex-1 truncate py-2 text-left text-sm font-bold"
                                    >
                                        {section.name}
                                    </button>
                                )}

                                {/* Delete section */}
                                <button
                                    onClick={() => onDeleteSection(section.id)}
                                    className="mr-1 shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/50 hover:!text-red-400"
                                >
                                    <Trash2Icon className="size-3" />
                                </button>

                                {/* Reorder buttons */}
                                <button
                                    onClick={() => onMoveSectionUp(section.id)}
                                    className="shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/40 hover:!text-foreground"
                                    title="Move section up"
                                >
                                    <ArrowUpIcon className="size-3" />
                                </button>
                                <button
                                    onClick={() => onMoveSectionDown(section.id)}
                                    className="mr-2 shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/40 hover:!text-foreground"
                                    title="Move section down"
                                >
                                    <ArrowDownIcon className="size-3" />
                                </button>
                            </div>

                            {/* Subtasks */}
                            {!section.collapsed &&
                                section.subtasks.map((st) => {
                                    rowNum++;
                                    return (
                                        <div
                                            key={st.id}
                                            className="group flex items-center border-b border-border/10 hover:bg-muted/30"
                                        >
                                            {/* Row number */}
                                            <div className="flex w-10 items-center justify-center py-1.5 text-[11px] text-muted-foreground/60">
                                                {rowNum}
                                            </div>

                                            {/* Indent + color line */}
                                            <div className="mr-2 w-1" />
                                            <div className="mr-3 w-4" />

                                            {/* Subtask name */}
                                            <div className="min-w-0 flex-1 truncate py-1.5 text-sm text-foreground/80">
                                                {st.title}
                                            </div>

                                            {/* Due date badge */}
                                            {st.dueDate && (
                                                <span className="mr-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                    {st.dueDate}
                                                </span>
                                            )}

                                            {/* Status: on board or push button */}
                                            {st.addedToBoard ? (
                                                <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                                    On Board
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => onPushToBoard(section.id, st.id)}
                                                    title="Add to Kanban board"
                                                    className="mr-1 shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-primary/70 hover:!text-primary"
                                                >
                                                    <ArrowRightToLineIcon className="size-3.5" />
                                                </button>
                                            )}

                                            {/* Delete subtask */}
                                            <button
                                                onClick={() => onDeleteSubtask(section.id, st.id)}
                                                className="mr-2 shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/40 hover:!text-red-400"
                                            >
                                                <Trash2Icon className="size-2.5" />
                                            </button>
                                        </div>
                                    );
                                })}

                            {/* Add subtask inline */}
                            {!section.collapsed && (
                                <div className="border-b border-border/10">
                                    {addingSubtaskFor === section.id ? (
                                        <div className="flex items-center gap-1 px-2 py-1.5 pl-16">
                                            <input
                                                autoFocus
                                                value={newSubtaskTitle}
                                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleAddSubtask(section.id);
                                                    if (e.key === "Escape") {
                                                        setAddingSubtaskFor(null);
                                                        setNewSubtaskTitle("");
                                                        setNewSubtaskDate("");
                                                    }
                                                }}
                                                placeholder="Subtask name..."
                                                className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                                            />
                                            <div className="relative">
                                                <CalendarIcon className="absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/50" />
                                                <input
                                                    type="date"
                                                    value={newSubtaskDate}
                                                    onChange={(e) => setNewSubtaskDate(e.target.value)}
                                                    className="w-28 rounded border bg-background py-1 pl-5 pr-1 text-[10px] outline-none focus:border-primary"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleAddSubtask(section.id)}
                                                className="rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAddingSubtaskFor(null);
                                                    setNewSubtaskTitle("");
                                                    setNewSubtaskDate("");
                                                }}
                                                className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                                            >
                                                <XIcon className="size-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingSubtaskFor(section.id)}
                                            className="flex items-center gap-1 px-2 py-1 pl-16 text-[11px] text-muted-foreground/50 hover:text-muted-foreground"
                                        >
                                            <PlusIcon className="size-3" />
                                            Add subtask
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Add section */}
                <div className="px-2 py-2">
                    {isAddingSection ? (
                        <div className="flex items-center gap-1">
                            <input
                                autoFocus
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddSection();
                                    if (e.key === "Escape") {
                                        setIsAddingSection(false);
                                        setNewSectionName("");
                                    }
                                }}
                                placeholder="Section name..."
                                className="min-w-0 flex-1 rounded border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                            />
                            <button
                                onClick={handleAddSection}
                                className="rounded bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setIsAddingSection(false);
                                    setNewSectionName("");
                                }}
                                className="rounded p-1 text-muted-foreground hover:bg-muted"
                            >
                                <XIcon className="size-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingSection(true)}
                            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <PlusIcon className="size-3.5" />
                            Add section
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
