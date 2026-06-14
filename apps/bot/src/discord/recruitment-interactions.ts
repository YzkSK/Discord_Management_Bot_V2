import {
  type ButtonInteraction,
  PermissionFlagsBits,
  type TextChannel
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  closeRecruitment,
  countActiveRecruitmentParticipants,
  getActiveParticipant,
  getGuildConfigByGuildId,
  getRecruitmentById,
  joinRecruitment,
  leaveRecruitment,
  listActiveRecruitmentParticipants,
  listQueuedParticipants,
  promoteFromQueue,
  updateRecruitmentStatus,
  type RecruitmentStatus
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

  if (parsed.action === "reopen") {
    await handleReopen(interaction, context, recruitment, loc);
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
  const existing = await getActiveParticipant(context.db, {
    recruitmentId: recruitment.id,
    userId: interaction.user.id
  });

  if (existing) {
    const title = existing.isQueued
      ? loc.recruitmentAlreadyQueued
      : loc.recruitmentAlreadyJoined;
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title,
        accentColor: EVENT_COLORS.yellow,
        privateResponse: true
      })
    });
    return;
  }

  if (recruitment.status === "closed") {
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

  const activeCount = await countActiveRecruitmentParticipants(context.db, recruitment.id);
  const isQueued = activeCount >= recruitment.capacity;

  await joinRecruitment(context.db, {
    recruitmentId: recruitment.id,
    userId: interaction.user.id,
    isQueued
  });

  let updatedRecruitment = recruitment;
  if (!isQueued) {
    const nextActiveCount = activeCount + 1;
    const nextStatus: RecruitmentStatus =
      nextActiveCount >= recruitment.capacity ? "full" : "open";
    if (nextStatus !== recruitment.status) {
      updatedRecruitment =
        (await updateRecruitmentStatus(context.db, {
          recruitmentId: recruitment.id,
          status: nextStatus
        })) ?? recruitment;
    }
  }

  const [participants, queued] = await Promise.all([
    listActiveRecruitmentParticipants(context.db, recruitment.id),
    listQueuedParticipants(context.db, recruitment.id)
  ]);

  await interaction.message.edit(
    createRecruitmentPostMessage(
      updatedRecruitment,
      loc,
      participants.length,
      participants.map((p) => p.userId),
      queued.map((p) => p.userId)
    )
  );

  if (context.logWriter && !isQueued && participants.length >= recruitment.capacity) {
    writeRecruitmentLifecycleLog(context.logWriter, "recruitment.full", {
      recruitment: updatedRecruitment,
      actorId: interaction.user.id,
      participantCount: participants.length,
      reason: "capacity_reached"
    });
  }

  if (isQueued) {
    const position = queued.findIndex((p) => p.userId === interaction.user.id) + 1;
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentQueueJoined({
          position: position > 0 ? position : queued.length
        }),
        accentColor: EVENT_COLORS.yellow,
        privateResponse: true
      })
    });
  } else {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentJoined({
          current: participants.length,
          max: recruitment.capacity
        }),
        accentColor: EVENT_COLORS.green,
        privateResponse: true
      })
    });
  }
}

async function handleLeave(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>,
  loc: ReturnType<typeof getLocale>
) {
  const existing = await getActiveParticipant(context.db, {
    recruitmentId: recruitment.id,
    userId: interaction.user.id
  });

  if (!existing) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentNotJoined,
        accentColor: EVENT_COLORS.yellow,
        privateResponse: true
      })
    });
    return;
  }

  await leaveRecruitment(context.db, {
    recruitmentId: recruitment.id,
    userId: interaction.user.id
  });

  let updatedRecruitment = recruitment;

  if (!existing.isQueued) {
    const promoted = await promoteFromQueue(context.db, recruitment.id);

    if (promoted) {
      await (interaction.channel as TextChannel | null)
        ?.send({ content: loc.recruitmentPromoted({ userId: promoted.userId }) })
        .catch((err: unknown) => {
          console.warn("failed to send queue promotion notification", err);
        });
    }

    const participants = await listActiveRecruitmentParticipants(context.db, recruitment.id);
    const nextStatus: RecruitmentStatus =
      recruitment.status === "closed"
        ? "closed"
        : participants.length >= recruitment.capacity
          ? "full"
          : "open";
    if (nextStatus !== recruitment.status) {
      updatedRecruitment =
        (await updateRecruitmentStatus(context.db, {
          recruitmentId: recruitment.id,
          status: nextStatus
        })) ?? recruitment;
    }
  }

  const [participants, queued] = await Promise.all([
    listActiveRecruitmentParticipants(context.db, recruitment.id),
    listQueuedParticipants(context.db, recruitment.id)
  ]);

  await interaction.message.edit(
    createRecruitmentPostMessage(
      updatedRecruitment,
      loc,
      participants.length,
      participants.map((p) => p.userId),
      queued.map((p) => p.userId)
    )
  );

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: existing.isQueued
        ? loc.recruitmentQueueLeft
        : loc.recruitmentLeft({ current: participants.length, max: recruitment.capacity }),
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
    (await closeRecruitment(context.db, { recruitmentId: recruitment.id })) ??
    recruitment;

  const [participants, queued] = await Promise.all([
    listActiveRecruitmentParticipants(context.db, recruitment.id),
    listQueuedParticipants(context.db, recruitment.id)
  ]);

  await interaction.message.edit(
    createRecruitmentPostMessage(
      updatedRecruitment,
      loc,
      participants.length,
      participants.map((p) => p.userId),
      queued.map((p) => p.userId)
    )
  );

  if (context.logWriter) {
    writeRecruitmentLifecycleLog(context.logWriter, "recruitment.closed", {
      recruitment: updatedRecruitment,
      actorId: interaction.user.id,
      participantCount: participants.length,
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

async function handleReopen(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>,
  loc: ReturnType<typeof getLocale>
) {
  const canReopen =
    interaction.user.id === recruitment.creatorId ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

  if (!canReopen) {
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

  const [participants, queued] = await Promise.all([
    listActiveRecruitmentParticipants(context.db, recruitment.id),
    listQueuedParticipants(context.db, recruitment.id)
  ]);

  const nextStatus: RecruitmentStatus =
    participants.length >= recruitment.capacity ? "full" : "open";

  const updatedRecruitment =
    (await updateRecruitmentStatus(context.db, {
      recruitmentId: recruitment.id,
      status: nextStatus,
      closedAt: null
    })) ?? recruitment;

  await interaction.message.edit(
    createRecruitmentPostMessage(
      updatedRecruitment,
      loc,
      participants.length,
      participants.map((p) => p.userId),
      queued.map((p) => p.userId)
    )
  );

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentReopenedSuccess,
      accentColor: EVENT_COLORS.green,
      privateResponse: true
    })
  });
}
