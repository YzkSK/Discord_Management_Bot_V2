"use client";

import * as Popover from "@radix-ui/react-popover";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import { detectBrowserLanguage, getDashboardLocale } from "../lib/locale";
import { fetchCachedDiscordUser, type CachedDiscordUser } from "./user-cache";

const UI_LANG_KEY = "dashboard-ui-lang";

interface UserMentionProps {
  userId: string;
  actorName: string | null;
}

export function UserMention({ userId, actorName }: UserMentionProps) {
  const [user, setUser] = useState<CachedDiscordUser | null>(null);
  const [loadingPopover, setLoadingPopover] = useState(false);
  const [loadingName, setLoadingName] = useState(actorName === null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  useEffect(() => {
    const lang = localStorage.getItem(UI_LANG_KEY);
    if (lang !== null && isGuildLanguage(lang)) setUiLang(lang);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const loc = getDashboardLocale(uiLang);

  useEffect(() => {
    if (actorName !== null) return;
    setLoadingName(true);
    fetchCachedDiscordUser(userId)
      .then((data) => setUser(data))
      .catch((e: unknown) => { console.warn("user-mention: name fetch failed", e); })
      .finally(() => setLoadingName(false));
  }, [userId, actorName]);

  async function handleOpenChange(open: boolean) {
    if (!open || user) return;
    setLoadingPopover(true);
    setError(false);
    try {
      const data = await fetchCachedDiscordUser(userId);
      setUser(data);
    } catch {
      setError(true);
    } finally {
      setLoadingPopover(false);
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const displayName = actorName ?? (user ? (user.globalName ?? user.username) : null);
  const label = loadingName ? "..." : (displayName ?? userId);

  return (
    <Popover.Root onOpenChange={(open) => void handleOpenChange(open)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex cursor-pointer items-center rounded bg-[#5865f2]/20 px-1 text-[#c9cdfb] hover:bg-[#5865f2]/30"
        >
          @{label}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-lg border border-[#3f4147] bg-[#383a40] p-3 shadow-xl"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
        >
          {loadingPopover && (
            <p className="text-xs text-[#b5bac1]">{loc.ttsLoading}</p>
          )}
          {error && !loadingPopover && (
            <p className="text-xs text-[#b5bac1]">{loc.panelDataLoadFailed}</p>
          )}
          {user && !loadingPopover && (
            <div className="flex gap-3">
              <img
                src={user.avatarUrl}
                alt={user.globalName ?? user.username}
                className="h-10 w-10 shrink-0 rounded-full"
                width={40}
                height={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#f2f3f5]">
                  {user.globalName ?? user.username}
                </p>
                <p className="text-xs text-[#b5bac1]">@{user.username}</p>
                <div className="mt-1 flex items-center gap-1">
                  <p className="truncate font-mono text-xs text-[#b5bac1]">
                    {user.id}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 text-[#b5bac1] hover:text-[#dbdee1]"
                    aria-label={loc.copyId}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {copied && (
                  <p className="mt-0.5 text-xs text-emerald-400">{loc.copied}</p>
                )}
              </div>
            </div>
          )}
          <Popover.Arrow className="fill-slate-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
