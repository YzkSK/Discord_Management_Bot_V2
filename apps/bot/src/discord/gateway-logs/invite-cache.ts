import type { Guild, Invite } from "discord.js";

export interface CachedInvite {
  code: string;
  url: string;
  maxAge: number | null;
  maxUses: number | null;
  temporary: boolean | null;
  uses: number | null;
  inviterId: string | null;
}

type GuildInviteMap = Map<string, CachedInvite>;

function toCached(invite: Invite): CachedInvite {
  return {
    code: invite.code,
    url: invite.url,
    maxAge: invite.maxAge,
    maxUses: invite.maxUses,
    temporary: invite.temporary,
    uses: invite.uses,
    inviterId: invite.inviter?.id ?? null
  };
}

export function createInviteCache() {
  const cache = new Map<string, GuildInviteMap>();

  function getOrCreate(guildId: string): GuildInviteMap {
    let map = cache.get(guildId);
    if (!map) {
      map = new Map();
      cache.set(guildId, map);
    }
    return map;
  }

  async function initGuild(guild: Guild): Promise<void> {
    try {
      const invites = await guild.invites.fetch();
      const map = getOrCreate(guild.id);
      map.clear();
      for (const invite of invites.values()) {
        map.set(invite.code, toCached(invite));
      }
    } catch {
      // No MANAGE_GUILD permission — skip silently
    }
  }

  function set(guildId: string, invite: Invite): void {
    getOrCreate(guildId).set(invite.code, toCached(invite));
  }

  function getAndDelete(guildId: string, code: string): CachedInvite | null {
    const map = cache.get(guildId);
    if (!map) return null;
    const cached = map.get(code) ?? null;
    map.delete(code);
    return cached;
  }

  function detectUsed(
    guildId: string,
    currentInvites: Map<string, Invite>
  ): CachedInvite | null {
    const map = cache.get(guildId);
    if (!map) return null;

    for (const [code, cached] of map) {
      const current = currentInvites.get(code);
      if (current && current.uses !== null && cached.uses !== null && current.uses > cached.uses) {
        map.set(code, toCached(current));
        return cached;
      }
    }

    // Single-use invite: consumed and immediately deleted, no longer in current list
    for (const [code, cached] of map) {
      if (!currentInvites.has(code) && cached.maxUses === 1) {
        map.delete(code);
        return cached;
      }
    }

    return null;
  }

  return { initGuild, set, getAndDelete, detectUsed };
}

export type InviteCache = ReturnType<typeof createInviteCache>;
