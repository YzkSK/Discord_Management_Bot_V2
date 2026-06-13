import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSpeakerAutocompleteChoices,
  forceJoinCommand,
  handleForceJoinCommand,
  handleJoinCommand,
  handleSpeakerCommand,
  joinCommand,
  leaveCommand,
  parseForceJoinCustomId,
  parseSpeakerIdOption,
  speakerCommand,
  toForceJoinCustomId
} from "./tts.js";
import type { VoicevoxSpeaker } from "../discord/voicevox.js";

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

describe("buildSpeakerAutocompleteChoices", () => {
  const speakers: VoicevoxSpeaker[] = [
    {
      name: "四国めたん",
      speaker_uuid: "uuid-1",
      styles: [
        { id: 2, name: "ノーマル", type: "talk" },
        { id: 0, name: "あまあま", type: "talk" }
      ]
    },
    {
      name: "ずんだもん",
      speaker_uuid: "uuid-2",
      styles: [{ id: 3, name: "ノーマル", type: "talk" }]
    }
  ];

  it("returns one choice per style with name + id label", () => {
    const choices = buildSpeakerAutocompleteChoices(speakers, "");

    assert.equal(choices[0]?.name, "四国めたん（ノーマル） [ID: 2]");
    assert.equal(choices[0]?.value, 2);
    assert.equal(choices[1]?.name, "四国めたん（あまあま） [ID: 0]");
    assert.equal(choices[1]?.value, 0);
    assert.equal(choices[2]?.name, "ずんだもん（ノーマル） [ID: 3]");
    assert.equal(choices[2]?.value, 3);
  });

  it("filters choices by query string (case-insensitive partial match)", () => {
    const choices = buildSpeakerAutocompleteChoices(speakers, "ずんだ");

    assert.equal(choices.length, 1);
    assert.equal(choices[0]?.value, 3);
  });

  it("returns at most 25 choices", () => {
    const manySpeakers: VoicevoxSpeaker[] = Array.from({ length: 30 }, (_, i) => ({
      name: `Speaker${i}`,
      speaker_uuid: `uuid-${i}`,
      styles: [{ id: i, name: "ノーマル", type: "talk" }]
    }));

    const choices = buildSpeakerAutocompleteChoices(manySpeakers, "");

    assert.equal(choices.length, 25);
  });
});

describe("handleJoinCommand — mute tip", () => {
  it("includes the mute-prefix tip in the joined success reply", async () => {
    let replyComponents = "";

    await handleJoinCommand(
      {
        guildId: "guild-1",
        channelId: "text-1",
        user: { id: "user-1" },
        guild: {
          voiceAdapterCreator: {},
          members: {
            fetch: async () => ({ voice: { channel: { id: "voice-1" } } })
          }
        },
        reply: async (msg: { components?: unknown[] }) => {
          replyComponents = JSON.stringify(msg.components ?? []);
        }
      } as never,
      {
        db: createSpeakerCommandDb() as never,
        ttsSessionManager: {
          join: async () => ({ status: "joined" as const }),
          isConnected: () => false,
          getVoiceChannelId: () => null,
          getReadableChannelIds: () => []
        } as never
      }
    );

    assert.match(replyComponents, /\/\//);
  });
});

describe("handleForceJoinCommand — confirmation shows current channel", () => {
  it("includes the current voice channel id in the confirmation lines", async () => {
    let replyComponents = "";

    await handleForceJoinCommand(
      {
        guildId: "guild-1",
        channelId: "text-1",
        user: { id: "owner-1" },
        guild: {
          ownerId: "owner-1",
          voiceAdapterCreator: {},
          members: {
            fetch: async () => ({
              voice: { channel: { id: "voice-new" } },
              roles: { cache: { map: () => [] } }
            })
          }
        },
        reply: async (msg: { components?: unknown[] }) => {
          replyComponents = JSON.stringify(msg.components ?? []);
        }
      } as never,
      {
        db: createSpeakerCommandDb() as never,
        ttsSessionManager: {
          join: async () => ({ status: "joined" as const }),
          isConnected: () => true,
          getVoiceChannelId: () => "voice-current",
          getReadableChannelIds: () => [],
          forceJoin: async () => ({ status: "joined" as const })
        } as never
      }
    );

    assert.match(replyComponents, /voice-current/);
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
