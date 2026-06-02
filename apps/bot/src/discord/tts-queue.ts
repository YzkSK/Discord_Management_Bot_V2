export interface TtsQueueJobInput {
  guildId: string;
}

export interface TtsPlaybackQueue {
  enqueue: <T>(
    input: TtsQueueJobInput,
    job: () => Promise<T>
  ) => Promise<T>;
}

export class LocalTtsPlaybackQueue implements TtsPlaybackQueue {
  private readonly guildTails = new Map<string, Promise<void>>();

  async enqueue<T>(
    input: TtsQueueJobInput,
    job: () => Promise<T>
  ): Promise<T> {
    const previous = this.guildTails.get(input.guildId) ?? Promise.resolve();

    let releaseTail!: () => void;
    const currentTail = new Promise<void>((resolve) => {
      releaseTail = resolve;
    });

    const queuedTail = previous.catch(() => undefined).then(() => currentTail);
    this.guildTails.set(input.guildId, queuedTail);

    await previous.catch(() => undefined);

    try {
      return await job();
    } finally {
      releaseTail();
      if (this.guildTails.get(input.guildId) === queuedTail) {
        this.guildTails.delete(input.guildId);
      }
    }
  }
}
