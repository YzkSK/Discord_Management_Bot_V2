"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import { Input } from "../../components/ui/input";
import { dashboardGuildStorageKey } from "../dashboard-ui";

const GUILD_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

interface GuildItem {
  id: string;
  name: string;
}

export function GuildSelector() {
  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guilds", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const data = (await r.json()) as { guilds: GuildItem[] };
        setGuilds(data.guilds);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load guilds.");
      })
      .finally(() => setLoading(false));
  }, []);

  function selectGuild(guild: GuildItem) {
    document.cookie = `dashboard-guild-id=${guild.id}; path=/; max-age=${GUILD_COOKIE_MAX_AGE_SEC}`;
    document.cookie = `dashboard-guild-name=${encodeURIComponent(guild.name)}; path=/; max-age=${GUILD_COOKIE_MAX_AGE_SEC}`;
    localStorage.setItem(dashboardGuildStorageKey, guild.id);
    window.location.href = "/";
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading guilds...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  const filtered =
    search.trim() === ""
      ? guilds
      : guilds.filter(
          (g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.id.includes(search)
        );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <Input
          className="pl-9"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID"
          value={search}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">No guilds found.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((guild) => (
            <button
              className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition-colors hover:border-green-500/40 hover:bg-zinc-800"
              key={guild.id}
              onClick={() => selectGuild(guild)}
              type="button"
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">{guild.name}</p>
                <p className="font-mono text-xs text-zinc-500">{guild.id}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
