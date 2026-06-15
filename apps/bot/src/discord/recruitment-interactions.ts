import {
  type ButtonInteraction,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  PermissionFlagsBits,
  type TextChannel
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  closeRecruitment,
  countActiveRecruitmentParticipants,
  getRecruitmentById,
  joinRecruitment,
  leaveRecruitment,
  updateRecruitmentAutoClose,
  updateRecruitmentStatus
} from "@discord-bot/db";
import { getLocale } from "@discord-bot/shared";

import { createComponentsV2TextMessage, EVENT_COLORS } from "./components-v2.js";
import {
  createRecruitmentCustomId,
  createRecruitmentPostMessage,
  parseRecruitmentCustomId
} from "./recruitment-channel.js";
import type { DiscordLogWriter } from "./log-writer.js";
import { writeRecruitmentLifecycleLog } from "./recruitment-logs.js";
import { resolveGuildLocale } from "./resolve-locale.js";

export interface RecruitmentInteractionContext {
  db: DbClient;
  logWriter?: DiscordLogWriter;
}

export async function handleRecruitmentButtonInteraction(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext
) {
  const parsed = parseRecruitmentCustomId(interaction.customId);

  if (!parsed) {
    return false;
  }

  const loc = await resolveGuildLocale(context.db, interaction.guildId);
  const recruitment = await getRecruitmentById(context.db, parsed.recruitmentId);

  if (!recruitment) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentNotFound,
        lines: [loc.recruitmentNotFoundMessage],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return true;
  }

  if (parsed.action === "join") {
    await handleJoin(interaction, context, recruitment, loc);
    return true;
  }

  if (parsed.action === "leave") {
    await handleLeave(interaction, context, recruitment, loc);
    return true;
  }

  if (parsed.action === "settings") {
    await handleSettings(interaction, context, recruitment, loc);
    return true;
  }

  if (parsed.action === "toggle-auto-close") {
    await handleToggleAutoClose(interaction, context, recruitment, loc);
    return true;
  }

  await handleClose(interaction, context, recruitment, loc);
  return true;
}

async function handleJoin(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>,
  loc: ReturnType<typeof getLocale>
) {
  const activeCount = await countActiveRecruitmentParticipants(
    context.db,
    recruitment.id
  );

  if (recruitment.status === "closed" || activeCount >= recruitment.capacity) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentNotOpen,
        lines: [loc.recruitmentNotOpenMessage],
        accentColor: EVENT_COLORS.yellow,
        privateResponse: true
      })
    });
    return;
  }

  await joinRecruitment(context.db, {
    recruitmentId: recruitment.id,
    userId: interaction.user.id
  });

  const nextCount = await countActiveRecruitmentParticipants(
    context.db,
    recruitment.id
  );
  const nextStatus =
    nextCount >= recruitment.capacity
      ? recruitment.autoClose
        ? "closed"
        : "full"
      : "open";
  const updatedRecruitment = await updateRecruitmentStatus(context.db, {
    recruitmentId: recruitment.id,
    status: nextStatus,
    autoClosed: nextStatus === "closed" && recruitment.autoClose,
    closedAt: nextStatus === "closed" ? new Date() : null
  });

  await interaction.message.edit(
    createRecruitmentPostMessage(updatedRecruitment ?? recruitment, loc, nextCount)
  );

  if (nextStatus === "closed" && recruitment.autoClose) {
    const loc2 = await resolveLocale(context.db, interaction.guildId);
    await (interaction.channel as TextChannel | null)?.send({
      ...createComponentsV2TextMessage({
        title: loc2.recruitmentAutoClosedTitle,
        lines: [
          `<@${recruitment.creatorId}>`,
          loc2.recruitmentAutoClosedHint
        ],
        accentColor: EVENT_COLORS.gray
      })
    }).catch((err: unknown) => {
      console.warn("failed to send recruitment auto-close notification", err);
    });
  }

  const loggedRecruitment = updatedRecruitment ?? recruitment;
  if (context.logWriter && nextStatus !== "open") {
    writeRecruitmentLifecycleLog(
      context.logWriter,
      nextStatus === "closed" ? "recruitment.closed" : "recruitment.full",
      {
        recruitment: loggedRecruitment,
        actorId: interaction.user.id,
        participantCount: nextCount,
        reason: nextStatus === "closed" ? "auto_close" : "capacity_reached"
      }
    );
  }

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentJoined({ current: nextCount, max: recruitment.capacity }),
      accentColor: EVENT_COLORS.green,
      privateResponse: true
    })
  });
}

