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
  privateResponse?: boolean;
}

export function createComponentsV2TextMessage(
  input: ComponentsV2TextMessageInput
): InteractionReplyOptions & MessageCreateOptions {
  const components: TopLevelComponentData[] = [
    {
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
    }
  ];

  return {
    components,
    flags:
      MessageFlags.IsComponentsV2 |
      (input.privateResponse ? MessageFlags.Ephemeral : 0)
  };
}
