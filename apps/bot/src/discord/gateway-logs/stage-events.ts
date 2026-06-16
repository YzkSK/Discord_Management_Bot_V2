import { Events, type Client, type StageInstance } from "discord.js";
import { diffRecord, createGuildEvent, type WriteEventFn } from "./payloads.js";

function stagePayload(stage: StageInstance) {
  return {
    id: stage.id,
    channelId: stage.channelId,
    topic: stage.topic,
    privacyLevel: stage.privacyLevel,
    discoverableDisabled: stage.discoverableDisabled
  };
}

export function installStageGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.StageInstanceCreate, (stage) => {
    write(
      createGuildEvent("stage.create", stage.guild, {
        stage: stagePayload(stage)
      })
    );
  });

  client.on(Events.StageInstanceUpdate, (oldStage, newStage) => {
    const before = oldStage ? stagePayload(oldStage) : null;
    const after = stagePayload(newStage);
    write(
      createGuildEvent("stage.update", newStage.guild, {
        before,
        after,
        changes: before ? diffRecord(before, after) : {}
      })
    );
  });

  client.on(Events.StageInstanceDelete, (stage) => {
    write(
      createGuildEvent("stage.delete", stage.guild, {
        stage: stagePayload(stage)
      })
    );
  });
}
