import { AuditLogEvent, Events, type Client } from "discord.js";
import { getChannelGuild, writeWithAuditLog } from "../audit-log.js";
import {
  channelPayload,
  createChannelEvent,
  createReactionEvent,
  type WriteEventFn
} from "./payloads.js";

export function installMessageGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.MessageReactionAdd, (reaction, user) => {
    if (user.bot) {
      return;
    }

    write(
      createReactionEvent(
        "message.reaction.add",
        reaction.message,
        user,
        reaction.emoji.toString()
      )
    );
  });

  client.on(Events.MessageReactionRemove, (reaction, user) => {
    if (user.bot) {
      return;
    }

    write(
      createReactionEvent(
        "message.reaction.remove",
        reaction.message,
        user,
        reaction.emoji.toString()
      )
    );
  });

  client.on(Events.MessageBulkDelete, (messages, channel) => {
    writeWithAuditLog(
      write,
      createChannelEvent("message.bulk_delete", channel, {
        channel: channelPayload(channel),
        messageIds: [...messages.keys()],
        count: messages.size
      }),
      getChannelGuild(channel),
      AuditLogEvent.MessageBulkDelete,
      channel.id
    );
  });
}
