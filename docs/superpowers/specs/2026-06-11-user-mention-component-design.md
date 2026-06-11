# UserMention コンポーネント設計書

**日付:** 2026-06-11  
**対象:** ダッシュボード全体  
**スコープ:** Discordメンション風ユーザー表示 + クリックでプロフィールポップオーバー

---

## 背景と目的

現状、ログや各ページでユーザーを表示する際は `actorName`（表示名の文字列）をテキストとして直接レンダリングしているだけ。Discord IDは内部キーとしてのみ保持され、ユーザーがユーザー名やIDを確認する手段がない。

**目的:** Discordのメンション（`@Yuzuki`）風のインタラクティブなコンポーネントを追加し、クリックでアバター・ユーザー名・IDを含むポップオーバーカードを表示する。

---

## コンポーネント設計

### `<UserMention>`

**ファイル:** `apps/dashboard/src/components/user-mention.tsx`

**Props:**
```typescript
interface UserMentionProps {
  userId: string;       // Discord ユーザーID（actorId）
  actorName: string;    // 表示名（ペイロードから抽出済みのもの）
}
```

**見た目（トリガー部分）:**
```
[@Yuzuki]
```
- 背景: `bg-indigo-500/20`、テキスト: `text-indigo-300`、角丸: `rounded`
- ホバー時: `bg-indigo-500/30`
- インラインテキストに自然に溶け込むよう `inline-flex items-center`

**ポップオーバーカード:**
```
[アバター 40px]  Yuzuki
                 @yuzukimt
                 123456789012345678  [コピーアイコン]
```
- カード: `bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl`
- アバター: `w-10 h-10 rounded-full`
- 表示名: `text-sm font-semibold text-zinc-100`
- ユーザー名: `text-xs text-zinc-400`
- ID + コピーボタン: `text-xs text-zinc-500 font-mono` + Lucide `Copy` アイコン

---

## APIエンドポイント

### `GET /api/discord/users/[userId]`

**ファイル:** `apps/dashboard/src/app/api/discord/users/[userId]/route.ts`

**認証:** `getDashboardSession()` でログイン済みチェック（未認証は 401）

**処理:**
1. Discord REST API `GET /users/{userId}` をBotトークン（`DISCORD_BOT_TOKEN`）で呼ぶ
2. レスポンスを整形して返す

**レスポンス型:**
```typescript
interface DiscordUserResponse {
  id: string;
  username: string;         // @username
  globalName: string | null; // 表示名（global_name）
  avatarUrl: string;        // CDN URL または デフォルトアバターURL
}
```

**アバターURL構築:**
- avatarHashあり: `https://cdn.discordapp.com/avatars/{id}/{hash}.png?size=80`
- avatarHashなし: `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) % 5n)}.png`

**エラーハンドリング:**
- Discord API が 404: `{ id, username: "Unknown User", globalName: null, avatarUrl: デフォルト }`
- Discord API が 429 / 5xx: 500 を返す

---

## キャッシュ戦略

`UserMention` コンポーネント内ではなく、`src/components/user-cache.ts` にシングルトンの `Map<string, DiscordUserResponse>` を持つ。

```typescript
// ページ滞在中のみ有効（永続化なし）
const userCache = new Map<string, DiscordUserResponse>();
```

同一ページ内で同じユーザーIDのメンションが複数あっても fetchは1回だけ。

---

## 既存コードへの接続

`formatEventDescription()` は文字列を返すため、その中に React コンポーネントを埋め込めない。`<UserMention>` をイベント説明のインラインに配置するため、`src/lib/event-display.ts` に JSX を返す `formatEventDescriptionJSX()` を追加する。

```typescript
// 戻り値: ReactNode（例: <><UserMention .../> が #General に参加</>）
function formatEventDescriptionJSX(
  eventName: string,
  params: { actorId: string | null; actorName: string | null; ... }
): ReactNode
```

- `actorId` がある箇所は `<UserMention userId={actorId} actorName={actorName ?? actorId} />` に置き換え
- `actorId` がない箇所は `actorName` をそのままテキストとして使う
- `formatEventDescription()` 自体は変更しない（文字列APIを維持）

**対象ファイル（formatEventDescriptionJSX に切り替え）:**
- `apps/dashboard/src/app/logs/logs-explorer.tsx`
- `apps/dashboard/src/app/overview-client.tsx`

---

## 依存パッケージ

`@radix-ui/react-popover` を `apps/dashboard/package.json` に追加。

---

## 検証方法

1. ログページでユーザー名部分をクリック → ポップオーバーが開く
2. アバター・ユーザー名・IDが表示される
3. コピーボタンでIDがクリップボードに入る
4. 同じユーザーを2回クリックしても fetchは1回だけ（DevToolsのNetworkタブで確認）
5. 画面端でポップオーバーが画面外にはみ出さない（Radix UIが自動対応）
6. 概要ページでも同様に機能する
