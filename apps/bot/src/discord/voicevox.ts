export interface NormalizeTtsTextInput {
  authorIsBot?: boolean;
  content: string;
  maxLength?: number;
}

export interface VoicevoxClient {
  synthesize: (text: string, speaker?: number) => Promise<Buffer>;
}

export interface CreateVoicevoxClientInput {
  baseUrl: string;
  fetch?: typeof fetch;
  retry?: VoicevoxRetryOptions;
  speaker?: number;
}

export interface VoicevoxRetryOptions {
  baseDelayMs?: number;
  maxAttempts?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

interface AudioQueryResponse {
  [key: string]: unknown;
}

export function normalizeTtsText(input: NormalizeTtsTextInput) {
  if (input.authorIsBot) {
    return null;
  }

  const normalized = input.content.replace(/\s+/g, " ").trim();

  if (!normalized || normalized.startsWith("/")) {
    return null;
  }

  const maxLength = input.maxLength ?? 120;
  return normalized.slice(0, maxLength);
}

export function createVoicevoxClient(
  input: CreateVoicevoxClientInput
): VoicevoxClient {
  const fetchImpl = input.fetch ?? fetch;
  const baseUrl = input.baseUrl.replace(/\/$/, "");
  const retry = normalizeRetryOptions(input.retry);
  const speaker = input.speaker ?? 1;

  return {
    async synthesize(text: string, speakerOverride?: number) {
      const resolvedSpeaker = speakerOverride ?? speaker;
      return withRetry(
        async () => {
          const query = await requestAudioQuery(
            fetchImpl,
            baseUrl,
            resolvedSpeaker,
            text
          );
          return requestSynthesis(fetchImpl, baseUrl, resolvedSpeaker, query);
        },
        retry
      );
    }
  };
}

function normalizeRetryOptions(options: VoicevoxRetryOptions = {}) {
  return {
    baseDelayMs: options.baseDelayMs ?? 250,
    maxAttempts: Math.max(1, options.maxAttempts ?? 3),
    sleep: options.sleep ?? sleep
  };
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: Required<VoicevoxRetryOptions>
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= options.maxAttempts) {
        break;
      }

      await options.sleep(options.baseDelayMs * attempt);
    }
  }

  throw lastError;
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function requestAudioQuery(
  fetchImpl: typeof fetch,
  baseUrl: string,
  speaker: number,
  text: string
) {
  const url = new URL(`${baseUrl}/audio_query`);
  url.searchParams.set("speaker", String(speaker));
  url.searchParams.set("text", text);

  const response = await fetchImpl(url, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`VOICEVOX audio_query failed (${response.status})`);
  }

  return (await response.json()) as AudioQueryResponse;
}

async function requestSynthesis(
  fetchImpl: typeof fetch,
  baseUrl: string,
  speaker: number,
  query: AudioQueryResponse
) {
  const url = new URL(`${baseUrl}/synthesis`);
  url.searchParams.set("speaker", String(speaker));

  const response = await fetchImpl(url, {
    body: JSON.stringify(query),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`VOICEVOX synthesis failed (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}
