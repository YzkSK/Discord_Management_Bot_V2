import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  ComponentType,
  type Guild,
  type GuildBasedChannel,
  MessageFlags,
  ModalBuilder,
  type MessageCreateOptions,
  type MessageEditOptions,
  type ModalSubmitInteraction,
  OverwriteType,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type UserSelectMenuInteraction,
  UserSelectMenuBuilder
} from "discord.js";

import {
  getActiveTempVoiceChannelByChannelId,
  transferTempVoiceChannelOwner,
  type DbClient
} from "@discord-bot/db";
import { getLocale } from "@discord-bot/shared";

import { createComponentsV2TextMessage, EVENT_COLORS } from "./components-v2.js";
import { updateControlChannelOwnerPermissions } from "./temp-voice.js";
import { resolveGuildLocale } from "./resolve-locale.js";

type Loc = ReturnType<typeof getLocale>;

export type TempVoiceControlAction =
  | "rename"
  | "lock"
  | "unlock"
  | "hide"
  | "show"
  | "user-limit"
  | "user-management"
  | "user-management-select"
  | "kick-target"
  | "allow-target"
  | "deny-target"
  | "transfer-target";

export interface TempVoiceControlCustomId {
  action: TempVoiceControlAction;
  channelId: string;
  targetUserId?: string | null;
}

export interface TempVoiceControlContext {
  db: DbClient;
  getTempVoiceChannel?: (
    db: DbClient,
    channelId: string
  ) => Promise<{ channelId: string; ownerId: string; controlChannelId?: string | null } | null>;
}

const customIdPrefix = "temp-vc";
const DISCORD_CHANNEL_NAME_MAX_LENGTH = 100;
const tempVoiceControlActions = new Set<TempVoiceControlAction>([
  "rename",
  "lock",
  "unlock",
  "hide",
  "show",
  "user-limit",
  "user-management",
  "user-management-select",
  "kick-target",
  "allow-target",
  "deny-target",
  "transfer-target"
]);

export function toTempVoiceControlCustomId(input: TempVoiceControlCustomId) {
  const parts = [customIdPrefix, input.action, input.channelId];
  if (input.targetUserId) parts.push(input.targetUserId);
  return parts.join(":");
}

export function parseTempVoiceControlCustomId(customId: string) {
  const [prefix, action, channelId, targetUserId] = customId.split(":");

  if (
    prefix !== customIdPrefix ||
    !channelId ||
    !tempVoiceControlActions.has(action as TempVoiceControlAction)
  ) {
    return null;
  }

  return {
    action: action as TempVoiceControlAction,
    channelId,
    ...(targetUserId != null ? { targetUserId } : {})
  };
}

