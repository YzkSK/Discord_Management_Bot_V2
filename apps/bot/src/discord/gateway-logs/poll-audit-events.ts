import {
  Events,
  type Client,
  type PollAnswer
} from "discord.js";
import { createGuildEvent, userPayload, type WriteEventFn } from "./payloads.js";

export function installPollAuditGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.MessagePollVoteAdd, (answer, userId) => {
    const poll = (answer as PollAnswer).poll;
    const message = poll?.message;
    write(
      createGuildEvent("message.poll.vote", message?.inGuild() ? message.guild : null, {
        messageId: message?.id ?? null,
        channelId: message?.channelId ?? null,
        answerId: answer.id,
        userId
      }, userId)
    );
  });

  client.on(Events.MessagePollVoteRemove, (answer, userId) => {
    const poll = (answer as PollAnswer).poll;
    const message = poll?.message;
    write(
      createGuildEvent("message.poll.unvote", message?.inGuild() ? message.guild : null, {
        messageId: message?.id ?? null,
        channelId: message?.channelId ?? null,
        answerId: answer.id,
        userId
      }, userId)
    );
  });

  client.on(Events.GuildAuditLogEntryCreate, (entry, guild) => {
    write(
      createGuildEvent("audit_log.entry", guild, {
        id: entry.id,
        action: entry.action,
        targetId: entry.targetId,
        reason: entry.reason,
        changes: entry.changes
      }, entry.executorId)
    );
  });
}
