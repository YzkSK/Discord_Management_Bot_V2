import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChannelType, PermissionFlagsBits, RESTJSONErrorCodes } from "discord.js";

import {
  createTempVoiceDiscordChannel,
  createTempVoiceChannelPermissionOverwrites,
  createTempVoiceOwnerTransferredEvent,
  formatTempVoiceChannelName,
  formatTempVoiceControlChannelName,
  selectNextTempVoiceOwner
} from "./temp-voice.js";
import {
  isTempVoiceAuditReason,
  shouldSuppressTempVoiceChannelLog,
  suppressTempVoiceChannelLog,
  tempVoiceControlCreateReason,
  tempVoiceCreateReason,
  tempVoiceDeleteReason
} from "./temp-voice-log-suppression.js";

describe("formatTempVoiceChannelName", () => {
  it("formats the generated temp voice channel name", () => {
    assert.equal(formatTempVoiceChannelName("Yuzuki"), "🎮 Yuzuki");
  });

  it("formats the generated control channel name", () => {
    assert.equal(
      formatTempVoiceControlChannelName("Yuzuki"),
      "control-🎮 Yuzuki"
    );
  });
  it("detects temp voice audit reasons for generic log suppression", () => {
    assert.equal(isTempVoiceAuditReason(tempVoiceCreateReason), true);
    assert.equal(isTempVoiceAuditReason(tempVoiceControlCreateReason), true);
    assert.equal(isTempVoiceAuditReason(tempVoiceDeleteReason), true);
    assert.equal(isTempVoiceAuditReason("regular channel change"), false);
    assert.equal(isTempVoiceAuditReason(null), false);
  });

  it("suppresses a temp voice channel log once", () => {
    suppressTempVoiceChannelLog("channel-1");

    assert.equal(shouldSuppressTempVoiceChannelLog("channel-1"), true);
    assert.equal(shouldSuppressTempVoiceChannelLog("channel-1"), false);
  });

  it("expires temp voice channel log suppression", () => {
    suppressTempVoiceChannelLog("channel-2", -1);

    assert.equal(shouldSuppressTempVoiceChannelLog("channel-2"), false);
  });

  it("selects the earliest active non-current owner as next Temp VC owner", () => {
    const nextOwner = selectNextTempVoiceOwner(
      [
        {
          joinOrder: 0,
          joinedAt: new Date("2026-06-02T00:00:00.000Z"),
          userId: "owner-1"
        },
        {
          joinOrder: 1,
          joinedAt: new Date("2026-06-02T00:00:01.000Z"),
          userId: "user-2"
        },
        {
          joinOrder: 2,
          joinedAt: new Date("2026-06-02T00:00:01.000Z"),
          userId: "user-3"
        }
      ],
      "owner-1"
    );

    assert.equal(nextOwner?.userId, "user-2");
  });

  it("returns null when there are no active members", () => {
    const nextOwner = selectNextTempVoiceOwner([], "owner-1");
    assert.equal(nextOwner, null);
  });

  it("returns null when the only active member is the current owner", () => {
    const nextOwner = selectNextTempVoiceOwner(
      [{ joinOrder: 0, joinedAt: new Date(), userId: "owner-1" }],
      "owner-1"
    );
    assert.equal(nextOwner, null);
  });

  it("creates a Temp VC owner transferred log event", () => {
    const event = createTempVoiceOwnerTransferredEvent({
      callSessionId: "call-1",
      channelId: "voice-1",
      controlChannelId: "control-1",
      guildId: "guild-1",
      nextOwnerId: "user-2",
      previousOwnerId: "owner-1",
      tempVoiceChannelName: "Room"
    });

    assert.equal(event.eventName, "voice.temp.owner_transferred");
    assert.equal(event.actorId, "user-2");
    assert.deepEqual(event.payload, {
      callSessionId: "call-1",
      controlChannelId: "control-1",
      nextOwnerId: "user-2",
      previousOwnerId: "owner-1",
      tempVoiceChannelId: "voice-1",
      tempVoiceChannelName: "Room"
    });
  });

  it("grants the bot access to manage generated Temp VC channels", () => {
    const overwrites = createTempVoiceChannelPermissionOverwrites({
      botMemberId: "bot-1"
    });

    assert.deepEqual(overwrites, [
      {
        id: "bot-1",
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageRoles,
          PermissionFlagsBits.Connect
        ]
      }
    ]);
  });

  it("falls back to creating a Temp VC outside the category when category creation is forbidden", async () => {
    const createCalls: unknown[] = [];
    const createdChannel = { id: "voice-1" };
    const guild = {
      id: "guild-1",
      channels: {
        create: async (options: unknown) => {
          createCalls.push(options);
          if (createCalls.length === 1) {
            throw { code: RESTJSONErrorCodes.MissingPermissions };
          }
          return createdChannel;
        }
      }
    };

    const channel = await createTempVoiceDiscordChannel(guild as never, {
      botMemberId: "bot-1",
      categoryId: "category-1",
      displayName: "Yuzuki"
    });

    assert.equal(channel, createdChannel);
    assert.deepEqual(
      createCalls.map((call) => "parent" in (call as Record<string, unknown>)),
      [true, false]
    );
    assert.equal((createCalls[1] as { type: ChannelType }).type, ChannelType.GuildVoice);
  });

  it("falls back to creating a Temp VC without permission overwrites when overwrite creation is forbidden", async () => {
    const createCalls: unknown[] = [];
    const createdChannel = { id: "voice-1" };
    const guild = {
      id: "guild-1",
      channels: {
        create: async (options: unknown) => {
          createCalls.push(options);
          if ("permissionOverwrites" in (options as Record<string, unknown>)) {
            throw { code: RESTJSONErrorCodes.MissingPermissions };
          }
          return createdChannel;
        }
      }
    };

    const channel = await createTempVoiceDiscordChannel(guild as never, {
      botMemberId: "bot-1",
      categoryId: "category-1",
      displayName: "Yuzuki"
    });

    assert.equal(channel, createdChannel);
    assert.deepEqual(
      createCalls.map((call) => "permissionOverwrites" in (call as Record<string, unknown>)),
      [true, true, false]
    );
    assert.equal((createCalls[2] as { parent: string }).parent, "category-1");
  });
});
