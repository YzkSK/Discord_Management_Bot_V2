import { type DbClient, upsertDiscordChannel } from "@discord-bot/db";
import type { VoiceBasedChannel } from "discord.js";
import { Events, type Client } from "discord.js";

export function installChannelNameHandlers(client: Client, db: DbClient) {
  // 誰かが VC に参加/退出するたびに新旧両チャンネル名をキャプチャ
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    for (const channel of [oldState.channel, newState.channel] as Array<VoiceBasedChannel | null>) {
      if (!channel || typeof channel.name !== "string") continue;
      void upsertDiscordChannel(db, {
        channelId: channel.id,
        guildId: channel.guild.id,
        name: channel.name
      }).catch((error: unknown) => {
        console.warn("failed to upsert channel name on voice update", error);
      });
    }
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