export function createTempVoiceControlMessage(
  input: {
    ownerId: string;
    tempVoiceChannelId: string;
    allowedUserIds?: string[];
    deniedUserIds?: string[];
    isLocked?: boolean;
    isHidden?: boolean;
  },
  loc: Loc
): MessageCreateOptions & MessageEditOptions {
  const { allowedUserIds = [], deniedUserIds = [] } = input;
  const isLocked = input.isLocked ?? false;
  const isHidden = input.isHidden ?? false;

  const statusLine = [
    isLocked ? loc.tempVcControlStatusLocked : loc.tempVcControlStatusOpen,
    isHidden ? loc.tempVcControlStatusHidden : loc.tempVcControlStatusVisible
  ].join("  ·  ");

  const hasPermissionInfo = allowedUserIds.length > 0 || deniedUserIds.length > 0;

  const infoLines = [
    loc.tempVcControlOwner({ ownerId: input.ownerId }),
    `VC: <#${input.tempVoiceChannelId}>`,
    statusLine
  ];

  if (hasPermissionInfo) {
    infoLines.push("​"); // zero-width space for spacing
  }

  const containerComponents: object[] = [
    { type: ComponentType.TextDisplay, content: loc.tempVcControlTitle },
    { type: ComponentType.TextDisplay, content: infoLines.join("\n") },
    { type: ComponentType.Separator }
  ];

  if (allowedUserIds.length > 0) {
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: loc.tempVcControlAllowList({ users: allowedUserIds.map(id => `<@${id}>`).join("  ") })
    });
  }

  if (deniedUserIds.length > 0) {
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: loc.tempVcControlDenyList({ users: deniedUserIds.map(id => `<@${id}>`).join("  ") })
    });
  }

  if (hasPermissionInfo) {
    containerComponents.push({ type: ComponentType.Separator });
  }

  const container = {
    type: ComponentType.Container,
    accent_color: EVENT_COLORS.blue,
    components: containerComponents
  };

  const channelId = input.tempVoiceChannelId;

  const firstRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    createButton(channelId, "rename", loc.tempVcControlButtonRename, ButtonStyle.Primary),
    ...(isLocked
      ? [createButton(channelId, "unlock", loc.tempVcControlButtonUnlock, ButtonStyle.Secondary)]
      : [createButton(channelId, "lock", loc.tempVcControlButtonLock, ButtonStyle.Secondary)]),
    ...(isHidden
      ? [createButton(channelId, "show", loc.tempVcControlButtonShow, ButtonStyle.Secondary)]
      : [createButton(channelId, "hide", loc.tempVcControlButtonHide, ButtonStyle.Secondary)])
  );

  const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    createButton(channelId, "user-limit", loc.tempVcControlButtonUserLimit, ButtonStyle.Secondary),
    createButton(channelId, "user-management", loc.tempVcControlButtonUserManagement, ButtonStyle.Secondary)
  );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container as unknown as ReturnType<typeof firstRow.toJSON>, firstRow, secondRow]
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

export function getTempVoiceState(channel: GuildBasedChannel) {
  if (!("permissionOverwrites" in channel)) {
    return { isLocked: false, isHidden: false };
  }
  const overwrites = (channel as { permissionOverwrites: { cache: Map<string, { type: number; deny: { has: (flag: bigint) => boolean } }> } }).permissionOverwrites.cache;
  const everyoneOverwrite = [...overwrites.values()].find(
    (o) => o.type === 0 // OverwriteType.Role = 0
  );
  return {
    isLocked: everyoneOverwrite?.deny.has(PermissionFlagsBits.Connect) ?? false,
    isHidden: everyoneOverwrite?.deny.has(PermissionFlagsBits.ViewChannel) ?? false
  };
}

function getChannelUserPermissions(channel: GuildBasedChannel & { isVoiceBased: () => true }) {
  const allowedUserIds: string[] = [];
  const deniedUserIds: string[] = [];

  if (!("permissionOverwrites" in channel)) return { allowedUserIds, deniedUserIds };

  const overwrites = (channel as { permissionOverwrites: { cache: Map<string, { type: number; allow: { has: (flag: bigint) => boolean }; deny: { has: (flag: bigint) => boolean } }> } }).permissionOverwrites.cache;

  for (const [id, overwrite] of overwrites) {
    if (overwrite.type !== OverwriteType.Member) continue;
    if (overwrite.allow.has(PermissionFlagsBits.Connect)) allowedUserIds.push(id);
    else if (overwrite.deny.has(PermissionFlagsBits.Connect)) deniedUserIds.push(id);
  }

  return { allowedUserIds, deniedUserIds };
}

