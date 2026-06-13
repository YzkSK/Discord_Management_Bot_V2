import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PermissionFlagsBits, type GuildBasedChannel } from "discord.js";

import {
  createTempVoiceControlMessage,
  getTempVoiceState,
  handleTempVoiceControlInteraction,
  parseTempVoiceControlCustomId,
  toTempVoiceControlCustomId
} from "./temp-voice-controls.js";

describe("Temp VC control custom ids", () => {
  it("round-trips a Temp VC control action", () => {
    const customId = toTempVoiceControlCustomId({
      action: "lock",
      channelId: "voice-1"
    });

    assert.equal(customId, "temp-vc:lock:voice-1");
    assert.deepEqual(parseTempVoiceControlCustomId(customId), {
      action: "lock",
      channelId: "voice-1"
    });
  });

  it("ignores unrelated custom ids", () => {
    assert.equal(parseTempVoiceControlCustomId("tts-force-join:g:u:t:v"), null);
  });
});

describe("createTempVoiceControlMessage", () => {
  it("creates a Components V2 control surface with owner actions", () => {
    const message = createTempVoiceControlMessage({
      ownerId: "owner-1",
      tempVoiceChannelId: "voice-1"
    });
    const serialized = JSON.stringify(message);

    assert.equal(Number(message.flags), 32768);
    assert.match(serialized, /Temp VC/);
    assert.match(serialized, /temp-vc:rename:voice-1/);
    assert.match(serialized, /temp-vc:lock:voice-1/);
    assert.match(serialized, /temp-vc:hide:voice-1/);
    assert.match(serialized, /temp-vc:user-limit:voice-1/);
    assert.match(serialized, /temp-vc:user-management:voice-1/);
  });
});

