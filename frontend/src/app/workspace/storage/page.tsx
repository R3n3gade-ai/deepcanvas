"use client";

import {
    ArrowLeftIcon,
    DownloadIcon,
    FileIcon,
    FileTextIcon,
    FolderOpenIcon,
    ImageIcon,
    Music2Icon,
    PlusIcon,
    Trash2Icon,
    UploadCloudIcon,
    VideoIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const BACKEND_URL =
    typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8001"
        : "http://localhost:8001";

interface StoredFile {
    id: string;
    original_name: string;
    stored_name: string;
    mime_type: string | null;
    size: number;
    created_at: string;
    category: string;
}

type FilterCategory = "all" | "image" | "video" | "audio" | "document" | "other";

function categoryIcon(category: string) {
    switch (category) {
        case "image":
            return <ImageIcon className="size-5" />;
        case "video":
            return <VideoIcon className="size-5" />;
        case "audio":
            return <Music2Icon className="size-5" />;
        case "document":
            return <FileTextIcon className="size-5" />;
        default:
            return <FileIcon className="size-5" />;
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function StoragePage() {
    const [files, setFiles] = useState<StoredFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [filter, setFilter] = useState<FilterCategory>("all");
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = useCallback(async () => {
        try {
            const url =
                filter === "all"
                    ? `${BACKEND_URL}/api/storage/files`
                    : `${BACKEND_URL}/api/storage/files?category=${filter}`;
            const res = await fetch(url);
            if (res.ok) {
                setFiles(await res.json());
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleUpload = useCallback(
        async (fileList: FileList | null) => {
            if (!fileList || fileList.length === 0) return;
            setUploading(true);
            for (const file of Array.from(fileList)) {
                const form = new FormData();
                form.append("file", file);
                try {
                    await fetch(`${BACKEND_URL}/api/storage/upload`, {
                        method: "POST",
                        body: form,
                    });
                } catch {
                    /* ignore */
                }
            }
            setUploading(false);
            fetchFiles();
        },
        [fetchFiles],
    );

    const handleDelete = useCallback(
        async (id: string) => {
            try {
                await fetch(`${BACKEND_URL}/api/storage/files/${id}`, {
                    method: "DELETE",
                });
                fetchFiles();
            } catch {
                /* ignore */
            }
        },
        [fetchFiles],
    );

    const handleDownload = useCallback((file: StoredFile) => {
        const a = document.createElement("a");
        a.href = `${BACKEND_URL}/api/storage/files/${file.id}`;
        a.download = file.original_name;
        a.click();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            handleUpload(e.dataTransfer.files);
        },
        [handleUpload],
    );

    const filters: { label: string; value: FilterCategory }[] = [
        { label: "All", value: "all" },
        { label: "Images", value: "image" },
        { label: "Videos", value: "video" },
        { label: "Audio", value: "audio" },
        { label: "Documents", value: "document" },
        { label: "Other", value: "other" },
    ];

    return (
        <div className="flex size-full flex-col">
            {/* Header */}
            <header className="flex h-14 items-center justify-between border-b px-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/workspace/chats/new"
                        className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <FolderOpenIcon className="text-primary size-5" />
                    <h1 className="text-lg font-semibold">Storage / Files</h1>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <PlusIcon className="size-4" />
                    {uploading ? "Uploading..." : "Upload Files"}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                />
            </header>

            {/* Filters */}
            <div className="flex gap-2 border-b px-6 py-3">
                {filters.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div
                className={`flex-1 overflow-auto p-6 ${dragOver ? "bg-primary/5 ring-primary ring-2 ring-inset" : ""
                    }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                {loading ? (
                    <div className="text-muted-foreground flex items-center justify-center py-20 text-sm">
                        Loading files...
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <div className="bg-muted flex size-16 items-center justify-center rounded-2xl">
                            <UploadCloudIcon className="text-muted-foreground size-8" />
                        </div>
                        <div>
                            <p className="text-base font-medium">No files yet</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Upload files or drag and drop them here.
                                <br />
                                The agent can also store and retrieve files for you.
                            </p>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
                        >
                            <PlusIcon className="size-4" />
                            Upload Files
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="group relative flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50"
                            >
                                {/* Preview or icon */}
                                <div className="bg-muted/50 flex h-28 items-center justify-center rounded-lg">
                                    {file.category === "image" && file.mime_type ? (
                                        <img
                                            src={`${BACKEND_URL}/api/storage/files/${file.id}`}
                                            alt={file.original_name}
                                            className="h-full w-full rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="text-muted-foreground">
                                            {categoryIcon(file.category)}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium" title={file.original_name}>
                                        {file.original_name}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                        {formatBytes(file.size)} · {formatDate(file.created_at)}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                        onClick={() => handleDownload(file)}
                                        className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
                                        title="Download"
                                    >
                                        <DownloadIcon className="size-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file.id)}
                                        className="text-muted-foreground hover:text-destructive rounded-md p-1.5 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2Icon className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
