import type { RecruitmentStatus } from "@discord-bot/db";

export interface RecruitmentSummaryInput {
  guildId: string;
  recruitments: RecruitmentSummaryItemInput[];
}

export interface RecruitmentSummaryItemInput {
  activeParticipantCount: number;
  capacity: number;
  channelId: string;
  closedAt: Date | null;
  deadlineAt: Date | null;
  content: string;
  createdAt: Date;
  creatorId: string;
  genre: string;
  id: string;
  messageId: string | null;
  status: RecruitmentStatus;
  updatedAt: Date;
  voiceChannelId: string | null;
}

export interface RecruitmentSummaryItem {
  activeParticipantCount: number;
  availableSlots: number;
  capacity: number;
  channelId: string;
  closedAt: string | null;
  deadlineAt: string | null;
  content: string;
  createdAt: string;
  creatorId: string;
  genre: string;
  id: string;
  messageId: string | null;
  postUrl: string | null;
  status: RecruitmentStatus;
  updatedAt: string;
  voiceChannelId: string | null;
}

export interface RecruitmentSummary {
  closedCount: number;
  fullCount: number;
  openCount: number;
  recruitments: RecruitmentSummaryItem[];
  totalCount: number;
}

export function buildRecruitmentSummary(
  input: RecruitmentSummaryInput
): RecruitmentSummary {
  const recruitments = input.recruitments.map((recruitment) => ({
    activeParticipantCount: recruitment.activeParticipantCount,
    availableSlots: Math.max(
      0,
      recruitment.capacity - recruitment.activeParticipantCount
    ),
    capacity: recruitment.capacity,
    channelId: recruitment.channelId,
    closedAt: recruitment.closedAt?.toISOString() ?? null,
    deadlineAt: recruitment.deadlineAt?.toISOString() ?? null,
    content: recruitment.content,
    createdAt: recruitment.createdAt.toISOString(),
    creatorId: recruitment.creatorId,
    genre: recruitment.genre,
    id: recruitment.id,
    messageId: recruitment.messageId,
    postUrl: recruitment.messageId
      ? `https://discord.com/channels/${input.guildId}/${recruitment.channelId}/${recruitment.messageId}`
      : null,
    status: recruitment.status,
    updatedAt: recruitment.updatedAt.toISOString(),
    voiceChannelId: recruitment.voiceChannelId
  }));

  const statusCounts = recruitments.reduce(
    (acc, r) => { acc[r.status]++; return acc; },
    { open: 0, full: 0, closed: 0 } as Record<RecruitmentStatus, number>
  );

  return {
    closedCount: statusCounts.closed,
    fullCount: statusCounts.full,
    openCount: statusCounts.open,
    recruitments,
    totalCount: recruitments.length
  };
}