async function handleLeave(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>,
  loc: ReturnType<typeof getLocale>
) {
  await leaveRecruitment(context.db, {
    recruitmentId: recruitment.id,
    userId: interaction.user.id
  });

  const nextCount = await countActiveRecruitmentParticipants(
    context.db,
    recruitment.id
  );
  const shouldReopen =
    recruitment.status === "closed" &&
    recruitment.autoClosed &&
    nextCount < recruitment.capacity;
  const nextStatus =
    shouldReopen || nextCount < recruitment.capacity ? "open" : "full";
  const updatedRecruitment = shouldReopen
    ? (await updateRecruitmentStatus(context.db, {
        recruitmentId: recruitment.id,
        status: nextStatus,
        autoClosed: false,
        closedAt: null
      })) ?? recruitment
    : recruitment;

  await interaction.message.edit(
    createRecruitmentPostMessage(updatedRecruitment, loc, nextCount)
  );

  if (shouldReopen) {
    const loc2 = await resolveLocale(context.db, interaction.guildId);
    await (interaction.channel as TextChannel | null)?.send({
      ...createComponentsV2TextMessage({
        title: loc2.recruitmentReopenedTitle,
        lines: [`<@${recruitment.creatorId}>`],
        accentColor: EVENT_COLORS.green
      })
    }).catch((err: unknown) => {
      console.warn("failed to send recruitment reopen notification", err);
    });
  }

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentLeft({ current: nextCount, max: recruitment.capacity }),
      accentColor: EVENT_COLORS.gray,
      privateResponse: true
    })
  });
}

async function handleClose(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>,
  loc: ReturnType<typeof getLocale>
) {
  const canClose =
    interaction.user.id === recruitment.creatorId ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

  if (!canClose) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentCannotClose,
        lines: [loc.recruitmentCannotCloseMessage],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  const updatedRecruitment =
    (await closeRecruitment(context.db, {
      recruitmentId: recruitment.id,
      autoClosed: false
    })) ?? recruitment;
  const activeCount = await countActiveRecruitmentParticipants(
    context.db,
    recruitment.id
  );

  await interaction.message.edit(
    createRecruitmentPostMessage(updatedRecruitment, loc, activeCount)
  );
  if (context.logWriter) {
    writeRecruitmentLifecycleLog(context.logWriter, "recruitment.closed", {
      recruitment: updatedRecruitment,
      actorId: interaction.user.id,
      participantCount: activeCount,
      reason: "manual_close"
    });
  }

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentClosedSuccess,
      accentColor: EVENT_COLORS.teal,
      privateResponse: true
    })
  });
}

async function handleSettings(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>,
  loc: ReturnType<typeof getLocale>
) {
  if (interaction.user.id !== recruitment.creatorId) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentNotCreator,
        lines: [],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  const toggleLabel = recruitment.autoClose
    ? loc.recruitmentAutoCloseToggleOff
    : loc.recruitmentAutoCloseToggleOn;

  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    ephemeral: true,
    components: [
      {
        type: ComponentType.Container,
        accent_color: EVENT_COLORS.teal,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `## ${loc.recruitmentSettingsTitle}`
          },
          {
            type: ComponentType.TextDisplay,
            content: loc.recruitmentAutoCloseStatus({ enabled: recruitment.autoClose })
          }
        ]
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            customId: createRecruitmentCustomId("toggle-auto-close", recruitment.id),
            label: toggleLabel,
            style: ButtonStyle.Secondary
          }
        ]
      }
    ]
  });
}

async function handleToggleAutoClose(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>,
  loc: ReturnType<typeof getLocale>
) {
  if (interaction.user.id !== recruitment.creatorId) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentNotCreator,
        lines: [],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  const newAutoClose = !recruitment.autoClose;
  await updateRecruitmentAutoClose(context.db, {
    recruitmentId: recruitment.id,
    autoClose: newAutoClose
  });

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentAutoCloseUpdated({ enabled: newAutoClose }),
      lines: [],
      accentColor: EVENT_COLORS.teal,
      privateResponse: true
    })
  });
}
