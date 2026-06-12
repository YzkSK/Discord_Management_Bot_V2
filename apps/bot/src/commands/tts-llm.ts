import {
  getGuildConfigByGuildId,
  setGuildTtsLlmEnabled,
  type DbClient
} from "@discord-bot/db";
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from "discord.js";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";

export interface TtsLlmCommandContext {
  db: DbClient;
}

export const ttsLlmCommand = new SlashCommandBuilder()
  .setName("tts-llm")
  .setDescription("Toggle LLM-based text normalization for TTS.")
  .setDescriptionLocalization("ja", "TTS読み上げのLLMテキスト正規化を切り替えます。")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("enable")
      .setDescription("Enable LLM normalization for this server.")
      .setDescriptionLocalization("ja", "このサーバーのLLM正規化を有効にします。")
  )
  .addSubcommand((sub) =>
    sub
      .setName("disable")
      .setDescription("Disable LLM normalization for this server.")
      .setDescriptionLocalization("ja", "このサーバーのLLM正規化を無効にします。")
  );

export async function handleTtsLlmCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsLlmCommandContext
) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply(
      createComponentsV2TextMessage({
        title: "エラー",
        lines: ["このコマンドはサーバー内でのみ使用できます。"],
        privateResponse: true
      })
    );
    return;
  }

  const config = await getGuildConfigByGuildId(context.db, guildId);

  if (!config) {
    await interaction.reply(
      createComponentsV2TextMessage({
        title: "エラー",
        lines: ["サーバーの設定が見つかりません。`/setup`を実行してください。"],
        privateResponse: true
      })
    );
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const enabled = subcommand === "enable";

  await setGuildTtsLlmEnabled(context.db, { guildId, enabled });

  await interaction.reply(
    createComponentsV2TextMessage({
      title: "TTS LLM正規化",
      lines: [enabled ? "✅ LLM正規化を有効にしました。" : "⛔ LLM正規化を無効にしました。"],
      privateResponse: true
    })
  );
}
