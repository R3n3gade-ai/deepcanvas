"use client";

import {
  BellIcon,
  BrainIcon,
  HeartPulseIcon,
  KeyIcon,
  Loader2Icon,
  PaletteIcon,
  PlugIcon,
  SaveIcon,
  SparklesIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApiKeysSettingsPage } from "@/components/workspace/settings/api-keys-settings-page";
import { AppearanceSettingsPage } from "@/components/workspace/settings/appearance-settings-page";
import { McpSettingsPage } from "@/components/workspace/settings/mcp-settings-page";
import { MemorySettingsPage } from "@/components/workspace/settings/memory-settings-page";
import { NotificationSettingsPage } from "@/components/workspace/settings/notification-settings-page";
import { SkillSettingsPage } from "@/components/workspace/settings/skill-settings-page";
import { ToolSettingsPage } from "@/components/workspace/settings/tool-settings-page";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

const BACKEND_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8001"
    : "http://localhost:8001";

function HeartbeatSettingsSection() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/heartbeat/status`);
        if (res.ok) {
          const data = await res.json();
          setEnabled(data.enabled);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const handleToggle = useCallback(async () => {
    const endpoint = enabled ? "disable" : "enable";
    try {
      const res = await fetch(`${BACKEND_URL}/api/heartbeat/${endpoint}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        toast.success(
          data.enabled ? "Heartbeat mode enabled" : "Heartbeat mode disabled",
        );
      }
    } catch {
      toast.error("Failed to update heartbeat setting");
    }
  }, [enabled]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <HeartPulseIcon className="size-5" />
          Heartbeat Mode
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          When enabled, the agent will automatically continue working on tasks
          even when you stop chatting. Just give it a task in the chat and it
          will keep going until it&apos;s done.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Enable Heartbeat</p>
          <p className="text-muted-foreground text-xs">
            Agent auto-continues tasks after 30 seconds of idle
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            enabled ? "bg-primary" : "bg-muted",
            loading && "opacity-50",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              enabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      <div className="text-muted-foreground space-y-2 text-xs">
        <p className="font-medium">How it works:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Give the agent a task via normal chat</li>
          <li>
            When you stop chatting, the agent waits 30 seconds then
            auto-continues
          </li>
          <li>The agent keeps working until the task is complete</li>
          <li>Send a new message anytime to interrupt and redirect</li>
        </ul>
      </div>
    </div>
  );
}

function SoulSettingsSection() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    async function fetchSoul() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/soul`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchSoul();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/soul`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        toast.success("Soul saved — restart the agent to apply changes");
        setEdited(false);
      }
    } catch {
      toast.error("Failed to save soul");
    } finally {
      setSaving(false);
    }
  }, [content]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <UserIcon className="size-5" />
          Soul
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Define your agent&apos;s personality, name, and instructions.
          This is injected into the system prompt and shapes how the agent
          behaves, communicates, and approaches tasks.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">SOUL.md</label>
          {edited && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {saving ? (
                <Loader2Icon className="size-3 animate-spin" />
              ) : (
                <SaveIcon className="size-3" />
              )}
              Save
            </button>
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setEdited(true);
          }}
          disabled={loading}
          placeholder={`# My Agent\n\n## Name\nCanvas\n\n## Personality\nYou are a helpful, creative AI assistant...\n\n## Instructions\n- Always be concise\n- Focus on quality over quantity\n- Ask clarifying questions when needed`}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[300px] w-full resize-y rounded-md border p-3 font-mono text-xs leading-relaxed focus-visible:ring-1 focus-visible:outline-none"
        />
      </div>

      <div className="text-muted-foreground space-y-2 text-xs">
        <p className="font-medium">Tips:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Give your agent a name and personality</li>
          <li>Set behavioral guidelines and communication style</li>
          <li>Define areas of expertise or focus</li>
          <li>Changes take effect when the agent restarts or a new chat starts</li>
        </ul>
      </div>
    </div>
  );
}

type SettingsSection =
  | "appearance"
  | "memory"
  | "tools"
  | "skills"
  | "mcp"
  | "notification"
  | "apiKeys"
  | "heartbeat"
  | "soul";

type SettingsDialogProps = React.ComponentProps<typeof Dialog> & {
  defaultSection?: SettingsSection;
};

export function SettingsDialog(props: SettingsDialogProps) {
  const { defaultSection = "appearance", ...dialogProps } = props;
  const { t } = useI18n();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(defaultSection);

  useEffect(() => {
    if (dialogProps.open) {
      setActiveSection(defaultSection);
    }
  }, [defaultSection, dialogProps.open]);

  const sections = useMemo(
    () => [
      {
        id: "appearance",
        label: t.settings.sections.appearance,
        icon: PaletteIcon,
      },
      {
        id: "notification",
        label: t.settings.sections.notification,
        icon: BellIcon,
      },
      {
        id: "memory",
        label: t.settings.sections.memory,
        icon: BrainIcon,
      },
      { id: "tools", label: t.settings.sections.tools, icon: WrenchIcon },
      { id: "skills", label: t.settings.sections.skills, icon: SparklesIcon },
      { id: "mcp", label: "MCP Servers", icon: PlugIcon },
      { id: "apiKeys", label: "API Keys", icon: KeyIcon },
      { id: "soul", label: "Soul", icon: UserIcon },
      { id: "heartbeat", label: "Heartbeat", icon: HeartPulseIcon },
    ],
    [
      t.settings.sections.appearance,
      t.settings.sections.memory,
      t.settings.sections.tools,
      t.settings.sections.skills,
      t.settings.sections.notification,
      t.settings.sections.about,
    ],
  );
  return (
    <Dialog
      {...dialogProps}
      onOpenChange={(open) => props.onOpenChange?.(open)}
    >
      <DialogContent
        className="flex h-[75vh] max-h-[calc(100vh-2rem)] flex-col sm:max-w-5xl md:max-w-6xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="gap-1">
          <DialogTitle>{t.settings.title}</DialogTitle>
          <p className="text-muted-foreground text-sm">
            {t.settings.description}
          </p>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[220px_1fr]">
          <nav className="bg-sidebar min-h-0 overflow-y-auto rounded-lg border p-2">
            <ul className="space-y-1 pr-1">
              {sections.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(id as SettingsSection)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <ScrollArea className="h-full min-h-0 rounded-lg border">
            <div className="space-y-8 p-6">
              {activeSection === "appearance" && <AppearanceSettingsPage />}
              {activeSection === "memory" && <MemorySettingsPage />}
              {activeSection === "tools" && <ToolSettingsPage />}
              {activeSection === "skills" && (
                <SkillSettingsPage
                  onClose={() => props.onOpenChange?.(false)}
                />
              )}
              {activeSection === "notification" && <NotificationSettingsPage />}
              {activeSection === "apiKeys" && <ApiKeysSettingsPage />}
              {activeSection === "mcp" && <McpSettingsPage />}
              {activeSection === "soul" && <SoulSettingsSection />}
              {activeSection === "heartbeat" && <HeartbeatSettingsSection />}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
