"use client";

import * as Popover from "@radix-ui/react-popover";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchCachedDiscordUser, type CachedDiscordUser } from "./user-cache";

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

  useEffect(() => {
    if (actorName !== null) return;
    setLoadingName(true);
    fetchCachedDiscordUser(userId)
      .then((data) => setUser(data))
      .catch(() => {})
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
          className="inline-flex cursor-pointer items-center rounded bg-indigo-500/20 px-1 text-indigo-300 hover:bg-indigo-500/30"
        >
          @{label}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-800 p-3 shadow-xl"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
        >
          {loadingPopover && (
            <p className="text-xs text-zinc-500">読み込み中...</p>
          )}
          {error && !loadingPopover && (
            <p className="text-xs text-zinc-500">情報を取得できませんでした</p>
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
                <p className="truncate text-sm font-semibold text-zinc-100">
                  {user.globalName ?? user.username}
                </p>
                <p className="text-xs text-zinc-400">@{user.username}</p>
                <div className="mt-1 flex items-center gap-1">
                  <p className="truncate font-mono text-xs text-zinc-500">
                    {user.id}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 text-zinc-500 hover:text-zinc-300"
                    aria-label="IDをコピー"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {copied && (
                  <p className="mt-0.5 text-xs text-green-400">コピーしました</p>
                )}
              </div>
            </div>
          )}
          <Popover.Arrow className="fill-zinc-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
