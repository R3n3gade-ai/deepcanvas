"use client";

import {
    CheckCircle2Icon,
    CircleIcon,
    ExternalLinkIcon,
    GlobeIcon,
    Loader2Icon,
    PlugIcon,
    SearchIcon,
    SettingsIcon,
    XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const BACKEND_URL =
    typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8001"
        : "http://localhost:8001";

/* ── Catalog of popular MCP servers ── */
interface McpCatalogEntry {
    name: string;
    displayName: string;
    description: string;
    category: string;
    command: string;
    args: string[];
    envKeys: string[];
    docsUrl?: string;
    icon?: string;
}

const MCP_CATALOG: McpCatalogEntry[] = [
    {
        name: "github",
        displayName: "GitHub",
        description: "Manage repos, issues, PRs, and code search",
        category: "Development",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        envKeys: ["GITHUB_TOKEN"],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
        icon: "🐙",
    },
    {
        name: "filesystem",
        displayName: "Filesystem",
        description: "Read, write, and search local files",
        category: "Development",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
        envKeys: [],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
        icon: "📂",
    },
    {
        name: "google-drive",
        displayName: "Google Drive",
        description: "Search and read Google Drive files and docs",
        category: "Productivity",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-gdrive"],
        envKeys: ["GDRIVE_CREDENTIALS"],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive",
        icon: "📁",
    },
    {
        name: "slack",
        displayName: "Slack",
        description: "Read channels, send messages, search workspace",
        category: "Communication",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-slack"],
        envKeys: ["SLACK_BOT_TOKEN"],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
        icon: "💬",
    },
    {
        name: "notion",
        displayName: "Notion",
        description: "Read/write Notion pages, databases, and blocks",
        category: "Productivity",
        command: "npx",
        args: ["-y", "notion-mcp-server"],
        envKeys: ["NOTION_API_KEY"],
        docsUrl: "https://github.com/modelcontextprotocol/servers",
        icon: "📝",
    },
    {
        name: "postgres",
        displayName: "PostgreSQL",
        description: "Query PostgreSQL databases with read-only access",
        category: "Database",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres"],
        envKeys: ["POSTGRES_CONNECTION_STRING"],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
        icon: "🐘",
    },
    {
        name: "brave-search",
        displayName: "Brave Search",
        description: "Web and local search via Brave Search API",
        category: "Search",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-brave-search"],
        envKeys: ["BRAVE_API_KEY"],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
        icon: "🔍",
    },
    {
        name: "puppeteer",
        displayName: "Puppeteer",
        description: "Browser automation — navigate, screenshot, scrape",
        category: "Automation",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-puppeteer"],
        envKeys: [],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
        icon: "🤖",
    },
    {
        name: "linear",
        displayName: "Linear",
        description: "Manage issues, projects, and teams in Linear",
        category: "Project Management",
        command: "npx",
        args: ["-y", "mcp-linear"],
        envKeys: ["LINEAR_API_KEY"],
        docsUrl: "https://github.com/modelcontextprotocol/servers",
        icon: "📋",
    },
    {
        name: "memory",
        displayName: "Memory",
        description: "Persistent knowledge-graph memory for the agent",
        category: "AI",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
        envKeys: [],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
        icon: "🧠",
    },
    {
        name: "google-maps",
        displayName: "Google Maps",
        description: "Geocoding, directions, and place search",
        category: "Location",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-google-maps"],
        envKeys: ["GOOGLE_MAPS_API_KEY"],
        docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps",
        icon: "🗺️",
    },
    {
        name: "stripe",
        displayName: "Stripe",
        description: "Manage payments, customers, and subscriptions",
        category: "Finance",
        command: "npx",
        args: ["-y", "mcp-stripe"],
        envKeys: ["STRIPE_SECRET_KEY"],
        docsUrl: "https://github.com/modelcontextprotocol/servers",
        icon: "💳",
    },
];

const CATEGORIES = [
    "All",
    ...Array.from(new Set(MCP_CATALOG.map((s) => s.category))),
];

/* ── Types matching the API ── */
interface McpServerConfig {
    enabled: boolean;
    type: string;
    command: string | null;
    args: string[];
    env: Record<string, string>;
    url: string | null;
    headers: Record<string, string>;
    description: string;
}

/* ── Component ── */
export function McpSettingsPage() {
    const [servers, setServers] = useState<Record<string, McpServerConfig>>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [category, setCategory] = useState("All");
    const [configuring, setConfiguring] = useState<string | null>(null);
    const [envValues, setEnvValues] = useState<Record<string, string>>({});

    // Fetch current config
    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/mcp/config`);
                if (res.ok) {
                    const data = await res.json();
                    setServers(data.mcp_servers || {});
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        }
        fetchConfig();
    }, []);

    const isConnected = useCallback(
        (name: string) => {
            return !!servers[name]?.enabled;
        },
        [servers],
    );

    // Connect an MCP server
    const connectServer = useCallback(
        async (entry: McpCatalogEntry) => {
            // If it needs env keys and none are filled, open config
            if (entry.envKeys.length > 0) {
                const allFilled = entry.envKeys.every((k) => envValues[k]?.trim());
                if (!allFilled) {
                    setConfiguring(entry.name);
                    return;
                }
            }

            const env: Record<string, string> = {};
            entry.envKeys.forEach((k) => {
                if (envValues[k]) env[k] = envValues[k];
            });

            const newServers = {
                ...servers,
                [entry.name]: {
                    enabled: true,
                    type: "stdio",
                    command: entry.command,
                    args: [...entry.args],
                    env,
                    url: null,
                    headers: {},
                    description: entry.description,
                },
            };

            try {
                const res = await fetch(`${BACKEND_URL}/api/mcp/config`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mcp_servers: newServers }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setServers(data.mcp_servers || newServers);
                    toast.success(`${entry.displayName} connected!`);
                    setConfiguring(null);
                    setEnvValues({});
                } else {
                    toast.error("Failed to save MCP config");
                }
            } catch {
                toast.error("Failed to connect server");
            }
        },
        [servers, envValues],
    );

    // Disconnect
    const disconnectServer = useCallback(
        async (name: string) => {
            const newServers = { ...servers };
            delete newServers[name];
            try {
                const res = await fetch(`${BACKEND_URL}/api/mcp/config`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mcp_servers: newServers }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setServers(data.mcp_servers || newServers);
                    const entry = MCP_CATALOG.find((e) => e.name === name);
                    toast.success(`${entry?.displayName || name} disconnected`);
                }
            } catch {
                toast.error("Failed to disconnect server");
            }
        },
        [servers],
    );

    // Filter catalog
    const filtered = MCP_CATALOG.filter((entry) => {
        const matchesFilter =
            !filter ||
            entry.displayName.toLowerCase().includes(filter.toLowerCase()) ||
            entry.description.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory =
            category === "All" || entry.category === category;
        return matchesFilter && matchesCategory;
    });

    // Count connected custom servers not in catalog
    const customServerNames = Object.keys(servers).filter(
        (name) => !MCP_CATALOG.find((e) => e.name === name),
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <PlugIcon className="size-5" />
                    MCP Connections
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                    Connect your agent to external tools and services via the Model
                    Context Protocol. One-click connect popular servers or add custom
                    ones.
                </p>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium">
                        {Object.keys(servers).length} connected
                    </span>
                </div>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground text-xs">
                    {MCP_CATALOG.length} available in catalog
                </span>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Search servers..."
                        className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                    />
                </div>
                <div className="flex gap-1 rounded-md border bg-muted/20 p-0.5">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={cn(
                                "rounded px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                                category === cat
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Server catalog */}
            <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((entry) => {
                    const connected = isConnected(entry.name);
                    const isConfigOpen = configuring === entry.name;

                    return (
                        <div
                            key={entry.name}
                            className={cn(
                                "rounded-lg border p-4 transition-colors",
                                connected
                                    ? "border-primary/30 bg-primary/5"
                                    : "hover:border-border hover:bg-muted/10",
                            )}
                        >
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">{entry.icon}</span>
                                    <div>
                                        <p className="text-sm font-semibold">{entry.displayName}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {entry.category}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {entry.docsUrl && (
                                        <a
                                            href={entry.docsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            <ExternalLinkIcon className="size-3" />
                                        </a>
                                    )}
                                    {connected ? (
                                        <button
                                            onClick={() => disconnectServer(entry.name)}
                                            className="flex items-center gap-1 rounded-md bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => connectServer(entry)}
                                            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <p className="mt-2 text-xs text-muted-foreground">
                                {entry.description}
                            </p>

                            {/* Status */}
                            {connected && (
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-600">
                                    <CheckCircle2Icon className="size-3" />
                                    Connected
                                </div>
                            )}

                            {/* Config panel */}
                            {isConfigOpen && !connected && (
                                <div className="mt-3 space-y-2 rounded-md border bg-muted/10 p-3">
                                    <p className="text-xs font-medium">Required credentials:</p>
                                    {entry.envKeys.map((key) => (
                                        <div key={key}>
                                            <label className="text-[11px] font-medium text-muted-foreground">
                                                {key}
                                            </label>
                                            <input
                                                type="password"
                                                value={envValues[key] || ""}
                                                onChange={(e) =>
                                                    setEnvValues((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
                                                }
                                                placeholder={`Enter ${key}...`}
                                                className="mt-0.5 w-full rounded border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                                            />
                                        </div>
                                    ))}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => connectServer(entry)}
                                            className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                                        >
                                            Save & Connect
                                        </button>
                                        <button
                                            onClick={() => {
                                                setConfiguring(null);
                                                setEnvValues({});
                                            }}
                                            className="rounded-md px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Custom servers section */}
            {customServerNames.length > 0 && (
                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                        <SettingsIcon className="size-4" />
                        Custom Servers
                    </h4>
                    {customServerNames.map((name) => {
                        const server = servers[name]!;
                        return (
                            <div
                                key={name}
                                className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
                            >
                                <div className="flex items-center gap-2.5">
                                    <GlobeIcon className="size-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">{name}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {server.description || `${server.type} · ${server.command || server.url || "custom"}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => disconnectServer(name)}
                                    className="rounded-md bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20"
                                >
                                    Remove
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info footer */}
            <div className="text-muted-foreground space-y-2 text-xs">
                <p className="font-medium">About MCP:</p>
                <ul className="list-inside list-disc space-y-1">
                    <li>MCP servers give your agent new capabilities (tools)</li>
                    <li>Connected servers are available to the agent in all chats</li>
                    <li>Credentials are stored locally and never sent to third parties</li>
                    <li>Restart the agent after connecting new servers for changes to take effect</li>
                </ul>
            </div>
        </div>
    );
}
