export interface VoiceSummarySessionInput {
  channelId: string;
  endedAt: Date | null;
  id: string;
  memberCount: number;
  startedAt: Date;
  status: "active" | "ended";
}

export interface VoiceSummaryTempVoiceInput {
  channelId: string;
  controlChannelId: string | null;
  creationChannelId: string;
  deleteScheduledAt: Date | null;
  ownerId: string;
}

export interface VoiceSummaryInput {
  now?: Date;
  sessions: VoiceSummarySessionInput[];
  tempVoiceChannels: VoiceSummaryTempVoiceInput[];
}

export interface VoiceSummaryTempVoice {
  controlChannelId: string | null;
  creationChannelId: string;
  deleteScheduledAt: string | null;
  ownerId: string;
}

export interface VoiceSummarySession {
  channelId: string;
  durationSeconds: number;
  endedAt?: string;
  id: string;
  memberCount: number;
  startedAt: string;
  status: "active" | "ended";
  tempVoice: VoiceSummaryTempVoice | null;
}

export interface VoiceSummary {
  activeSessions: VoiceSummarySession[];
  recentSessions: VoiceSummarySession[];
  tempVoiceChannels: Array<VoiceSummaryTempVoice & { channelId: string }>;
}

export function buildVoiceSummary(input: VoiceSummaryInput): VoiceSummary {
  const tempVoiceByChannelId = new Map(
    input.tempVoiceChannels.map((tempVoice) => [tempVoice.channelId, tempVoice])
  );

  const sessions = input.sessions.map((session) => {
    const tempVoice = tempVoiceByChannelId.get(session.channelId);
    return {
      channelId: session.channelId,
      durationSeconds: getDurationSeconds(session, input.now),
      ...(session.endedAt ? { endedAt: session.endedAt.toISOString() } : {}),
      id: session.id,
      memberCount: session.memberCount,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
      tempVoice: tempVoice
        ? {
            controlChannelId: tempVoice.controlChannelId,
            creationChannelId: tempVoice.creationChannelId,
            deleteScheduledAt: tempVoice.deleteScheduledAt?.toISOString() ?? null,
            ownerId: tempVoice.ownerId
          }
        : null
    } satisfies VoiceSummarySession;
  });

  return {
    activeSessions: sessions.filter((session) => session.status === "active"),
    recentSessions: sessions.filter((session) => session.status === "ended"),
    tempVoiceChannels: input.tempVoiceChannels.map((tempVoice) => ({
      ...tempVoice,
      deleteScheduledAt: tempVoice.deleteScheduledAt?.toISOString() ?? null
    }))
  };
}

function getDurationSeconds(session: VoiceSummarySessionInput, now?: Date) {
  const endTime = session.endedAt ?? now ?? new Date();
  return Math.max(
    0,
    Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000)
  );
}
