import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type GuildBasedChannel,
  ModalBuilder,
  type ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  type UserSelectMenuInteraction,
  UserSelectMenuBuilder,
  type MessageCreateOptions
} from "discord.js";

import {
  getActiveTempVoiceChannelByChannelId,
  type DbClient
} from "@discord-bot/db";

import { createComponentsV2TextMessage } from "./components-v2.js";

export type TempVoiceControlAction =
  | "rename"
  | "lock"
  | "unlock"
  | "hide"
  | "show"
  | "user-limit"
  | "bitrate"
  | "kick";

export interface TempVoiceControlCustomId {
  action: TempVoiceControlAction;
  channelId: string;
}

export interface TempVoiceControlContext {
  db: DbClient;
  getTempVoiceChannel?: (
    db: DbClient,
    channelId: string
  ) => Promise<{ channelId: string; ownerId: string } | null>;
}

const customIdPrefix = "temp-vc";
const tempVoiceControlActions = new Set<TempVoiceControlAction>([
  "rename",
  "lock",
  "unlock",
  "hide",
  "show",
  "user-limit",
  "bitrate",
  "kick"
]);

export function toTempVoiceControlCustomId(input: TempVoiceControlCustomId) {
  return [customIdPrefix, input.action, input.channelId].join(":");
}

export function parseTempVoiceControlCustomId(customId: string) {
  const [prefix, action, channelId] = customId.split(":");

  if (
    prefix !== customIdPrefix ||
    !channelId ||
    !tempVoiceControlActions.has(action as TempVoiceControlAction)
  ) {
    return null;
  }

  return {
    action: action as TempVoiceControlAction,
    channelId
  };
}

export function createTempVoiceControlMessage(input: {
  ownerId: string;
  tempVoiceChannelId: string;
}): MessageCreateOptions {
  const message = createComponentsV2TextMessage({
    title: "Temp VC Control",
    lines: [
      `Owner: <@${input.ownerId}>`,
      `Voice channel: <#${input.tempVoiceChannelId}>`
    ]
  });
  const firstRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    createButton(input.tempVoiceChannelId, "rename", "Rename", ButtonStyle.Primary),
    createButton(input.tempVoiceChannelId, "lock", "Lock", ButtonStyle.Secondary),
    createButton(input.tempVoiceChannelId, "unlock", "Unlock", ButtonStyle.Secondary),
    createButton(input.tempVoiceChannelId, "hide", "Hide", ButtonStyle.Secondary),
    createButton(input.tempVoiceChannelId, "show", "Show", ButtonStyle.Secondary)
  );
  const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    createButton(input.tempVoiceChannelId, "user-limit", "User limit", ButtonStyle.Secondary),
    createButton(input.tempVoiceChannelId, "bitrate", "Bitrate", ButtonStyle.Secondary)
  );
  const kickRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(
        toTempVoiceControlCustomId({
          action: "kick",
          channelId: input.tempVoiceChannelId
        })
      )
      .setMaxValues(1)
      .setMinValues(1)
      .setPlaceholder("Kick a member")
  );

  return {
    ...message,
    components: [...(message.components ?? []), firstRow, secondRow, kickRow]
  };
}

function createButton(
  channelId: string,
  action: TempVoiceControlAction,
  label: string,
  style: ButtonStyle
) {
  return new ButtonBuilder()
    .setCustomId(toTempVoiceControlCustomId({ action, channelId }))
    .setLabel(label)
    .setStyle(style);
}

