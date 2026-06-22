import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAvatarUrl, fetchDiscordApiUser } from "./discord-user.js";

describe("buildAvatarUrl", () => {
  it("avatar hash がある場合は CDN URL を返す", () => {
    const url = buildAvatarUrl("123456789012345678", "abc123hash");
    assert.equal(
      url,
      "https://cdn.discordapp.com/avatars/123456789012345678/abc123hash.png?size=80"
    );
  });

  it("avatar hash がない場合はデフォルトアバター URL を返す", () => {
    const url = buildAvatarUrl("123456789012345678", null);
    assert.ok(url.startsWith("https://cdn.discordapp.com/embed/avatars/"));
    assert.ok(url.endsWith(".png"));
  });
});

describe("fetchDiscordApiUser", () => {
  it("404 の場合は null を返す", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({ status: 404, ok: false } as Response);
    const result = await fetchDiscordApiUser("123", "token", mockFetch);
    assert.equal(result, null);
  });

  it("429 でリトライ残なしの場合はエラーを投げる", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({ status: 429, ok: false, headers: new Headers() } as Response);
    await assert.rejects(
      () => fetchDiscordApiUser("123", "token", mockFetch, undefined, 0),
      /Discord API returned 429/
    );
  });

  it("正常レスポンスの場合はユーザー情報を返す", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({
        status: 200,
        ok: true,
        json: async () => ({
          id: "111222333444555666",
          username: "yuzuki",
          global_name: "Yuzuki",
          avatar: "abc123hash",
        }),
      } as Response);
    const result = await fetchDiscordApiUser("111222333444555666", "token", mockFetch);
    assert.equal(result?.id, "111222333444555666");
    assert.equal(result?.username, "yuzuki");
    assert.equal(result?.globalName, "Yuzuki");
    assert.ok(result?.avatarUrl.includes("abc123hash"));
  });

  it("avatar が null の場合はデフォルトアバター URL を返す", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({
        status: 200,
        ok: true,
        json: async () => ({
          id: "111222333444555666",
          username: "yuzuki",
          global_name: null,
          avatar: null,
        }),
      } as Response);
    const result = await fetchDiscordApiUser("111222333444555666", "token", mockFetch);
    assert.ok(result?.avatarUrl.startsWith("https://cdn.discordapp.com/embed/avatars/"));
  });
});
