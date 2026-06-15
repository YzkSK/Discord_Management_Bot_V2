import {
  AuditLogEvent,
  Events,
  type Client,
  type DMChannel,
  type GuildTextBasedChannel,
  type NonThreadGuildBasedChannel
} from "discord.js";
import {
  applyAuditLog,
  getChannelGuild,
  lookupAuditLog,
  writeWithAuditLog
} from "../audit-log.js";
import {
  isTempVoiceAuditReason,
  shouldSuppressTempVoiceChannelLog
} from "../temp-voice-log-suppression.js";
import {
  channelPayload,
  createChannelEvent,
  diffRecord,
  type WriteEventFn
} from "./payloads.js";

export function installChannelGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.ChannelCreate, (channel) => {
    writeChannelLifecycleEvent(write, "channel.create", channel, AuditLogEvent.ChannelCreate);
  });

  client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
    writeWithAuditLog(
      write,
      createChannelEvent("channel.update", newChannel, {
        before: channelPayload(oldChannel),
        after: channelPayload(newChannel),
        changes: diffRecord(channelPayload(oldChannel), channelPayload(newChannel))
      }),
      getChannelGuild(newChannel),
      AuditLogEvent.ChannelUpdate,
      newChannel.id
    );
  });

  client.on(Events.ChannelDelete, (channel) => {
    writeChannelLifecycleEvent(write, "channel.delete", channel, AuditLogEvent.ChannelDelete);
  });

  client.on(Events.WebhooksUpdate, (channel) => {
    writeWithAuditLog(
      write,
      createChannelEvent("webhook.update", channel, { channel: channelPayload(channel) }),
      getChannelGuild(channel),
      AuditLogEvent.WebhookUpdate,
      channel.id
    );
  });
}

function writeChannelLifecycleEvent(
  write: WriteEventFn,
  eventName: "channel.create" | "channel.delete",
  channel: DMChannel | GuildTextBasedChannel | NonThreadGuildBasedChannel,
  action: AuditLogEvent.ChannelCreate | AuditLogEvent.ChannelDelete
) {
  if (shouldSuppressTempVoiceChannelLog(channel.id)) {
    return;
  }

  const event = createChannelEvent(eventName, channel, {
    channel: channelPayload(channel)
  });
  const guild = getChannelGuild(channel);

  void Promise.resolve()
    .then(() => lookupAuditLog(guild, action, channel.id))
    .then((auditLog) => {
      if (isTempVoiceAuditReason(auditLog.reason)) {
        return;
      }

      write(applyAuditLog(event, auditLog));
    })
    .catch((error: unknown) => {
      console.warn("failed to enrich channel lifecycle log event", {
        eventName,
        guildId: event.guildId,
        error
      });
      write(event);
    });
}
