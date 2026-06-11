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

import { createComponentsV2TextMessage, EVENT_COLORS } from "./components-v2.js";
import { updateControlChannelOwnerPermissions } from "./temp-voice.js";

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
    targetUserId: targetUserId ?? null
  };
}

export function createTempVoiceControlMessage(input: {
  ownerId: string;
  tempVoiceChannelId: string;
  allowedUserIds?: string[];
  deniedUserIds?: string[];
}): MessageCreateOptions & MessageEditOptions {
  const { allowedUserIds = [], deniedUserIds = [] } = input;
  const hasPermissionInfo = allowedUserIds.length > 0 || deniedUserIds.length > 0;

  const infoLines = [
    `オーナー: <@${input.ownerId}>`,
    `VC: <#${input.tempVoiceChannelId}>`
  ];

  if (hasPermissionInfo) {
    infoLines.push("​"); // zero-width space for spacing
  }

  const containerComponents: object[] = [
    { type: ComponentType.TextDisplay, content: "## 🎙️ Temp VC コントロール" },
    { type: ComponentType.TextDisplay, content: infoLines.join("\n") },
    { type: ComponentType.Separator }
  ];

  if (allowedUserIds.length > 0) {
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: `✅ 入室許可: ${allowedUserIds.map(id => `<@${id}>`).join("  ")}`
    });
  }

  if (deniedUserIds.length > 0) {
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: `🚫 入室禁止: ${deniedUserIds.map(id => `<@${id}>`).join("  ")}`
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
    createButton(channelId, "rename", "✏️ 名前変更", ButtonStyle.Primary),
    createButton(channelId, "lock", "🔒 ロック", ButtonStyle.Secondary),
    createButton(channelId, "unlock", "🔓 解除", ButtonStyle.Secondary),
    createButton(channelId, "hide", "🙈 非表示", ButtonStyle.Secondary),
    createButton(channelId, "show", "👁️ 表示", ButtonStyle.Secondary)
  );

  const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    createButton(channelId, "user-limit", "👥 人数制限", ButtonStyle.Secondary),
    createButton(channelId, "user-management", "👤 ユーザー管理", ButtonStyle.Secondary)
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
  tempVoice: { channelId: string; controlChannelId?: string | null; ownerId: string }
) {
  if (!tempVoice.controlChannelId) return;

  const [voiceChannel, controlChannel] = await Promise.all([
    guild.channels.fetch(tempVoice.channelId).catch(() => null),
    guild.channels.fetch(tempVoice.controlChannelId).catch(() => null)
  ]);

  if (!isVoiceBasedChannel(voiceChannel) || !controlChannel?.isTextBased()) return;

  const { allowedUserIds, deniedUserIds } = getChannelUserPermissions(voiceChannel);

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

  await panelMessage.edit(
    createTempVoiceControlMessage({
      ownerId: tempVoice.ownerId,
      tempVoiceChannelId: tempVoice.channelId,
      allowedUserIds,
      deniedUserIds
    })
  );
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
      .setPlaceholder("ユーザーを選択してください...")
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "👤 ユーザー管理",
        lines: ["操作するユーザーを選択してください。"],
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
      .setLabel("🚪 キック")
      .setStyle(ButtonStyle.Danger);

    const allowBtn = new ButtonBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "allow-target", channelId: parsed.channelId, targetUserId }))
      .setLabel("✅ 入室許可")
      .setStyle(ButtonStyle.Success);

    const denyBtn = new ButtonBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "deny-target", channelId: parsed.channelId, targetUserId }))
      .setLabel("🚫 入室禁止")
      .setStyle(ButtonStyle.Secondary);

    const transferBtn = new ButtonBuilder()
      .setCustomId(toTempVoiceControlCustomId({ action: "transfer-target", channelId: parsed.channelId, targetUserId }))
      .setLabel("👑 オーナー譲渡")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(kickBtn, allowBtn, denyBtn, transferBtn);

    await interaction.update(
      createEphemeralUpdate("👤 ユーザー管理", [`<@${targetUserId}> に対するアクション:`], [row])
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
      await replyPrivate(interaction, "✅ Kicked", [`<@${parsed.targetUserId}> をキックしました。`]);
      return true;
    }

    if (parsed.action === "allow-target") {
      try {
        await channel.permissionOverwrites.edit(parsed.targetUserId, { Connect: true });
      } catch {
        await replyPrivate(interaction, "❌ 権限エラー", [
          "ボットに `MANAGE_ROLES` 権限がないため、ユーザーへの個別権限設定ができません。",
          "サーバー設定でボットロールに `ロールの管理` 権限を付与してください。"
        ]);
        return true;
      }
      await replyPrivate(interaction, "✅ 入室許可", [
        `<@${parsed.targetUserId}> の入室を許可しました。`
      ]);
      await updateControlPanel(guild, tempVoiceChannel);
      return true;
    }

    if (parsed.action === "deny-target") {
      try {
        await channel.permissionOverwrites.edit(parsed.targetUserId, { Connect: false });
      } catch {
        await replyPrivate(interaction, "❌ 権限エラー", [
          "ボットに `MANAGE_ROLES` 権限がないため、ユーザーへの個別権限設定ができません。",
          "サーバー設定でボットロールに `ロールの管理` 権限を付与してください。"
        ]);
        return true;
      }
      await replyPrivate(interaction, "🚫 入室禁止", [
        `<@${parsed.targetUserId}> の入室を禁止しました。`
      ]);
      await updateControlPanel(guild, tempVoiceChannel);
      return true;
    }

    if (parsed.action === "transfer-target") {
      const targetMember = await guild.members.fetch(parsed.targetUserId).catch(() => null);
      if (!targetMember || targetMember.voice.channelId !== parsed.channelId) {
        await replyPrivate(interaction, "❌ 譲渡できません", [
          "オーナー譲渡は現在通話に参加しているメンバーにのみ行えます。"
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
      });
      await replyPrivate(interaction, "👑 オーナー譲渡完了", [
        `<@${parsed.targetUserId}> にオーナーを譲渡しました。`
      ]);
      await updateControlPanel(guild, { ...tempVoiceChannel, ownerId: parsed.targetUserId });
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
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false });
    await replyPrivate(interaction, "✅ 🔒 ロック完了", ["新しいメンバーは接続できなくなりました。"]);
    return true;
  }

  if (parsed.action === "unlock") {
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: null });
    await replyPrivate(interaction, "✅ 🔓 ロック解除", ["新しいメンバーが接続できるようになりました。"]);
    return true;
  }

  if (parsed.action === "hide") {
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false });
    await replyPrivate(interaction, "✅ 🙈 非表示", ["チャンネルを非表示にしました。"]);
    return true;
  }

  if (parsed.action === "show") {
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: null });
    await replyPrivate(interaction, "✅ 👁️ 表示", ["チャンネルを表示しました。"]);
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
        await replyPrivate(interaction, "❌ 名前変更失敗", ["チャンネル名を入力してください。"]);
        return true;
      }

      await channel.setName(value.slice(0, 100), "Temp VC owner renamed channel.");
      await replyPrivate(interaction, "✅ ✏️ 名前変更完了", [`新しい名前: ${value}`]);
      return true;
    }

    if (parsed.action === "user-limit") {
      const limit = parseBoundedInteger(value, 0, 99);

      if (limit === null) {
        await replyPrivate(interaction, "❌ 人数制限失敗", ["0〜99の数字を入力してください。"]);
        return true;
      }

      await channel.setUserLimit(limit, "Temp VC owner changed user limit.");
      await replyPrivate(interaction, "✅ 👥 人数制限更新", [`人数制限: ${limit}人`]);
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

function isFormAction(action: TempVoiceControlAction) {
  return action === "rename" || action === "user-limit";
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
  if (action === "rename") return "✏️ Temp VC 名前変更";
  return "👥 Temp VC 人数制限";
}

function controlModalLabel(action: TempVoiceControlAction) {
  if (action === "rename") return "新しいチャンネル名";
  return "人数制限（0〜99）";
}

function parseBoundedInteger(value: string, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}