describe("handleTempVoiceControlInteraction", () => {
  it("rejects users who are not the Temp VC owner", async () => {
    const replies: unknown[] = [];
    const handled = await handleTempVoiceControlInteraction(
      fakeButtonInteraction({
        action: "lock",
        channelId: "voice-1",
        replies,
        userId: "user-2"
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );

    assert.equal(handled, true);
    assert.match(JSON.stringify(replies[0]), /Only the Temp VC owner/);
  });

  it("locks and unlocks the generated voice channel for everyone", async () => {
    const overwrites: unknown[] = [];
    const channel = fakeVoiceChannel({ overwrites });

    await handleTempVoiceControlInteraction(
      fakeButtonInteraction({
        action: "lock",
        channel,
        channelId: "voice-1",
        userId: "owner-1"
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );
    await handleTempVoiceControlInteraction(
      fakeButtonInteraction({
        action: "unlock",
        channel,
        channelId: "voice-1",
        userId: "owner-1"
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );

    assert.deepEqual(overwrites, [
      { id: "everyone", permissions: { Connect: false } },
      { id: "everyone", permissions: { Connect: null } }
    ]);
  });

  it("hides and shows the generated voice channel for everyone", async () => {
    const overwrites: unknown[] = [];
    const channel = fakeVoiceChannel({ overwrites });

    await handleTempVoiceControlInteraction(
      fakeButtonInteraction({
        action: "hide",
        channel,
        channelId: "voice-1",
        userId: "owner-1"
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );
    await handleTempVoiceControlInteraction(
      fakeButtonInteraction({
        action: "show",
        channel,
        channelId: "voice-1",
        userId: "owner-1"
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );

    assert.deepEqual(overwrites, [
      { id: "everyone", permissions: { ViewChannel: false } },
      { id: "everyone", permissions: { ViewChannel: null } }
    ]);
  });

  it("opens forms for rename and user limit", async () => {
    for (const action of ["rename", "user-limit"] as const) {
      const modals: unknown[] = [];

      await handleTempVoiceControlInteraction(
        fakeButtonInteraction({
          action,
          channelId: "voice-1",
          modals,
          userId: "owner-1"
        }),
        {
          db: {} as never,
          getTempVoiceChannel: async () => ({
            channelId: "voice-1",
            ownerId: "owner-1"
          })
        }
      );

      assert.match(JSON.stringify(modals[0]), new RegExp(`temp-vc:${action}:voice-1`));
    }
  });

  it("renames the generated voice channel from modal input", async () => {
    const names: string[] = [];
    const channel = fakeVoiceChannel({ names });

    await handleTempVoiceControlInteraction(
      fakeModalInteraction({
        action: "rename",
        channel,
        channelId: "voice-1",
        textValue: "New Room",
        userId: "owner-1"
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );

    assert.deepEqual(names, ["New Room"]);
  });

  it("updates user limit from modal input", async () => {
    const userLimits: number[] = [];
    const channel = fakeVoiceChannel({ userLimits });

    await handleTempVoiceControlInteraction(
      fakeModalInteraction({
        action: "user-limit",
        channel,
        channelId: "voice-1",
        textValue: "8",
        userId: "owner-1"
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );

    assert.deepEqual(userLimits, [8]);
  });

  it("shows user management action buttons when a user is selected", async () => {
    const updates: unknown[] = [];

    await handleTempVoiceControlInteraction(
      fakeUserSelectInteraction({
        channelId: "voice-1",
        selectedUserId: "user-2",
        updates
      }),
      {
        db: {} as never,
        getTempVoiceChannel: async () => ({
          channelId: "voice-1",
          ownerId: "owner-1"
        })
      }
    );

    const serialized = JSON.stringify(updates[0]);
    assert.match(serialized, /temp-vc:kick-target:voice-1:user-2/);
    assert.match(serialized, /temp-vc:allow-target:voice-1:user-2/);
    assert.match(serialized, /temp-vc:deny-target:voice-1:user-2/);
  });
});

describe("createTempVoiceControlMessage — state toggle", () => {
  it("shows only 🔓 解除 when isLocked is true", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: true,
      isHidden: false
    });
    const s = JSON.stringify(msg);

    assert.doesNotMatch(s, /temp-vc:lock:v1/);
    assert.match(s, /temp-vc:unlock:v1/);
  });

  it("shows only 🔒 ロック when isLocked is false", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: false,
      isHidden: false
    });
    const s = JSON.stringify(msg);

    assert.match(s, /temp-vc:lock:v1/);
    assert.doesNotMatch(s, /temp-vc:unlock:v1/);
  });

  it("shows only 👁️ 表示 when isHidden is true", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: false,
      isHidden: true
    });
    const s = JSON.stringify(msg);

    assert.doesNotMatch(s, /temp-vc:hide:v1/);
    assert.match(s, /temp-vc:show:v1/);
  });

  it("shows status line in header", () => {
    const msg = createTempVoiceControlMessage({
      ownerId: "o1",
      tempVoiceChannelId: "v1",
      isLocked: true,
      isHidden: false
    });
    const s = JSON.stringify(msg);

    assert.match(s, /🔒/);
    assert.match(s, /👁️/);
  });
});

describe("getTempVoiceState", () => {
  it("returns isLocked true when @everyone has Connect denied", () => {
    const channel = {
      permissionOverwrites: {
        cache: new Map([
          ["everyone-id", { type: 0, deny: { has: (f: bigint) => f === PermissionFlagsBits.Connect } }]
        ])
      }
    } as unknown as GuildBasedChannel;
    const state = getTempVoiceState(channel);
    assert.equal(state.isLocked, true);
    assert.equal(state.isHidden, false);
  });

  it("returns isHidden true when @everyone has ViewChannel denied", () => {
    const channel = {
      permissionOverwrites: {
        cache: new Map([
          ["everyone-id", { type: 0, deny: { has: (f: bigint) => f === PermissionFlagsBits.ViewChannel } }]
        ])
      }
    } as unknown as GuildBasedChannel;
    const state = getTempVoiceState(channel);
    assert.equal(state.isLocked, false);
    assert.equal(state.isHidden, true);
  });

  it("returns both false when no overwrites", () => {
    const channel = {
      permissionOverwrites: { cache: new Map() }
    } as unknown as GuildBasedChannel;
    const state = getTempVoiceState(channel);
    assert.equal(state.isLocked, false);
    assert.equal(state.isHidden, false);
  });
});

function fakeButtonInteraction(input: {
  action: Parameters<typeof toTempVoiceControlCustomId>[0]["action"];
  channel?: unknown;
  channelId: string;
  modals?: unknown[];
  replies?: unknown[];
  userId: string;
}) {
  const replies = input.replies ?? [];
  const modals = input.modals ?? [];

  return {
    customId: toTempVoiceControlCustomId({
      action: input.action,
      channelId: input.channelId
    }),
    guild: {
      channels: {
        fetch: async () => input.channel ?? fakeVoiceChannel()
      },
      roles: {
        everyone: {
          id: "everyone"
        }
      }
    },
    reply: async (reply: unknown) => {
      replies.push(reply);
    },
    showModal: async (modal: unknown) => {
      modals.push(modal);
    },
    user: {
      id: input.userId
    }
  } as never;
}

function fakeModalInteraction(input: {
  action: Parameters<typeof toTempVoiceControlCustomId>[0]["action"];
  channel?: unknown;
  channelId: string;
  replies?: unknown[];
  textValue: string;
  userId: string;
}) {
  const replies = input.replies ?? [];

  return {
    customId: toTempVoiceControlCustomId({
      action: input.action,
      channelId: input.channelId
    }),
    fields: {
      getTextInputValue: () => input.textValue
    },
    guild: {
      channels: {
        fetch: async () => input.channel ?? fakeVoiceChannel()
      },
      roles: {
        everyone: {
          id: "everyone"
        }
      }
    },
    reply: async (reply: unknown) => {
      replies.push(reply);
    },
    user: {
      id: input.userId
    }
  } as never;
}

function fakeUserSelectInteraction(input: {
  channelId: string;
  selectedUserId: string;
  updates?: unknown[];
  userId?: string;
}) {
  const updates = input.updates ?? [];

  return {
    customId: toTempVoiceControlCustomId({
      action: "user-management-select",
      channelId: input.channelId
    }),
    guild: {
      channels: {
        fetch: async () => fakeVoiceChannel()
      },
      roles: {
        everyone: {
          id: "everyone"
        }
      }
    },
    update: async (update: unknown) => {
      updates.push(update);
    },
    user: {
      id: input.userId ?? "owner-1"
    },
    values: [input.selectedUserId]
  } as never;
}

function fakeVoiceChannel(
  input: {
    bitrates?: number[];
    names?: string[];
    overwrites?: unknown[];
    userLimits?: number[];
  } = {}
) {
  const overwrites = input.overwrites ?? [];

  return {
    isVoiceBased: () => true,
    permissionOverwrites: {
      edit: async (id: string, permissions: unknown) => {
        overwrites.push({ id, permissions });
      }
    },
    setBitrate: async (bitrate: number) => {
      input.bitrates?.push(bitrate);
    },
    setName: async (name: string) => {
      input.names?.push(name);
    },
    setUserLimit: async (limit: number) => {
      input.userLimits?.push(limit);
    }
  };
}
