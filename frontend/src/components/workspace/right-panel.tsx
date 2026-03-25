"use client";

import {
    CalendarDaysIcon,
    ContactIcon,
    FolderOpenIcon,
    KanbanSquareIcon,
    MegaphoneIcon,
    MicIcon,
    PaletteIcon,
    PanelRightCloseIcon,
    VideoIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useWorkspaceContext } from "@/core/workspaces/workspace-context";

type RightPanelTab = "features" | "tab2" | "tab3";

function TabButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
        >
            {label}
        </button>
    );
}

/* ── Feature Button (used in the Features tab) ── */
function ToolButton({
    icon: Icon,
    label,
    href,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted"
        >
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <Icon className="size-4" />
            </div>
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );
}

/* ── Features tab content ── */
function FeaturesContent() {
    return (
        <div className="flex flex-col gap-2 p-3">
            <span className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wider">
                Workspace Features
            </span>
            <ToolButton
                icon={FolderOpenIcon}
                label="Storage / Files"
                href="/workspace/storage"
            />
            <ToolButton
                icon={KanbanSquareIcon}
                label="Kanban Board"
                href="/workspace/kanban"
            />
            <ToolButton
                icon={CalendarDaysIcon}
                label="Calendar"
                href="/workspace/calendar"
            />
            <ToolButton
                icon={MicIcon}
                label="Voice Meeting"
                href="/workspace/voice-meeting"
            />
            <ToolButton
                icon={ContactIcon}
                label="Social Station"
                href="/workspace/social-station"
            />
            <ToolButton
                icon={VideoIcon}
                label="Video Editor"
                href="/workspace/video-editor"
            />
            <ToolButton
                icon={ContactIcon}
                label="CRM"
                href="/workspace/crm"
            />
            <ToolButton
                icon={PaletteIcon}
                label="Creative Studio"
                href="/workspace/creative-studio"
            />
            <ToolButton
                icon={MegaphoneIcon}
                label="Lead Gen"
                href="/workspace/lead-gen"
            />
        </div>
    );
}

interface RightPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RightPanel({ isOpen, onClose }: RightPanelProps) {
    const [activeTab, setActiveTab] = useState<RightPanelTab>("features");
    const { activeWorkspace } = useWorkspaceContext();

    if (!isOpen) return null;

    return (
        <div className="bg-sidebar flex h-full w-[300px] shrink-0 flex-col">
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b px-3">
                <span className="text-sm font-medium truncate">{activeWorkspace.name}</span>
                <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                >
                    <PanelRightCloseIcon className="size-4" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b px-2 py-2">
                <TabButton
                    active={activeTab === "features"}
                    label="Features"
                    onClick={() => setActiveTab("features")}
                />
                <TabButton
                    active={activeTab === "tab2"}
                    label="Tab 2"
                    onClick={() => setActiveTab("tab2")}
                />
                <TabButton
                    active={activeTab === "tab3"}
                    label="Tab 3"
                    onClick={() => setActiveTab("tab3")}
                />
            </div>

            {/* Content */}
            {activeTab === "features" && <FeaturesContent />}
            {activeTab !== "features" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
                    <p className="text-muted-foreground text-sm font-medium capitalize">
                        {activeTab.replace("tab", "Tab ")}
                    </p>
                    <p className="text-muted-foreground/70 text-xs">
                        Customize this panel as needed
                    </p>
                </div>
            )}
        </div>
    );
}
