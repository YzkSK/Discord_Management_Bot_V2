import type { Message, PartialMessage } from "discord.js";

import type { NormalizedEvent } from "@discord-bot/shared";

type AnyMessage = Message | PartialMessage;

export function normalizeMessageCreate(message: Message): NormalizedEvent {
  return normalizeMessageEvent("message.create", message, message.createdAt);
}

export function normalizeMessageUpdate(
  oldMessage: AnyMessage,
  newMessage: AnyMessage
): NormalizedEvent {
  const eventTimestamp = newMessage.editedAt ?? newMessage.createdAt ?? new Date();

  return normalizeMessageEvent("message.update", newMessage, eventTimestamp, {
    oldContent: oldMessage.content ?? null,
    newContent: newMessage.content ?? null
  });
}

export function normalizeMessageDelete(message: AnyMessage): NormalizedEvent {
  return normalizeMessageEvent(
    "message.delete",
    message,
    message.createdAt ?? new Date()
  );
}

function normalizeMessageEvent(
  eventName: string,
  message: AnyMessage,
  eventTimestamp: Date,
  extraPayload: Record<string, unknown> = {}
): NormalizedEvent {
  return {
    eventName,
    eventTimestamp,
    receivedAt: new Date(),
    guildId: message.guildId,
    actorId: message.author?.id ?? null,
    channelId: message.channelId,
    messageId: message.id,
    payload: {
      content: message.content ?? null,
      createdTimestamp: message.createdTimestamp ?? null,
      partial: message.partial,
      ...extraPayload
    }
  };
}
