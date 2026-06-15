import { AuditLogEvent, Events, type Client } from "discord.js";
import { writeWithAuditLog } from "../audit-log.js";
import {
  createGuildEvent,
  diffRecord,
  emojiPayload,
  stickerPayload,
  type WriteEventFn
} from "./payloads.js";

export function installEmojiStickerGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.GuildEmojiCreate, (emoji) => {
    writeWithAuditLog(
      write,
      createGuildEvent("emoji.create", emoji.guild, { emoji: emojiPayload(emoji) }),
      emoji.guild,
      AuditLogEvent.EmojiCreate,
      emoji.id
    );
  });

  client.on(Events.GuildEmojiUpdate, (oldEmoji, newEmoji) => {
    writeWithAuditLog(
      write,
      createGuildEvent("emoji.update", newEmoji.guild, {
        before: emojiPayload(oldEmoji),
        after: emojiPayload(newEmoji),
        changes: diffRecord(emojiPayload(oldEmoji), emojiPayload(newEmoji))
      }),
      newEmoji.guild,
      AuditLogEvent.EmojiUpdate,
      newEmoji.id
    );
  });

  client.on(Events.GuildEmojiDelete, (emoji) => {
    writeWithAuditLog(
      write,
      createGuildEvent("emoji.delete", emoji.guild, { emoji: emojiPayload(emoji) }),
      emoji.guild,
      AuditLogEvent.EmojiDelete,
      emoji.id
    );
  });

  client.on(Events.GuildStickerCreate, (sticker) => {
    writeWithAuditLog(
      write,
      createGuildEvent("sticker.create", sticker.guild, { sticker: stickerPayload(sticker) }),
      sticker.guild,
      AuditLogEvent.StickerCreate,
      sticker.id
    );
  });

  client.on(Events.GuildStickerUpdate, (oldSticker, newSticker) => {
    writeWithAuditLog(
      write,
      createGuildEvent("sticker.update", newSticker.guild, {
        before: stickerPayload(oldSticker),
        after: stickerPayload(newSticker),
        changes: diffRecord(stickerPayload(oldSticker), stickerPayload(newSticker))
      }),
      newSticker.guild,
      AuditLogEvent.StickerUpdate,
      newSticker.id
    );
  });

  client.on(Events.GuildStickerDelete, (sticker) => {
    writeWithAuditLog(
      write,
      createGuildEvent("sticker.delete", sticker.guild, { sticker: stickerPayload(sticker) }),
      sticker.guild,
      AuditLogEvent.StickerDelete,
      sticker.id
    );
  });
}
