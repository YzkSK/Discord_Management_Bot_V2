"use client";

import * as Popover from "@radix-ui/react-popover";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchCachedDiscordChannel, type CachedDiscordChannel } from "./channel-cache";

interface ChannelMentionProps {
  channelId: string;
  channelName: string | null;
  guildId?: string;
}

function looksLikeId(name: string): boolean {
  return /^\d{17,20}$/.test(name);
}

export function ChannelMention({ channelId, channelName, guildId }: ChannelMentionProps) {
  const [channel, setChannel] = useState<CachedDiscordChannel | null>(null);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPopover, setLoadingPopover] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const knownName = channelName && !looksLikeId(channelName) ? channelName : null;

  useEffect(() => {
    if (knownName) return;
    setLoadingName(true);
    fetchCachedDiscordChannel(channelId, guildId)
      .then(setChannel)
      .catch(() => {})
      .finally(() => setLoadingName(false));
  }, [channelId, knownName, guildId]);

  async function handleOpenChange(open: boolean) {
    if (!open || channel) return;
    setLoadingPopover(true);
    setError(false);
    try {
      const data = await fetchCachedDiscordChannel(channelId, guildId);
      setChannel(data);
    } catch {
      setError(true);
    } finally {
      setLoadingPopover(false);
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(channelId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const displayName = loadingName ? "..." : (knownName ?? channel?.name ?? `${channelId.slice(0, 8)}…`);

  return (
    <Popover.Root onOpenChange={(open) => void handleOpenChange(open)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex cursor-pointer items-center rounded bg-sky-500/20 px-1 text-sky-300 hover:bg-sky-500/30"
        >
          #{displayName}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-56 rounded-lg border border-[#3f4147] bg-[#383a40] p-3 shadow-xl"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
        >
          {loadingPopover && (
            <p className="text-xs text-[#b5bac1]">読み込み中...</p>
          )}
          {error && !loadingPopover && (
            <p className="text-xs text-[#b5bac1]">情報を取得できませんでした</p>
          )}
          {channel && !loadingPopover && (
            <div>
              <p className="truncate text-sm font-semibold text-[#f2f3f5]">
                #{channel.name}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <p className="truncate font-mono text-xs text-[#b5bac1]">
                  {channel.id}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 text-[#b5bac1] hover:text-[#dbdee1]"
                  aria-label="IDをコピー"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {copied && (
                <p className="mt-0.5 text-xs text-emerald-400">コピーしました</p>
              )}
            </div>
          )}
          <Popover.Arrow className="fill-slate-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
