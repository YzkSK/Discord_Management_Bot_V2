import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  forceJoinCommand,
  handleSpeakerCommand,
  joinCommand,
  leaveCommand,
  parseForceJoinCustomId,
  parseSpeakerIdOption,
  speakerCommand,
  toForceJoinCustomId
} from "./tts.js";

describe("tts slash commands", () => {
  it("exposes join, force-join, leave, and speaker command builders", () => {
    assert.equal(joinCommand.name, "join");
    assert.equal(forceJoinCommand.name, "force-join");
    assert.equal(leaveCommand.name, "leave");
    assert.equal(speakerCommand.name, "speaker");
  });

  it("exposes user and server default speaker subcommands", () => {
    const payload = speakerCommand.toJSON();
    const subcommands = payload.options?.map((option) => option.name);

    assert.deepEqual(subcommands, ["set", "server-default"]);
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

describe("parseSpeakerIdOption", () => {
  it("accepts non-negative integer speaker ids", () => {
    assert.equal(parseSpeakerIdOption(3), 3);
  });

  it("rejects missing or negative speaker ids", () => {
    assert.throws(() => parseSpeakerIdOption(null), /speaker id is required/i);
    assert.throws(() => parseSpeakerIdOption(-1), /non-negative/i);
  });
});

describe("handleSpeakerCommand", () => {
  it("stores a user speaker setting", async () => {
    let stored: unknown = null;
    let replyTitle = "";

    await handleSpeakerCommand(
      {
        guildId: "guild-1",
        options: {
          getInteger: () => 3,
          getSubcommand: () => "set"
        },
        reply: async (message: { components?: unknown[] }) => {
          replyTitle = JSON.stringify(message.components ?? []);
        },
        user: { id: "user-1" }
      } as never,
      {
        db: createSpeakerCommandDb() as never,
        setUserSpeaker: async (_db, input) => {
          stored = input;
          return undefined as never;
        },
        ttsSessionManager: {} as never
      }
    );

    assert.deepEqual(stored, {
      guildId: "guild-1",
      speakerId: 3,
      userId: "user-1"
    });
    assert.match(replyTitle, /speaker/i);
  });

  it("stores a server default speaker setting for the guild owner", async () => {
    let stored: unknown = null;

    await handleSpeakerCommand(
      {
        guild: {
          members: {
            fetch: async () => ({
              roles: {
                cache: {
                  map: () => []
                }
              }
            })
          },
          ownerId: "user-1"
        },
        guildId: "guild-1",
        options: {
          getInteger: () => 4,
          getSubcommand: () => "server-default"
        },
        reply: async () => {},
        user: { id: "user-1" }
      } as never,
      {
        db: createSpeakerCommandDb() as never,
        setGuildDefaultSpeaker: async (_db, input) => {
          stored = input;
          return undefined as never;
        },
        ttsSessionManager: {} as never
      }
    );

    assert.deepEqual(stored, {
      guildId: "guild-1",
      speakerId: 4
    });
  });

  it("rejects server default speaker updates without admin access", async () => {
    let stored = false;

    await handleSpeakerCommand(
      {
        guild: {
          members: {
            fetch: async () => ({
              roles: {
                cache: {
                  map: () => []
                }
              }
            })
          },
          ownerId: "owner-1"
        },
        guildId: "guild-1",
        options: {
          getInteger: () => 4,
          getSubcommand: () => "server-default"
        },
        reply: async () => {},
        user: { id: "user-1" }
      } as never,
      {
        db: createSpeakerCommandDb() as never,
        setGuildDefaultSpeaker: async () => {
          stored = true;
          return undefined as never;
        },
        ttsSessionManager: {} as never
      }
    );

    assert.equal(stored, false);
  });
});

function createSpeakerCommandDb() {
  return {
    select: (selection: Record<string, unknown>) => {
      if ("language" in selection) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: async () => []
              })
            })
          })
        };
      }

      return {
        from: () => ({
          where: () => Promise.resolve([])
        })
      };
    }
  };
}
