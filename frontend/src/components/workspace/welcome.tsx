"use client";

import { SettingsIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

import { AuroraText } from "../ui/aurora-text";

let waved = false;

const BACKEND_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_BASE_URL || ""
    : "";

function OnboardingBanner() {
  return (
    <div className="mx-auto mt-4 w-full max-w-2xl space-y-4 rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-6 text-left shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">
          👋 Welcome to DEEP CANVAS! Let&apos;s get you set up.
        </h3>
        <p className="text-muted-foreground text-sm">
          Tell me in the chat below and I&apos;ll configure everything for you,
          or go to{" "}
          <span className="bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium">
            <SettingsIcon className="size-3" /> Settings
          </span>{" "}
          to set things up manually.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <span className="mt-0.5 text-lg">🧠</span>
          <div>
            <p className="text-sm font-medium">1. Define your Soul</p>
            <p className="text-muted-foreground text-xs">
              Give me a name and personality — &quot;Call yourself Atlas, be
              direct and technical&quot; or configure in Settings → Soul
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <span className="mt-0.5 text-lg">💓</span>
          <div>
            <p className="text-sm font-medium">2. Enable Heartbeat</p>
            <p className="text-muted-foreground text-xs">
              Say &quot;turn on heartbeat&quot; so I keep working on tasks even
              when you&apos;re away, or toggle in Settings → Heartbeat
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <span className="mt-0.5 text-lg">💬</span>
          <div>
            <p className="text-sm font-medium">3. Connect Channels</p>
            <p className="text-muted-foreground text-xs">
              Say &quot;connect Telegram&quot; and provide your bot token, or
              add API keys in Settings → API Keys
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-xs italic">
        You can do all of this right here in the chat — just tell me what you
        want!
      </p>
    </div>
  );
}

export function Welcome({
  className,
  mode,
}: {
  className?: string;
  mode?: "ultra" | "pro" | "thinking" | "flash";
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const isUltra = useMemo(() => mode === "ultra", [mode]);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const colors = useMemo(() => {
    if (isUltra) {
      return ["#efefbb", "#e9c665", "#e3a812"];
    }
    return ["var(--color-foreground)"];
  }, [isUltra]);

  useEffect(() => {
    waved = true;
  }, []);

  // Check if SOUL exists — if not, show onboarding
  useEffect(() => {
    async function checkSoul() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/soul`);
        if (res.ok) {
          const data = await res.json();
          if (!data.exists) {
            setIsFirstRun(true);
          }
        } else {
          // 404 or other error = no soul configured = first run
          setIsFirstRun(true);
        }
      } catch {
        // Backend not up or network error — assume first run
        setIsFirstRun(true);
      }
    }
    checkSoul();
  }, []);

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col items-center justify-center gap-2 px-8 pt-4 pb-4 text-center",
        className,
      )}
    >
      {/* Only show greeting + description when NOT showing onboarding banner */}
      {!isFirstRun && (
        <>
          <div className="text-2xl font-bold">
            {searchParams.get("mode") === "skill" ? (
              `✨ ${t.welcome.createYourOwnSkill} ✨`
            ) : (
              <div className="flex items-center gap-2">
                <div className={cn("inline-block", !waved ? "animate-wave" : "")}>
                  {isUltra ? "🚀" : "👋"}
                </div>
                <AuroraText colors={colors}>{t.welcome.greeting}</AuroraText>
              </div>
            )}
          </div>
          {searchParams.get("mode") === "skill" ? (
            <div className="text-muted-foreground text-sm">
              {t.welcome.createYourOwnSkillDescription.includes("\n") ? (
                <pre className="font-sans whitespace-pre">
                  {t.welcome.createYourOwnSkillDescription}
                </pre>
              ) : (
                <p>{t.welcome.createYourOwnSkillDescription}</p>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              {t.welcome.description.includes("\n") ? (
                <pre className="whitespace-pre">{t.welcome.description}</pre>
              ) : (
                <p>{t.welcome.description}</p>
              )}
            </div>
          )}
        </>
      )}

      {/* First-run onboarding */}
      {isFirstRun && searchParams.get("mode") !== "skill" && (
        <OnboardingBanner />
      )}
    </div>
  );
}