async function updateControlPanel(
  guild: Guild,
  tempVoice: { channelId: string; controlChannelId?: string | null; ownerId: string },
  loc: Loc
) {
  if (!tempVoice.controlChannelId) return;

  const [voiceChannel, controlChannel] = await Promise.all([
    guild.channels.fetch(tempVoice.channelId).catch(() => null),
    guild.channels.fetch(tempVoice.controlChannelId).catch(() => null)
  ]);

  if (!isVoiceBasedChannel(voiceChannel) || !controlChannel?.isTextBased()) return;

  const { allowedUserIds, deniedUserIds } = getChannelUserPermissions(voiceChannel);
  const { isLocked, isHidden } = getTempVoiceState(voiceChannel);

  const messages = await controlChannel.messages.fetch({ limit: 10 }).catch(() => null);
  if (!messages) return;

  const renameCustomId = toTempVoiceControlCustomId({ action: "rename", channelId: tempVoice.channelId });
  const panelMessage = messages.find(msg =>
    msg.components.some(component =>
      "components" in component &&
      Array.isArray(component.components) &&
      component.components.some(
        (c: unknown) => typeof c === "object" && c !== null && "customId" in c && (c as { customId: string }).customId === renameCustomId
      )
    )
  );

  if (!panelMessage) return;

  await panelMessage.edit({
    ...createTempVoiceControlMessage({
      ownerId: tempVoice.ownerId,
      tempVoiceChannelId: tempVoice.channelId,
      allowedUserIds,
      deniedUserIds,
      isLocked,
      isHidden
    }, loc),
    allowedMentions: { parse: [] }
  });
}

