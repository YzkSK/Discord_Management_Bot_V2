import {
  getLocale,
  COUNTDOWN_THRESHOLD_24H_MS,
  COUNTDOWN_THRESHOLD_1H_MS,
} from "@discord-bot/shared";
import type { RecruitmentStatus } from "@discord-bot/db";

const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
const COMPONENT_TYPE_TEXT_DISPLAY = 10;
const COMPONENT_TYPE_SEPARATOR = 14;
const COMPONENT_TYPE_CONTAINER = 17;
const BUTTON_STYLE_PRIMARY = 1;
const BUTTON_STYLE_SECONDARY = 2;
const BUTTON_STYLE_SUCCESS = 3;
const BUTTON_STYLE_DANGER = 4;
const MESSAGE_FLAG_IS_COMPONENTS_V2 = 1 << 15;
const TEAL_COLOR = 0x1abc9c;

export interface RecruitmentUpdateInput {
  recruitment: {
    id: string;
    genre: string;
    content: string;
    creatorId: string;
    voiceChannelId: string | null;
    status: RecruitmentStatus;
    capacity: number;
    deadlineAt: Date | null;
  };
  participantIds: string[];
  queuedIds: string[];
  loc: ReturnType<typeof getLocale>;
}

function localizeStatus(status: string, loc: ReturnType<typeof getLocale>): string {
  if (status === "open") return loc.recruitmentStatusOpen;
  if (status === "full") return loc.recruitmentStatusFull;
  return loc.recruitmentStatusClosed;
}

function formatDeadlineText(
  deadlineAt: Date | null,
  loc: ReturnType<typeof getLocale>
): string | null {
  if (!deadlineAt) return null;

  const msLeft = deadlineAt.getTime() - Date.now();

  if (msLeft <= 0) return loc.recruitmentPostExpired;

  if (msLeft > COUNTDOWN_THRESHOLD_24H_MS) {
    return loc.recruitmentPostDeadlineAbsolute({
      timestamp: Math.floor(deadlineAt.getTime() / 1000),
    });
  }

  if (msLeft > COUNTDOWN_THRESHOLD_1H_MS) {
    const hours = Math.floor(msLeft / COUNTDOWN_THRESHOLD_1H_MS);
    const minutes = Math.floor((msLeft % COUNTDOWN_THRESHOLD_1H_MS) / 60_000);
    return loc.recruitmentPostDeadlineHours({ hours, minutes });
  }

  const minutes = Math.max(1, Math.floor(msLeft / 60_000));
  return loc.recruitmentPostDeadlineMinutes({ minutes });
}

export function buildRecruitmentUpdatePayload(input: RecruitmentUpdateInput) {
  const { recruitment, participantIds, queuedIds, loc } = input;
  const isClosed = recruitment.status === "closed";

  const vcText = recruitment.voiceChannelId
    ? loc.recruitmentPostVc({ id: recruitment.voiceChannelId })
    : loc.recruitmentPostNoVc;

  const deadlineText = isClosed
    ? null
    : formatDeadlineText(recruitment.deadlineAt, loc);

  const participantText =
    participantIds.length > 0
      ? `${loc.recruitmentParticipantsLabel}\n${participantIds.map((id) => `<@${id}>`).join("\n")}`
      : loc.recruitmentNoParticipants;

  const queueText =
    queuedIds.length > 0
      ? `${loc.recruitmentQueueLabel}\n${queuedIds.map((id) => `<@${id}>`).join("\n")}`
      : null;

  const closeOrReopenButton = isClosed
    ? {
        type: COMPONENT_TYPE_BUTTON,
        custom_id: `recruitment:reopen:${recruitment.id}`,
        label: loc.recruitmentButtonReopen,
        style: BUTTON_STYLE_SUCCESS,
      }
    : {
        type: COMPONENT_TYPE_BUTTON,
        custom_id: `recruitment:close:${recruitment.id}`,
        label: loc.recruitmentButtonClose,
        style: BUTTON_STYLE_DANGER,
      };

  const containerComponents = [
    {
      type: COMPONENT_TYPE_TEXT_DISPLAY,
      content: `## ${loc.recruitmentPostTitle({ title: recruitment.genre })}`,
    },
    {
      type: COMPONENT_TYPE_TEXT_DISPLAY,
      content: `${localizeStatus(recruitment.status, loc)}  ·  👥 ${participantIds.length} / ${recruitment.capacity}`,
    },
    { type: COMPONENT_TYPE_SEPARATOR },
    { type: COMPONENT_TYPE_TEXT_DISPLAY, content: recruitment.content },
    { type: COMPONENT_TYPE_SEPARATOR },
    {
      type: COMPONENT_TYPE_TEXT_DISPLAY,
      content: loc.recruitmentPostCreator({ id: recruitment.creatorId }),
    },
    { type: COMPONENT_TYPE_TEXT_DISPLAY, content: vcText },
    ...(deadlineText
      ? [{ type: COMPONENT_TYPE_TEXT_DISPLAY, content: deadlineText }]
      : []),
    { type: COMPONENT_TYPE_TEXT_DISPLAY, content: participantText },
    ...(queueText
      ? [{ type: COMPONENT_TYPE_TEXT_DISPLAY, content: queueText }]
      : []),
  ];

  return {
    flags: MESSAGE_FLAG_IS_COMPONENTS_V2,
    components: [
      {
        type: COMPONENT_TYPE_CONTAINER,
        accent_color: TEAL_COLOR,
        components: containerComponents,
      },
      {
        type: COMPONENT_TYPE_ACTION_ROW,
        components: [
          {
            type: COMPONENT_TYPE_BUTTON,
            custom_id: `recruitment:join:${recruitment.id}`,
            label: loc.recruitmentButtonJoin,
            style: BUTTON_STYLE_PRIMARY,
            disabled: isClosed,
          },
          {
            type: COMPONENT_TYPE_BUTTON,
            custom_id: `recruitment:leave:${recruitment.id}`,
            label: loc.recruitmentButtonLeave,
            style: BUTTON_STYLE_SECONDARY,
          },
          closeOrReopenButton,
        ],
      },
    ],
  };
}
