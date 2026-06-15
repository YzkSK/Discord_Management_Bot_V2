import type { DbClient } from "@discord-bot/db";
import {
  getActiveTempVoiceChannelByChannelId,
  getGuildConfigByGuildId
} from "@discord-bot/db";
import { Events, type Client, type VoiceState } from "discord.js";
import { createVoiceEvent, type WriteEventFn } from "./payloads.js";

export function installVoiceGatewayLogHandlers(
  client: Client,
  write: WriteEventFn,
  db: DbClient
) {
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    void writeVoiceStateEvent(write, oldState, newState, db);
  });
}

export function shouldSkipVoiceStateLog(input: {
  eventName: string;
  memberIsBot: boolean;
}) {
  return (
    input.memberIsBot &&
    (input.eventName === "voice.session.join" ||
      input.eventName === "voice.session.leave")
  );
}

export function resolveVoiceStateLogEventName(
  oldState: Pick<VoiceState, "channelId">,
  newState: Pick<VoiceState, "channelId">
) {
  if (!oldState.channelId && newState.channelId) {
    return "voice.session.join";
  }

  if (oldState.channelId && !newState.channelId) {
    return "voice.session.leave";
  }

  if (oldState.channelId !== newState.channelId) {
    return "voice.session.move";
  }

  return "voice.state.update";
}

async function writeVoiceStateEvent(
  write: WriteEventFn,
  oldState: VoiceState,
  newState: VoiceState,
  db: DbClient
) {
  const eventName = resolveVoiceStateLogEventName(oldState, newState);

  if (
    shouldSkipVoiceStateLog({
      eventName,
      memberIsBot:
        oldState.member?.user.bot === true || newState.member?.user.bot === true
    })
  ) {
    return;
  }

  if (await shouldSuppressTempVoiceStateEvent(oldState, newState, db)) {
    return;
  }

  write(createVoiceEvent(eventName, oldState, newState));
}

async function shouldSuppressTempVoiceStateEvent(
  oldState: VoiceState,
  newState: VoiceState,
  db: DbClient
) {
  const config = await getGuildConfigByGuildId(db, newState.guild.id);

  if (!config?.tempVoiceCreateChannelId) {
    return false;
  }

  if (newState.channelId === config.tempVoiceCreateChannelId) {
    return true;
  }

  if (
    oldState.channelId === config.tempVoiceCreateChannelId &&
    newState.channelId
  ) {
    const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
      db,
      newState.channelId
    );

    return tempVoiceChannel !== null;
  }

  return false;
}
