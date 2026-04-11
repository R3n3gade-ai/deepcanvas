"use client";

import { EyeIcon, EyeOffIcon, KeyIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useWorkspaceContext } from "@/core/workspaces/workspace-context";

interface ApiKeyDef {
    key: string;
    label: string;
    group: string;
    required: boolean;
    description: string;
    is_set: boolean;
    masked_value: string;
}

interface ApiKeysResponse {
    keys: ApiKeyDef[];
}

function ApiKeyInput({
    def,
    value,
    onChange,
}: {
    def: ApiKeyDef;
    value: string;
    onChange: (value: string) => void;
}) {
    const [showValue, setShowValue] = useState(false);
    const placeholder = def.is_set ? def.masked_value : "Not configured";

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">
                    {def.label}
                    {def.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {def.is_set && !value && (
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                        Configured
                    </span>
                )}
            </div>
            <p className="text-muted-foreground text-xs">{def.description}</p>
            <div className="relative">
                <input
                    type={showValue ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 pr-10 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none",
                        def.is_set && !value && "border-primary/30",
                    )}
                />
                <button
                    type="button"
                    onClick={() => setShowValue(!showValue)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                    {showValue ? (
                        <EyeOffIcon className="size-4" />
                    ) : (
                        <EyeIcon className="size-4" />
                    )}
                </button>
            </div>
        </div>
    );
}

export function ApiKeysSettingsPage() {
    const { activeWorkspaceId } = useWorkspaceContext();
    const [keyDefs, setKeyDefs] = useState<ApiKeyDef[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";

    useEffect(() => {
        async function fetchKeys() {
            if (!activeWorkspaceId) return;
            try {
                const res = await fetch(`/api/workspaces/${activeWorkspaceId}/api-keys`);
                if (res.ok) {
                    const data: ApiKeysResponse = await res.json();
                    setKeyDefs(data.keys);
                }
            } catch (e) {
                console.error("Failed to fetch API keys:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchKeys();
    }, [activeWorkspaceId]);

    const handleChange = useCallback((key: string, value: string) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSave = useCallback(async () => {
        // Filter out empty values
        const updates: Record<string, string> = {};
        for (const [k, v] of Object.entries(values)) {
            if (v.trim()) updates[k] = v.trim();
        }
        if (Object.keys(updates).length === 0) {
            toast.info("No changes to save");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/workspaces/${activeWorkspaceId}/api-keys`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keys: updates }),
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Saved ${data.updated.length} API key(s)`);
                // Refresh the key list to show updated masked values
                const refreshRes = await fetch(`/api/workspaces/${activeWorkspaceId}/api-keys`);
                if (refreshRes.ok) {
                    const refreshData: ApiKeysResponse = await refreshRes.json();
                    setKeyDefs(refreshData.keys);
                }
                setValues({});
            } else {
                toast.error("Failed to save API keys");
            }
        } catch (e) {
            console.error("Failed to save API keys:", e);
            toast.error("Failed to save API keys");
        } finally {
            setSaving(false);
        }
    }, [values, activeWorkspaceId]);

    // Group keys by category
    const groups = keyDefs.reduce(
        (acc, def) => {
            if (!acc[def.group]) acc[def.group] = [];
            acc[def.group]!.push(def);
            return acc;
        },
        {} as Record<string, ApiKeyDef[]>,
    );

    const hasChanges = Object.values(values).some((v) => v.trim());

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <KeyIcon className="size-5" />
                    API Keys
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                    Configure API keys for LLM providers, search tools, and skills.
                    Keys are stored securely in your local environment.
                </p>
            </div>

            {Object.entries(groups).map(([group, defs]) => (
                <div key={group} className="space-y-4">
                    <h4 className="text-muted-foreground border-b pb-2 text-sm font-semibold uppercase tracking-wider">
                        {group}
                    </h4>
                    <div className="space-y-4">
                        {defs.map((def) => (
                            <ApiKeyInput
                                key={def.key}
                                def={def}
                                value={values[def.key] || ""}
                                onChange={(v) => handleChange(def.key, v)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <div className="border-t pt-4">
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={cn(
                        "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        hasChanges
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                            : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                >
                    {saving ? (
                        <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                        <SaveIcon className="size-4" />
                    )}
                    Save Changes
                </button>
            </div>
        </div>
    );
}
