import {
  type ButtonInteraction,
  PermissionFlagsBits
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  closeRecruitment,
  countActiveRecruitmentParticipants,
  getRecruitmentById,
  joinRecruitment,
  leaveRecruitment,
  updateRecruitmentStatus
} from "@discord-bot/db";

import { createComponentsV2TextMessage } from "./components-v2.js";
import {
  createRecruitmentPostMessage,
  parseRecruitmentCustomId
} from "./recruitment-channel.js";

export interface RecruitmentInteractionContext {
  db: DbClient;
}

export async function handleRecruitmentButtonInteraction(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext
) {
  const parsed = parseRecruitmentCustomId(interaction.customId);

  if (!parsed) {
    return false;
  }

  const recruitment = await getRecruitmentById(context.db, parsed.recruitmentId);

  if (!recruitment) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Recruitment not found",
        lines: ["This recruitment post no longer exists."],
        privateResponse: true
      })
    });
    return true;
  }

  if (parsed.action === "join") {
    await handleJoin(interaction, context, recruitment);
    return true;
  }

  if (parsed.action === "leave") {
    await handleLeave(interaction, context, recruitment);
    return true;
  }

  await handleClose(interaction, context, recruitment);
  return true;
}

async function handleJoin(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>
) {
  const activeCount = await countActiveRecruitmentParticipants(
    context.db,
    recruitment.id
  );

  if (recruitment.status === "closed" || activeCount >= recruitment.capacity) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Recruitment is not open",
        lines: ["This recruitment is already full or closed."],
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
    createRecruitmentPostMessage(updatedRecruitment ?? recruitment, nextCount)
  );
  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: "Joined recruitment",
      lines: [`Participants: ${nextCount}/${recruitment.capacity}`],
      privateResponse: true
    })
  });
}

async function handleLeave(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>
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
    createRecruitmentPostMessage(updatedRecruitment, nextCount)
  );
  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: "Left recruitment",
      lines: [`Participants: ${nextCount}/${recruitment.capacity}`],
      privateResponse: true
    })
  });
}

async function handleClose(
  interaction: ButtonInteraction,
  context: RecruitmentInteractionContext,
  recruitment: NonNullable<Awaited<ReturnType<typeof getRecruitmentById>>>
) {
  const canClose =
    interaction.user.id === recruitment.creatorId ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

  if (!canClose) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Cannot close recruitment",
        lines: ["Only the creator or a server manager can close this."],
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
    createRecruitmentPostMessage(updatedRecruitment, activeCount)
  );
  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: "Recruitment closed",
      privateResponse: true
    })
  });
}
