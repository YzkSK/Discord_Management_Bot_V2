import { upsertDiscordChannel } from "@discord-bot/db";
import { Events, type Client } from "discord.js";

import type { DbClient } from "@discord-bot/db";

export function installChannelNameHandlers(client: Client, db: DbClient) {
  // 誰かが VC に参加/退出するたびにチャンネル名をキャプチャ
  client.on(Events.VoiceStateUpdate, (_oldState, newState) => {
    const channel = newState.channel;
    if (!channel || !("name" in channel) || typeof channel.name !== "string") {
      return;
    }
    void upsertDiscordChannel(db, {
      channelId: channel.id,
      guildId: newState.guild.id,
      name: channel.name
    }).catch((error: unknown) => {
      console.warn("failed to upsert channel name on voice update", error);
    });
  });

  // チャンネルがリネームされたときに更新
  client.on(Events.ChannelUpdate, (_oldChannel, newChannel) => {
    if (
      !("guildId" in newChannel) ||
      !("name" in newChannel) ||
      typeof newChannel.name !== "string" ||
      typeof newChannel.guildId !== "string"
    ) {
      return;
    }
    void upsertDiscordChannel(db, {
      channelId: newChannel.id,
      guildId: newChannel.guildId,
      name: newChannel.name
    }).catch((error: unknown) => {
      console.warn("failed to upsert channel name on channel update", error);
    });
  });
}
