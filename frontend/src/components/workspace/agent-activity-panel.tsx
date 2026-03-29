"use client";

import {
  ActivityIcon,
  BotIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CirclePauseIcon,
  HeartPulseIcon,
  Loader2Icon,
  PlusIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const BACKEND_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_BASE_URL || ""
    : "";

interface SubAgent {
  sub_id: string;
  description: string;
  status: string;
  started_at: number;
}

interface ActiveRun {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  status: string;
  started_at: number;
  tool_calls: { tool: string; description: string; timestamp: number }[];
  sub_agents: SubAgent[];
}

interface HeartbeatInfo {
  enabled: boolean;
  running: boolean;
  active_thread_id: string | null;
  tick_count: number;
}

interface ActivityData {
  heartbeat: HeartbeatInfo;
  active_runs: ActiveRun[];
  recent_events: { type: string; timestamp: number; [key: string]: unknown }[];
  langgraph_connected: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    running: {
      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <Loader2Icon className="size-2.5 animate-spin" />,
      label: "Working",
    },
    completed: {
      color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      icon: <CircleCheckIcon className="size-2.5" />,
      label: "Done",
    },
    idle: {
      color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
      icon: <CirclePauseIcon className="size-2.5" />,
      label: "Idle",
    },
    error: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <CircleDotIcon className="size-2.5" />,
      label: "Error",
    },
  };
  const c = config[status] || config.idle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        c.color,
      )}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

function HeartbeatSection({ heartbeat }: { heartbeat: HeartbeatInfo }) {
  return (
    <div className="rounded-lg border border-dashed border-border/50 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <HeartPulseIcon
          className={cn(
            "size-3",
            heartbeat.enabled
              ? heartbeat.running
                ? "text-emerald-400 animate-pulse"
                : "text-amber-400"
              : "text-zinc-500",
          )}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Heartbeat
        </span>
        <span
          className={cn(
            "ml-auto text-[9px] font-medium",
            heartbeat.enabled ? "text-emerald-400" : "text-zinc-500",
          )}
        >
          {heartbeat.enabled ? (heartbeat.running ? "ACTIVE" : "ENABLED") : "OFF"}
        </span>
      </div>
      {heartbeat.enabled && (
        <div className="space-y-0.5 text-[10px] text-muted-foreground">
          {heartbeat.running && (
            <div className="flex items-center gap-1">
              <ZapIcon className="size-2.5 text-amber-400" />
              <span>Tick #{heartbeat.tick_count}</span>
            </div>
          )}
          {heartbeat.active_thread_id && (
            <div className="truncate opacity-60">
              Thread: {heartbeat.active_thread_id.slice(0, 8)}...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RunCard({ run }: { run: ActiveRun }) {
  const [expanded, setExpanded] = useState(true);
  const elapsed = Math.round((Date.now() / 1000 - run.started_at));
  const lastTool = run.tool_calls[run.tool_calls.length - 1];

  return (
    <div className="rounded-lg border bg-card/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDownIcon className="size-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRightIcon className="size-3 text-muted-foreground shrink-0" />
        )}
        <BotIcon className="size-3.5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium truncate block">
            {run.assistant_id === "agent" ? "Lead Agent" : run.assistant_id}
          </span>
        </div>
        <StatusBadge status={run.status} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-2.5 py-2 space-y-1.5">
          {/* Active tool */}
          {lastTool && run.status === "running" && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <WrenchIcon className="size-2.5 text-amber-400 shrink-0" />
              <span className="text-muted-foreground truncate">
                {lastTool.tool}
                {lastTool.description && `: ${lastTool.description}`}
              </span>
            </div>
          )}

          {/* Sub-agents */}
          {run.sub_agents.length > 0 && (
            <div className="space-y-1 pl-1">
              {run.sub_agents.map((sub) => (
                <div
                  key={sub.sub_id}
                  className="flex items-center gap-1.5 text-[10px]"
                >
                  <div
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      sub.status === "running"
                        ? "bg-emerald-400 animate-pulse"
                        : sub.status === "completed"
                          ? "bg-blue-400"
                          : "bg-zinc-400",
                    )}
                  />
                  <span className="text-muted-foreground truncate flex-1">
                    {sub.description || sub.sub_id.slice(0, 8)}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-medium",
                      sub.status === "running"
                        ? "text-emerald-400"
                        : sub.status === "completed"
                          ? "text-blue-400"
                          : "text-zinc-400",
                    )}
                  >
                    {sub.status === "running" ? "⟳" : sub.status === "completed" ? "✓" : "·"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Elapsed time */}
          {run.status === "running" && elapsed > 0 && (
            <div className="text-[9px] text-muted-foreground/60">
              Running for {elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecentActivity({ events }: { events: { type: string; timestamp: number; [key: string]: unknown }[] }) {
  if (events.length === 0) return null;

  const last5 = events.slice(-5).reverse();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 px-1">
        <ActivityIcon className="size-2.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent
        </span>
      </div>
      <div className="space-y-0.5">
        {last5.map((evt, i) => {
          const age = Math.round(Date.now() / 1000 - evt.timestamp);
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground/70"
            >
              <span className="size-1 rounded-full bg-current shrink-0 opacity-40" />
              <span className="truncate flex-1">
                {evt.type === "tool_call"
                  ? `Tool: ${evt.tool as string}`
                  : evt.type === "run_start"
                    ? "Run started"
                    : evt.type === "run_end"
                      ? `Run ${evt.status as string}`
                      : evt.type === "sub_agent"
                        ? `Sub: ${evt.description as string}`
                        : evt.type}
              </span>
              <span className="text-[9px] opacity-50 shrink-0">
                {age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentActivityPanel() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent-activity/status`);
      if (res.ok) {
        setData(await res.json());
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  const hasActiveRuns = data?.active_runs && data.active_runs.length > 0;

  return (
    <div className="flex flex-col gap-2 px-2 pt-1">
      {/* Header with + button */}
      <div className="flex items-center justify-between px-1">
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
          Agent Activity
        </span>
        <Link
          href="/workspace/agents/new"
          title="New Agent"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition-colors"
        >
          <PlusIcon className="size-3.5" />
        </Link>
      </div>

      {/* Connection status */}
      {error ? (
        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-destructive/30 py-3">
          <CircleDotIcon className="size-3 text-destructive" />
          <span className="text-[10px] text-destructive">Gateway offline</span>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center py-6">
          <Loader2Icon className="size-4 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Heartbeat status */}
          <HeartbeatSection heartbeat={data.heartbeat} />

          {/* Active runs */}
          {hasActiveRuns ? (
            <div className="space-y-1.5">
              {data.active_runs.map((run) => (
                <RunCard key={run.run_id} run={run} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 py-4 text-center">
              <div className="relative">
                <BotIcon className="size-7 text-muted-foreground/20" />
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-zinc-500 border-2 border-background" />
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                No active agents
              </p>
              <p className="text-[9px] text-muted-foreground/40">
                Activity will appear here when agents work
              </p>
            </div>
          )}

          {/* Recent events */}
          <RecentActivity events={data.recent_events} />

          {/* LangGraph connection */}
          <div className="flex items-center gap-1.5 px-1 pt-1 border-t">
            <span
              className={cn(
                "size-1.5 rounded-full",
                data.langgraph_connected ? "bg-emerald-400" : "bg-zinc-500",
              )}
            />
            <span className="text-[9px] text-muted-foreground/50">
              LangGraph {data.langgraph_connected ? "connected" : "disconnected"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
