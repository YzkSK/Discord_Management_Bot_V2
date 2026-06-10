import {
  ComponentType,
  MessageFlags,
  type InteractionReplyOptions,
  type MessageCreateOptions,
  type TopLevelComponentData
} from "discord.js";

export interface ComponentsV2TextMessageInput {
  title: string;
  lines?: readonly string[];
  accentColor?: number;
  privateResponse?: boolean;
}

export const EVENT_COLORS = {
  purple: 0x9B59B6,
  blue:   0x5865F2,
  teal:   0x1ABC9C,
  green:  0x57F287,
  red:    0xED4245,
  yellow: 0xFEE75C,
  gray:   0x99AAB5,
} as const;

export function discordTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

export function discordRelative(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function createComponentsV2TextMessage(
  input: ComponentsV2TextMessageInput
): InteractionReplyOptions & MessageCreateOptions {
  const container: Record<string, unknown> = {
    type: ComponentType.Container,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: `## ${input.title}`
      },
      ...(input.lines ?? []).map((line) => ({
        type: ComponentType.TextDisplay,
        content: line
      }))
    ]
  };

  if (input.accentColor !== undefined) {
    container.accent_color = input.accentColor;
  }

  return {
    components: [container as unknown as TopLevelComponentData],
    flags:
      MessageFlags.IsComponentsV2 |
      (input.privateResponse ? MessageFlags.Ephemeral : 0)
  };
}