export async function handleTempVoiceControlInteraction(
  interaction: ButtonInteraction | ModalSubmitInteraction | UserSelectMenuInteraction,
  context: TempVoiceControlContext
) {
  const parsed = parseTempVoiceControlCustomId(interaction.customId);

  if (!parsed) {
    return false;
  }

  const loc = await resolveGuildLocale(context.db, interaction.guildId);

  const getTempVoiceChannel =
    context.getTempVoiceChannel ?? getActiveTempVoiceChannelByChannelId;
  const tempVoiceChannel = await getTempVoiceChannel(context.db, parsed.channelId);

  if (!tempVoiceChannel) {
    await replyPrivate(interaction, "❌ Temp VC not found", [
      "This Temp VC no longer exists."
    ]);
    return true;
  }

  const guild = interaction.guild;

  if (!guild) {
    await replyPrivate(interaction, "❌ Temp VC not found", [
      "Temp VC controls can only be used in a server."
    ]);
    return true;
  }

  // User management select and target actions have their own auth
  const isUserManagementFlow =
    parsed.action === "user-management-select" ||
    parsed.action === "kick-target" ||
    parsed.action === "allow-target" ||
    parsed.action === "deny-target" ||
    parsed.action === "transfer-target";

  if (!isUserManagementFlow && interaction.user.id !== tempVoiceChannel.ownerId) {
    await replyPrivate(interaction, "❌ Temp VC control denied", [
      "Only the Temp VC owner can use these controls."
    ]);
    return true;
  }

  // User management button: show ephemeral UserSelectMenu
  if (parsed.action === "user-management" && "isButton" in interaction) {
    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "user-management-select", channelId: parsed.channelId }))
      .setPlaceholder(loc.tempVcUserMgmtPlaceholder)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.tempVcUserMgmtTitle,
        lines: [loc.tempVcUserMgmtPrompt],
        privateResponse: true
      }),
      components: [row]
    });
    return true;
  }

  // User management select: show action buttons
  if (parsed.action === "user-management-select" && "values" in interaction) {
    if (interaction.user.id !== tempVoiceChannel.ownerId) {
      await interaction.update(createEphemeralUpdate("❌ Temp VC control denied", ["Only the Temp VC owner can use these controls."]));
      return true;
    }

    const targetUserId = interaction.values[0];
    if (!targetUserId) return true;

    const kickBtn = new ButtonBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "kick-target", channelId: parsed.channelId, targetUserId }))
      .setLabel(loc.tempVcActionKick)
      .setStyle(ButtonStyle.Danger);

    const allowBtn = new ButtonBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "allow-target", channelId: parsed.channelId, targetUserId }))
      .setLabel(loc.tempVcActionAllow)
      .setStyle(ButtonStyle.Success);

    const denyBtn = new ButtonBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "deny-target", channelId: parsed.channelId, targetUserId }))
      .setLabel(loc.tempVcActionDeny)
      .setStyle(ButtonStyle.Secondary);

    const transferBtn = new ButtonBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "transfer-target", channelId: parsed.channelId, targetUserId }))
      .setLabel(loc.tempVcActionTransfer)
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(kickBtn, allowBtn, denyBtn, transferBtn);

    await interaction.update(
      createEphemeralUpdate(loc.tempVcUserMgmtTitle, [loc.tempVcUserMgmtActionFor({ userId: targetUserId })], [row])
    );
    return true;
  }

  // User-specific target actions
  if (parsed.targetUserId && "isButton" in interaction) {
    if (interaction.user.id !== tempVoiceChannel.ownerId) {
      await replyPrivate(interaction, "❌ Temp VC control denied", [
        "Only the Temp VC owner can use these controls."
      ]);
      return true;
    }

    const channel = await guild.channels.fetch(parsed.channelId).catch(() => null);

    if (!isVoiceBasedChannel(channel)) {
      await replyPrivate(interaction, "❌ Temp VC not found", [
        "The voice channel is no longer available."
      ]);
      return true;
    }

    if (parsed.action === "kick-target") {
      const member = await guild.members.fetch(parsed.targetUserId).catch(() => null);

      if (!member || member.voice.channelId !== parsed.channelId) {
        await replyPrivate(interaction, "❌ Kick failed", [
          "That member is not in this Temp VC."
        ]);
        return true;
      }

      await member.voice.disconnect("Temp VC owner kicked member.");
      await replyPrivate(interaction, loc.tempVcKickTitle, [loc.tempVcKickMessage({ userId: parsed.targetUserId })]);
      return true;
    }

    if (parsed.action === "allow-target") {
      const targetOw = channel.permissionOverwrites.cache.get(parsed.targetUserId);
      if (targetOw?.allow.has(PermissionFlagsBits.Connect)) {
        await replyPrivate(interaction, loc.tempVcAlreadyAllowedTitle, []);
        return true;
      }
      try {
        await channel.permissionOverwrites.edit(parsed.targetUserId, { Connect: true });
      } catch {
        await replyPrivate(interaction, loc.tempVcPermErrorTitle, [
          loc.tempVcPermErrorManageRolesLine1,
          loc.tempVcPermErrorManageRolesLine2
        ]);
        return true;
      }
      await replyPrivate(interaction, loc.tempVcAllowTitle, [
        loc.tempVcAllowMessage({ userId: parsed.targetUserId })
      ]);
      await updateControlPanel(guild, tempVoiceChannel, loc);
      return true;
    }

    if (parsed.action === "deny-target") {
      const targetOw = channel.permissionOverwrites.cache.get(parsed.targetUserId);
      if (targetOw?.deny.has(PermissionFlagsBits.Connect)) {
        await replyPrivate(interaction, loc.tempVcAlreadyDeniedTitle, []);
        return true;
      }
      try {
        await channel.permissionOverwrites.edit(parsed.targetUserId, { Connect: false });
      } catch {
        await replyPrivate(interaction, loc.tempVcPermErrorTitle, [
          loc.tempVcPermErrorManageRolesLine1,
          loc.tempVcPermErrorManageRolesLine2
        ]);
        return true;
      }
      await replyPrivate(interaction, loc.tempVcDenyTitle, [
        loc.tempVcDenyMessage({ userId: parsed.targetUserId })
      ]);
      await updateControlPanel(guild, tempVoiceChannel, loc);
      return true;
    }

    if (parsed.action === "transfer-target") {
      const targetMember = await guild.members.fetch(parsed.targetUserId).catch(() => null);
      if (!targetMember || targetMember.voice.channelId !== parsed.channelId) {
        await replyPrivate(interaction, loc.tempVcTransferNotInChannelTitle, [
          loc.tempVcTransferNotInChannelMessage
        ]);
        return true;
      }
      await transferTempVoiceChannelOwner(context.db, {
        channelId: parsed.channelId,
        ownerId: parsed.targetUserId
      });
      await updateControlChannelOwnerPermissions(guild, {
        controlChannelId: tempVoiceChannel.controlChannelId ?? null,
        nextOwnerId: parsed.targetUserId,
        previousOwnerId: tempVoiceChannel.ownerId
      }, loc);
      await replyPrivate(interaction, loc.tempVcTransferSuccessTitle, [
        loc.tempVcTransferSuccessMessage({ userId: parsed.targetUserId })
      ]);
      await updateControlPanel(guild, { ...tempVoiceChannel, ownerId: parsed.targetUserId }, loc);
      return true;
    }
  }

  // Channel-based actions (lock, unlock, hide, show, rename, user-limit)
  const channel = await guild.channels.fetch(parsed.channelId);

  if (!isVoiceBasedChannel(channel)) {
    await replyPrivate(interaction, "❌ Temp VC not found", [
      "The generated voice channel is no longer available."
    ]);
    return true;
  }

  if (parsed.action === "lock") {
    const eo = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    if (eo?.deny.has(PermissionFlagsBits.Connect)) {
      await replyPrivate(interaction, loc.tempVcAlreadyLockedTitle, []);
      return true;
    }
    const botId = interaction.client.user.id;
    try {
      const currentMemberIds = [...channel.members.keys()];
      await Promise.all([
        channel.permissionOverwrites.edit(botId, { Connect: true }),
        ...currentMemberIds.map((id) => channel.permissionOverwrites.edit(id, { Connect: true }))
      ]);
      await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false });
    } catch {
      await replyPermissionOverwriteError(interaction, loc);
      return true;
    }
    await replyPrivate(interaction, loc.tempVcLockSuccessTitle, [loc.tempVcLockSuccessMessage]);
    await updateControlPanel(guild, tempVoiceChannel, loc);
    return true;
  }

  if (parsed.action === "unlock") {
    const eo = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    if (!eo?.deny.has(PermissionFlagsBits.Connect)) {
      await replyPrivate(interaction, loc.tempVcAlreadyUnlockedTitle, []);
      return true;
    }
    const botId = interaction.client.user.id;
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: null });
      await channel.permissionOverwrites.edit(botId, { Connect: null }).catch(() => undefined);
    } catch {
      await replyPermissionOverwriteError(interaction, loc);
      return true;
    }
    await replyPrivate(interaction, loc.tempVcUnlockSuccessTitle, [loc.tempVcUnlockSuccessMessage]);
    await updateControlPanel(guild, tempVoiceChannel, loc);
    return true;
  }

  if (parsed.action === "hide") {
    const eo = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    if (eo?.deny.has(PermissionFlagsBits.ViewChannel)) {
      await replyPrivate(interaction, loc.tempVcAlreadyHiddenTitle, []);
      return true;
    }
    const botId = interaction.client.user.id;
    const currentMemberIds = [...channel.members.keys()];
    try {
      await Promise.all([
        channel.permissionOverwrites.edit(botId, { ViewChannel: true }),
        ...currentMemberIds.map((id) =>
          channel.permissionOverwrites.edit(id, { ViewChannel: true, Connect: true })
        ),
      ]);
      await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false });
    } catch {
      await replyPermissionOverwriteError(interaction, loc);
      return true;
    }
    await replyPrivate(interaction, loc.tempVcHideSuccessTitle, [loc.tempVcHideSuccessMessage]);
    await updateControlPanel(guild, tempVoiceChannel, loc);
    return true;
  }

  if (parsed.action === "show") {
    const eo = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    if (!eo?.deny.has(PermissionFlagsBits.ViewChannel)) {
      await replyPrivate(interaction, loc.tempVcAlreadyVisibleTitle, []);
      return true;
    }
    const botId = interaction.client.user.id;
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: null });
      await channel.permissionOverwrites.edit(botId, { ViewChannel: null }).catch(() => undefined);
    } catch {
      await replyPermissionOverwriteError(interaction, loc);
      return true;
    }
    await replyPrivate(interaction, loc.tempVcShowSuccessTitle, [loc.tempVcShowSuccessMessage]);
    await updateControlPanel(guild, tempVoiceChannel, loc);
    return true;
  }

  if (isFormAction(parsed.action) && "showModal" in interaction) {
    await interaction.showModal(createControlModal(parsed, loc));
    return true;
  }

  if ("fields" in interaction) {
    const value = interaction.fields.getTextInputValue("value").trim();

    if (parsed.action === "rename") {
      if (!value) {
        await replyPrivate(interaction, loc.tempVcRenameEmptyTitle, [loc.tempVcRenameEmptyMessage]);
        return true;
      }

      await channel.setName(value.slice(0, DISCORD_CHANNEL_NAME_MAX_LENGTH), "Temp VC owner renamed channel.");
      await replyPrivate(interaction, loc.tempVcRenameSuccessTitle, [loc.tempVcRenameSuccessMessage({ name: value })]);
      return true;
    }

    if (parsed.action === "user-limit") {
      const limit = parseBoundedInteger(value, 0, 99);

      if (limit === null) {
        await replyPrivate(interaction, loc.tempVcUserLimitInvalidTitle, [loc.tempVcUserLimitInvalidMessage]);
        return true;
      }

      await channel.setUserLimit(limit, "Temp VC owner changed user limit.");
      await replyPrivate(interaction, loc.tempVcUserLimitSuccessTitle, [loc.tempVcUserLimitSuccessMessage({ limit })]);
      return true;
    }
  }

  return true;
}

