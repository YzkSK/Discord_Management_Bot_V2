import {
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  type DiscordGatewayAdapterCreator,
  type VoiceConnection
} from "@discordjs/voice";
import { Readable } from "node:stream";

export type TtsJoinStatus = "joined" | "already-connected" | "blocked";
export type TtsForceJoinStatus = "joined" | "already-connected" | "moved";

export interface TtsJoinInput {
  adapterCreator?: DiscordGatewayAdapterCreator;
  guildId: string;
  textChannelId: string;
  voiceChannelId: string;
}

export interface TtsVoiceAdapter {
  join: (input: TtsJoinInput) => Promise<void> | void;
  leave: (guildId: string) => void;
  play: (guildId: string, audio: Buffer) => Promise<void>;
}

export interface TtsSessionManagerOptions {
  voiceAdapter?: TtsVoiceAdapter;
}

interface TtsSession {
  temporaryTextChannelIds: Set<string>;
  voiceChannelId: string;
}

export class TtsSessionManager {
  private readonly sessions = new Map<string, TtsSession>();
  private readonly voiceAdapter: TtsVoiceAdapter;

  constructor(options: TtsSessionManagerOptions = {}) {
    this.voiceAdapter = options.voiceAdapter ?? createDiscordVoiceAdapter();
  }

  async join(input: TtsJoinInput): Promise<{ status: TtsJoinStatus }> {
    const existing = this.sessions.get(input.guildId);

    if (existing && existing.voiceChannelId !== input.voiceChannelId) {
      return { status: "blocked" };
    }

    if (existing) {
      existing.temporaryTextChannelIds.add(input.textChannelId);
      return { status: "already-connected" };
    }

    await this.voiceAdapter.join(input);
    this.sessions.set(input.guildId, {
      temporaryTextChannelIds: new Set([input.textChannelId]),
      voiceChannelId: input.voiceChannelId
    });

    return { status: "joined" };
  }

  async forceJoin(
    input: TtsJoinInput
  ): Promise<{ status: TtsForceJoinStatus }> {
    const existing = this.sessions.get(input.guildId);

    if (existing?.voiceChannelId === input.voiceChannelId) {
      existing.temporaryTextChannelIds.add(input.textChannelId);
      return { status: "already-connected" };
    }

    await this.voiceAdapter.join(input);
    this.sessions.set(input.guildId, {
      temporaryTextChannelIds: new Set([input.textChannelId]),
      voiceChannelId: input.voiceChannelId
    });

    return { status: existing ? "moved" : "joined" };
  }

  leave(guildId: string) {
    this.sessions.delete(guildId);
    this.voiceAdapter.leave(guildId);
  }

  isConnected(guildId: string) {
    return this.sessions.has(guildId);
  }

  getVoiceChannelId(guildId: string) {
    return this.sessions.get(guildId)?.voiceChannelId ?? null;
  }

  getReadableChannelIds(guildId: string, persistentTextChannelId?: string | null) {
    const session = this.sessions.get(guildId);

    if (!session) {
      return persistentTextChannelId ? [persistentTextChannelId] : [];
    }

    return Array.from(
      new Set([
        ...session.temporaryTextChannelIds,
        ...(persistentTextChannelId ? [persistentTextChannelId] : [])
      ])
    );
  }

  async play(guildId: string, audio: Buffer) {
    if (!this.isConnected(guildId)) {
      return;
    }

    await this.voiceAdapter.play(guildId, audio);
  }
}

function createDiscordVoiceAdapter(): TtsVoiceAdapter {
  const connections = new Map<string, VoiceConnection>();

  return {
    join(input) {
      if (!input.adapterCreator) {
        throw new Error("Missing Discord voice adapter creator.");
      }

      const connection = joinVoiceChannel({
        adapterCreator: input.adapterCreator,
        channelId: input.voiceChannelId,
        guildId: input.guildId,
        selfDeaf: false
      });
      connections.set(input.guildId, connection);
    },
    leave(guildId) {
      const connection = connections.get(guildId) ?? getVoiceConnection(guildId);
      connection?.destroy();
      connections.delete(guildId);
    },
    async play(guildId, audio) {
      const connection = connections.get(guildId) ?? getVoiceConnection(guildId);

      if (!connection) {
        return;
      }

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play
        }
      });
      const resource = createAudioResource(Readable.from(audio), {
        inputType: StreamType.Arbitrary
      });
      connection.subscribe(player);
      player.play(resource);
    }
  };
}
