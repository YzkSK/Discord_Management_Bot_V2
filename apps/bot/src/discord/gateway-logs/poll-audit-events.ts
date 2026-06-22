import {
  AuditLogEvent,
  Events,
  type Client,
  type PollAnswer
} from "discord.js";
import { createEvent, createGuildEvent, type WriteEventFn } from "./payloads.js";

// Skip audit_log.entry for actions that already have dedicated gateway event handlers
// (those handlers call writeWithAuditLog which already enriches the event with actor/reason)
const GATEWAY_COVERED_ACTIONS = new Set([
  AuditLogEvent.GuildUpdate,
  AuditLogEvent.ChannelCreate,
  AuditLogEvent.ChannelUpdate,
  AuditLogEvent.ChannelDelete,
  AuditLogEvent.ChannelOverwriteCreate,
  AuditLogEvent.ChannelOverwriteUpdate,
  AuditLogEvent.ChannelOverwriteDelete,
  AuditLogEvent.WebhookUpdate,
  AuditLogEvent.MemberKick,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
  AuditLogEvent.MemberUpdate,
  AuditLogEvent.MemberRoleUpdate,
  AuditLogEvent.RoleCreate,
  AuditLogEvent.RoleUpdate,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.InviteCreate,
  AuditLogEvent.InviteDelete,
  AuditLogEvent.EmojiCreate,
  AuditLogEvent.EmojiUpdate,
  AuditLogEvent.EmojiDelete,
  AuditLogEvent.StickerCreate,
  AuditLogEvent.StickerUpdate,
  AuditLogEvent.StickerDelete,
  AuditLogEvent.ThreadCreate,
  AuditLogEvent.ThreadUpdate,
  AuditLogEvent.ThreadDelete,
  AuditLogEvent.MemberMove,
]);

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
    if (GATEWAY_COVERED_ACTIONS.has(entry.action)) return;

    if (entry.action === AuditLogEvent.MessageDelete) {
      const extra = entry.extra as { channel: { id: string }; count: number } | null;
      write(
        createEvent("message.delete", {
          guildId: guild.id,
          actorId: entry.executorId,
          channelId: extra?.channel.id ?? null,
          messageId: null,
          payload: {
            content: null,
            attachments: [],
            createdTimestamp: null,
            partial: true,
            targetUserId: entry.targetId,
            count: extra?.count ?? null,
            reason: entry.reason
          }
        })
      );
      return;
    }

    if (entry.action === AuditLogEvent.MessageBulkDelete) {
      const extra = entry.extra as { count: number } | null;
      write(
        createEvent("message.bulk_delete", {
          guildId: guild.id,
          actorId: entry.executorId,
          channelId: entry.targetId,
          messageId: null,
          payload: {
            messageIds: [],
            count: extra?.count ?? null,
            reason: entry.reason
          }
        })
      );
      return;
    }

    const t = entry.target as Record<string, unknown> | null;
    const targetName =
      (typeof t?.["globalName"] === "string" ? t["globalName"] : null) ??
      (typeof t?.["username"] === "string" ? t["username"] : null) ??
      (typeof t?.["name"] === "string" ? t["name"] : null) ??
      null;
    write(
      createGuildEvent("audit_log.entry", guild, {
        id: entry.id,
        action: entry.action,
        targetId: entry.targetId,
        targetName,
        reason: entry.reason,
        changes: entry.changes
      }, entry.executorId)
    );
  });
}
