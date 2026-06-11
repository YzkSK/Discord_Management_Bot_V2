import {
  type ButtonInteraction,
  PermissionFlagsBits
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  closeRecruitment,
  countActiveRecruitmentParticipants,
  getGuildConfigByGuildId,
  getRecruitmentById,
  joinRecruitment,
  leaveRecruitment,
  updateRecruitmentStatus
} from "@discord-bot/db";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";

import { createComponentsV2TextMessage, EVENT_COLORS } from "./components-v2.js";
import {
  createRecruitmentPostMessage,
  parseRecruitmentCustomId
} from "./recruitment-channel.js";
import type { DiscordLogWriter } from "./log-writer.js";
import { writeRecruitmentLifecycleLog } from "./recruitment-logs.js";

async function resolveLocale(db: DbClient, guildId: string | null) {
  if (!guildId) return getLocale("ja");
  const config = await getGuildConfigByGuildId(db, guildId).catch(() => null);
  const lang: GuildLanguage =
    config?.language && isGuildLanguage(config.language) ? config.language : "ja";
  return getLocale(lang);
}

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

  const loc = await resolveLocale(context.db, interaction.guildId);
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