export async function handleTempVoiceControlInteraction(
  interaction: ButtonInteraction | ModalSubmitInteraction | UserSelectMenuInteraction,
  context: TempVoiceControlContext
) {
  const parsed = parseTempVoiceControlCustomId(interaction.customId);

  if (!parsed) {
    return false;
  }

  const getTempVoiceChannel =
    context.getTempVoiceChannel ?? getActiveTempVoiceChannelByChannelId;
  const tempVoiceChannel = await getTempVoiceChannel(context.db, parsed.channelId);

  if (!tempVoiceChannel) {
    await replyPrivate(interaction, "Temp VC not found", [
      "This Temp VC no longer exists."
    ]);
    return true;
  }

  if (interaction.user.id !== tempVoiceChannel.ownerId) {
    await replyPrivate(interaction, "Temp VC control denied", [
      "Only the Temp VC owner can use these controls."
    ]);
    return true;
  }

  const guild = interaction.guild;

  if (!guild) {
    await replyPrivate(interaction, "Temp VC not found", [
      "Temp VC controls can only be used in a server."
    ]);
    return true;
  }

  const channel = await guild.channels.fetch(parsed.channelId);

  if (!isVoiceBasedChannel(channel)) {
    await replyPrivate(interaction, "Temp VC not found", [
      "The generated voice channel is no longer available."
    ]);
    return true;
  }

  if (parsed.action === "lock") {
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
      Connect: false
    });
    await replyPrivate(interaction, "Temp VC locked", [
      "New members can no longer connect."
    ]);
    return true;
  }

  if (parsed.action === "unlock") {
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
      Connect: null
    });
    await replyPrivate(interaction, "Temp VC unlocked", [
      "New members can connect again."
    ]);
    return true;
  }

  if (parsed.action === "hide") {
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
      ViewChannel: false
    });
    await replyPrivate(interaction, "Temp VC hidden", [
      "The channel is hidden from everyone."
    ]);
    return true;
  }

  if (parsed.action === "show") {
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
      ViewChannel: null
    });
    await replyPrivate(interaction, "Temp VC shown", [
      "The channel is visible again."
    ]);
    return true;
  }

  if (isFormAction(parsed.action) && "showModal" in interaction) {
    await interaction.showModal(createControlModal(parsed));
    return true;
  }

  if ("fields" in interaction) {
    const value = interaction.fields.getTextInputValue("value").trim();

    if (parsed.action === "rename") {
      if (!value) {
        await replyPrivate(interaction, "Temp VC rename failed", [
          "Channel name is required."
        ]);
        return true;
      }

      await channel.setName(value.slice(0, 100), "Temp VC owner renamed channel.");
      await replyPrivate(interaction, "Temp VC renamed", [`New name: ${value}`]);
      return true;
    }

    if (parsed.action === "user-limit") {
      const limit = parseBoundedInteger(value, 0, 99);

      if (limit === null) {
        await replyPrivate(interaction, "Temp VC user limit failed", [
          "User limit must be a number from 0 to 99."
        ]);
        return true;
      }

      await channel.setUserLimit(limit, "Temp VC owner changed user limit.");
      await replyPrivate(interaction, "Temp VC user limit updated", [
        `User limit: ${limit}`
      ]);
      return true;
    }

    if (parsed.action === "bitrate") {
      const bitrateKbps = parseBoundedInteger(value, 8, 384);

      if (bitrateKbps === null) {
        await replyPrivate(interaction, "Temp VC bitrate failed", [
          "Bitrate must be a number from 8 to 384 kbps."
        ]);
        return true;
      }

      await channel.setBitrate(
        bitrateKbps * 1000,
        "Temp VC owner changed bitrate."
      );
      await replyPrivate(interaction, "Temp VC bitrate updated", [
        `Bitrate: ${bitrateKbps} kbps`
      ]);
      return true;
    }
  }

  if (parsed.action === "kick" && "values" in interaction) {
    const targetUserId = interaction.values[0];

    if (!targetUserId) {
      await replyPrivate(interaction, "Temp VC kick failed", [
        "Select a member to kick."
      ]);
      return true;
    }

    const member = await guild.members.fetch(targetUserId).catch(() => null);

    if (!member || member.voice.channelId !== parsed.channelId) {
      await replyPrivate(interaction, "Temp VC kick failed", [
        "That member is not in this Temp VC."
      ]);
      return true;
    }

    await member.voice.disconnect("Temp VC owner kicked member.");
    await replyPrivate(interaction, "Temp VC member kicked", [
      `Kicked <@${targetUserId}>.`
    ]);
    return true;
  }

  await replyPrivate(interaction, "Temp VC control", [
    "This control will open a form in the next step."
  ]);
  return true;
}

function isVoiceBasedChannel(
  channel: GuildBasedChannel | null | undefined
): channel is GuildBasedChannel & {
  isVoiceBased: () => true;
  permissionOverwrites: {
    edit: (id: string, options: unknown) => Promise<unknown>;
  };
  setBitrate: (bitrate: number, reason?: string) => Promise<unknown>;
  setName: (name: string, reason?: string) => Promise<unknown>;
  setUserLimit: (limit: number, reason?: string) => Promise<unknown>;
} {
  return channel?.isVoiceBased() === true;
}

async function replyPrivate(
  interaction: ButtonInteraction | ModalSubmitInteraction | UserSelectMenuInteraction,
  title: string,
  lines: string[]
) {
  await interaction.reply({
    ...createComponentsV2TextMessage({
      title,
      lines,
      privateResponse: true
    })
  });
}

function isFormAction(action: TempVoiceControlAction) {
  return action === "rename" || action === "user-limit" || action === "bitrate";
}

function createControlModal(input: TempVoiceControlCustomId) {
  const modal = new ModalBuilder()
    .setCustomId(toTempVoiceControlCustomId(input))
    .setTitle(controlModalTitle(input.action));
  const textInput = new TextInputBuilder()
    .setCustomId("value")
    .setLabel(controlModalLabel(input.action))
    .setRequired(true)
    .setStyle(TextInputStyle.Short);
  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);

  return modal.addComponents(row);
}

function controlModalTitle(action: TempVoiceControlAction) {
  if (action === "rename") {
    return "Rename Temp VC";
  }

  if (action === "user-limit") {
    return "Set Temp VC user limit";
  }

  return "Set Temp VC bitrate";
}

function controlModalLabel(action: TempVoiceControlAction) {
  if (action === "rename") {
    return "New channel name";
  }

  if (action === "user-limit") {
    return "User limit, 0-99";
  }

  return "Bitrate in kbps, 8-384";
}

function parseBoundedInteger(value: string, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}
