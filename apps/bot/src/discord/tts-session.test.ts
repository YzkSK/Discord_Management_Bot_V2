import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TtsSessionManager } from "./tts-session.js";

function createManager() {
  const joined: Array<{ guildId: string; voiceChannelId: string }> = [];
  const left: string[] = [];

  return {
    joined,
    left,
    manager: new TtsSessionManager({
      voiceAdapter: {
        async join(input: { guildId: string; voiceChannelId: string }) {
          joined.push({
            guildId: input.guildId,
            voiceChannelId: input.voiceChannelId
          });
        },
        leave(guildId: string) {
          left.push(guildId);
        },
        play(_guildId: string, _audio: Buffer) {
          return Promise.resolve();
        }
      }
    })
  };
}

describe("TtsSessionManager", () => {
  it("deduplicates temporary and persistent source channels", async () => {
    const { manager } = createManager();

    await manager.join({
      guildId: "guild-1",
      textChannelId: "text-1",
      voiceChannelId: "voice-1"
    });

    assert.deepEqual(
      manager.getReadableChannelIds("guild-1", "text-1"),
      ["text-1"]
    );
  });

  it("blocks regular join when connected to another voice channel", async () => {
    const { manager, joined } = createManager();

    await manager.join({
      guildId: "guild-1",
      textChannelId: "text-1",
      voiceChannelId: "voice-1"
    });
    const result = await manager.join({
      guildId: "guild-1",
      textChannelId: "text-2",
      voiceChannelId: "voice-2"
    });

    assert.equal(result.status, "blocked");
    assert.equal(joined.length, 1);
  });

  it("force join can move to another voice channel", async () => {
    const { manager, joined } = createManager();

    await manager.join({
      guildId: "guild-1",
      textChannelId: "text-1",
      voiceChannelId: "voice-1"
    });
    const result = await manager.forceJoin({
      guildId: "guild-1",
      textChannelId: "text-2",
      voiceChannelId: "voice-2"
    });

    assert.equal(result.status, "moved");
    assert.equal(joined.at(-1)?.voiceChannelId, "voice-2");
    assert.deepEqual(manager.getReadableChannelIds("guild-1"), ["text-2"]);
  });

  it("leave clears the temporary source channels", async () => {
    const { manager, left } = createManager();

    await manager.join({
      guildId: "guild-1",
      textChannelId: "text-1",
      voiceChannelId: "voice-1"
    });
    manager.leave("guild-1");

    assert.deepEqual(manager.getReadableChannelIds("guild-1"), []);
    assert.deepEqual(left, ["guild-1"]);
  });
});
