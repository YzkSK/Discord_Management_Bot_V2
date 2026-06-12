import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createOllamaTextNormalizer } from "./tts-llm-normalizer.js";

describe("createOllamaTextNormalizer", () => {
  it("returns original text when LLM is disabled for the guild", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async (_guildId) => false,
      fetchFn: async () => { throw new Error("should not be called"); }
    });

    const result = await normalizer.normalize("テストAI", "guild-1");
    assert.equal(result, "テストAI");
  });

  it("returns normalized text from Ollama when enabled", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async (_guildId) => true,
      fetchFn: async (_url, _init) => ({
        ok: true,
        json: async () => ({ response: "テストエーアイ" })
      } as Response)
    });

    const result = await normalizer.normalize("テストAI", "guild-1");
    assert.equal(result, "テストエーアイ");
  });

  it("falls back to original text when Ollama returns non-ok response", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async (_guildId) => true,
      fetchFn: async () => ({ ok: false } as Response)
    });

    const result = await normalizer.normalize("テストAI", "guild-1");
    assert.equal(result, "テストAI");
  });

  it("falls back to original text when fetch throws", async () => {
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async (_guildId) => true,
      fetchFn: async () => { throw new Error("connection refused"); }
    });

    const result = await normalizer.normalize("テストAI", "guild-1");
    assert.equal(result, "テストAI");
  });

  it("caches results so Ollama is called only once for the same input", async () => {
    let callCount = 0;
    const normalizer = createOllamaTextNormalizer({
      ollamaUrl: "http://localhost:11434",
      model: "gemma2:2b",
      isEnabled: async (_guildId) => true,
      fetchFn: async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({ response: "キャッシュテスト" })
        } as Response;
      }
    });

    await normalizer.normalize("同じテキスト", "guild-1");
    await normalizer.normalize("同じテキスト", "guild-1");
    assert.equal(callCount, 1);
  });
});
