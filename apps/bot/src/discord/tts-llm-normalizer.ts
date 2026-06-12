const OLLAMA_PROMPT = (text: string) =>
  `あなたはDiscordメッセージをVOICEVOX音声合成用に変換するアシスタントです。
以下のテキストを声に出して読める自然な日本語に変換してください。

ルール:
- 英語略語はアルファベット読みに変換 (例: PC→ピーシー、AI→エーアイ、URL→ユーアールエル)
- 「w」「ww」「www」等は「笑い」に変換
- 「草」は「くさ」に変換
- 記号・顔文字は削除
- 漢字は文脈に合った読み方で自然に読む
- 変換後のテキストのみを出力すること。説明・注釈は不要

テキスト: ${text}`;

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface OllamaTextNormalizerOptions {
  ollamaUrl: string;
  model: string;
  isEnabled: (guildId: string) => Promise<boolean>;
  fetchFn?: FetchFn;
  timeoutMs?: number;
  maxCacheSize?: number;
}

export interface OllamaTextNormalizer {
  normalize: (text: string, guildId: string) => Promise<string>;
}

export function createOllamaTextNormalizer(
  options: OllamaTextNormalizerOptions
): OllamaTextNormalizer {
  const {
    ollamaUrl,
    model,
    isEnabled,
    fetchFn = fetch,
    timeoutMs = 10_000,
    maxCacheSize = 500
  } = options;

  const cache = new Map<string, string>();

  async function normalize(text: string, guildId: string): Promise<string> {
    if (!(await isEnabled(guildId))) {
      return text;
    }

    if (cache.has(text)) {
      return cache.get(text)!;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetchFn(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: OLLAMA_PROMPT(text), stream: false }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        console.warn("ollama normalization failed", { status: response.status, model, text });
        return text;
      }

      const data = (await response.json()) as { response: string };
      const normalized = data.response.trim();

      if (!normalized) {
        return text;
      }

      if (cache.size >= maxCacheSize) {
        const firstKey = cache.keys().next().value!;
        cache.delete(firstKey);
      }
      cache.set(text, normalized);

      return normalized;
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.warn("ollama normalization error", { error, model });
      }
      return text;
    }
  }

  return { normalize };
}
