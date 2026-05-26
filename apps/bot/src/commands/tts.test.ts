import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  forceJoinCommand,
  joinCommand,
  leaveCommand,
  parseForceJoinCustomId,
  toForceJoinCustomId
} from "./tts.js";

describe("tts slash commands", () => {
  it("exposes join, force-join, and leave command builders", () => {
    assert.equal(joinCommand.name, "join");
    assert.equal(forceJoinCommand.name, "force-join");
    assert.equal(leaveCommand.name, "leave");
  });

  it("parses force join confirmation custom ids", () => {
    const customId = toForceJoinCustomId({
      guildId: "guild-1",
      textChannelId: "text-1",
      userId: "user-1",
      voiceChannelId: "voice-1"
    });

    assert.deepEqual(parseForceJoinCustomId(customId), {
      guildId: "guild-1",
      textChannelId: "text-1",
      userId: "user-1",
      voiceChannelId: "voice-1"
    });
    assert.equal(parseForceJoinCustomId("other"), null);
  });
});
