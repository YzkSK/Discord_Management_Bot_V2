export interface NormalizeTtsTextInput {
  authorIsBot?: boolean;
  content: string;
  maxLength?: number;
}

export interface VoicevoxClient {
  synthesize: (text: string) => Promise<Buffer>;
}

export interface CreateVoicevoxClientInput {
  baseUrl: string;
  fetch?: typeof fetch;
  speaker?: number;
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
  const speaker = input.speaker ?? 1;

  return {
    async synthesize(text: string) {
      const query = await requestAudioQuery(fetchImpl, baseUrl, speaker, text);
      return requestSynthesis(fetchImpl, baseUrl, speaker, query);
    }
  };
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