function isVoiceBasedChannel(
  channel: GuildBasedChannel | null | undefined
): channel is GuildBasedChannel & {
  isVoiceBased: () => true;
  permissionOverwrites: {
    cache: Map<string, { type: number; allow: { has: (f: bigint) => boolean }; deny: { has: (f: bigint) => boolean } }>;
    edit: (id: string, options: unknown) => Promise<unknown>;
  };
  setName: (name: string, reason?: string) => Promise<unknown>;
  setUserLimit: (limit: number, reason?: string) => Promise<unknown>;
} {
  return channel?.isVoiceBased() === true;
}

function createEphemeralUpdate(
  title: string,
  lines: string[],
  extraComponents: ActionRowBuilder<ButtonBuilder>[] = []
) {
  const msg = createComponentsV2TextMessage({ title, lines });
  return {
    components: [...(msg.components ?? []), ...extraComponents],
    flags: "IsComponentsV2" as const
  };
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

async function replyPermissionOverwriteError(
  interaction: ButtonInteraction | ModalSubmitInteraction | UserSelectMenuInteraction,
  loc: Loc
) {
  await replyPrivate(interaction, loc.tempVcChannelPermErrorTitle, [
    loc.tempVcChannelPermErrorMessage,
    loc.tempVcChannelPermErrorHint
  ]);
}

function isFormAction(action: TempVoiceControlAction) {
  return action === "rename" || action === "user-limit";
}

function createControlModal(input: TempVoiceControlCustomId, loc: Loc) {
  const modal = new ModalBuilder()
    .setCustomId(toTempVoiceControlCustomId(input))
    .setTitle(input.action === "rename" ? loc.tempVcModalRenameTitle : loc.tempVcModalUserLimitTitle);
  const textInput = new TextInputBuilder()
    .setCustomId("value")
    .setLabel(input.action === "rename" ? loc.tempVcModalRenameLabel : loc.tempVcModalUserLimitLabel)
    .setRequired(true)
    .setStyle(TextInputStyle.Short);
  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);

  return modal.addComponents(row);
}

function parseBoundedInteger(value: string, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}
