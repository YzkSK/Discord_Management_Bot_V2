# Dashboard Redesign — Design Spec

Date: 2026-05-26  
Branch: feature/issue-111-modern-dashboard-visual-pass

## 概要

現行のダッシュボード UI をフルリデザインする。  
スタック（Next.js App Router / Tailwind / shadcn / socket.io）はそのまま維持し、
ビジュアルと情報アーキテクチャを一から書き直す。

### 方針
- **カラーテーマ**: ダーク系
- **アクセントカラー**: グリーン `#22c55e`
- **スタイル**: テック / 情報密度高（Grafana / Datadog 寄り）
- **情報構造**: 再設計（Guild選択を起点に統一）

---

## 1. 情報アーキテクチャ

### ページフロー

```
/login
  → /guild          新設。Guild選択ページ（ログイン後の起点）
    → /             Overview
    → /logs         Logs Explorer
    → /settings     Settings（Dashboard Access設定を追加）
```

### Guild コンテキスト

- `/guild` でGuildを選択し `localStorage` に保存。全ページに引き回す。
- サイドバー上部に選択済みGuild名と「切り替え」リンクを常時表示。
- `/logs` と `/settings` からGuild ID入力フォームを撤廃。
- Guild未選択（localStorage未設定）の場合は `/guild` にリダイレクト。

---

## 2. カラー & レイアウトシステム

### カラーパレット

| 用途 | 値 |
|---|---|
| 背景 | `#0f1117` |
| サーフェス（カード・サイドバー） | `#161b22` |
| サーフェス強調 | `#1c2128` |
| ボーダー | `#21262d` |
| テキスト主 | `#e6edf3` |
| テキスト副 | `#7d8590` |
| アクセント | `#22c55e` |
| アクセントホバー | `#16a34a` |
| エラー | `#f85149` |
| 警告 | `#d29922` |
| Discord ブランド | `#5865f2`（OAuth ボタン専用） |

### レイアウト構造

```
┌──────────────────────────────────────────┐
│ Sidebar 240px │ Main content             │
│               │  ┌─ Topbar ────────────┐ │
│  [Brand]      │  │ Page title + actions│ │
│  [Guild name] │  └─────────────────────┘ │
│  [Nav items]  │  ┌─ Content ───────────┐ │
│               │  │                     │ │
│  [User info]  │  └─────────────────────┘ │
└──────────────────────────────────────────┘
```

- サイドバー: ブランド → Guild名（切り替え可） → ナビゲーション → 下部にユーザーアバター + 名前
- メインコンテンツ: ページタイトル固定トップバー + コンテンツエリア
- フォント: Inter または system-ui（Arial から変更）

---

## 3. 各ページ詳細

### 3-1. Login（`/login`）

- フルスクリーン `#0f1117` 背景
- 中央にカード（サーフェス `#161b22`）
- "Sign in with Discord" ボタンは Discord ブランドカラー `#5865f2`
- ブランドロゴ / ボット名を中央上部に配置

### 3-2. Guild選択（`/guild`）— 新設

**表示条件（AND）:**
1. ユーザーが参加しているGuild（Discord OAuth `/users/@me/guilds`）
2. 下記いずれかの管理権限を持つ:
   - `owner === true`
   - `(parseInt(permissions) & 0x8) !== 0`（Discord ADMINISTRATOR ビット）
   - DBの `guildConfigs.dashboard_management_role_ids` に含まれるロールを保持
3. Botが加入済み（DBの `guilds` テーブルに存在する）

**UI:**
- 上部に検索ボックス
- Guild カードのグリッド（名前、Guild ID、Bot加入バッジ）
- 選択するとlocalStorageに保存して `/` へリダイレクト

**APIエンドポイント（新規）: `GET /api/guilds`**

処理フロー:
1. JWTから Discord アクセストークンを取得
2. `/users/@me/guilds` を呼び出し全Guild取得
3. ①owner ②ADMINISTRATORビットで即時パスするGuildを確定
4. 残りのGuildについてDB照合: `dashboard_management_role_ids` が設定されているGuildに絞る
5. 対象GuildのユーザーロールIDをBotトークンで取得し、管理ロールと照合
6. ①②③の合計と、DBに存在するGuild IDの積集合を返す

### 3-3. Overview（`/`）

- 上段: ステータスバー（今日のイベント総数 / リアルタイム接続状態 / Bot状態）
- 下段: 既存の検証フロー（Verification Flow）+ クイックアクション
- カードは `#161b22` 背景 / `#21262d` ボーダー

### 3-4. Logs Explorer（`/logs`）

- Guild ID入力フォームを撤廃（コンテキストから自動適用）
- フィルター行をコンパクト1行に集約（Search / Event / Actor + ボタン）
- イベント種別バッジを色分け（message系: blue / voice系: purple / audit系: orange / temp-vc系: teal / recruitment系: green）
- リアルタイム状態をサイドバーまたはトップバー右端に点滅インジケーターで表示
- テーブル行のホバー時に背景を `#1c2128` に変化
- 展開時のJSONビューアは行内インライン表示（コードブロック風）

### 3-5. Settings（`/settings`）

- Guild ID入力フォームを撤廃
- 既存設定（Guild情報 / Log Mode）はそのまま維持
- **新セクション: Dashboard Access**（オーナーのみ表示・編集可能）
  - Bot トークンで `GET /guilds/{id}/roles` を呼び出し、Guild の全ロール一覧を取得
  - チェックリスト or タグ選択UIでダッシュボードアクセスを許可するロールを選択
  - 保存時に `guildConfigs.dashboard_management_role_ids` を更新
  - オーナー判定: `authorizeDashboardApi` が返す `guild.owner === true`（Discord APIの`owner`フラグ）で確認。管理ロール設定はowner専用エンドポイントとして `requiredRole: "owner"` 相当の判定を追加する

---

## 4. DB変更

### `guildConfigs` への追加カラム

```sql
dashboard_management_role_ids text[] NOT NULL DEFAULT '{}'
```

- Drizzle スキーマ: `text("dashboard_management_role_ids").array().notNull().default(sql\`'{}'\`)`
- マイグレーションファイルを `packages/db` に追加

---

## 5. 新規・変更APIエンドポイント

| エンドポイント | 変更種別 | 内容 |
|---|---|---|
| `GET /api/guilds` | 新規 | Guild選択一覧（3条件フィルター + Bot加入確認） |
| `GET /api/settings` | 変更 | `dashboardManagementRoleIds` + `availableRoles`（ロール一覧）を追加 |
| `PATCH /api/settings` | 変更 | `dashboardManagementRoleIds` 更新対応（オーナーのみ） |

### 新規Discordユーティリティ関数（`discord-api.ts`）

- `fetchCurrentUserGuilds(accessToken)` — 新規追加。全件取得。既存の `fetchCurrentUserGuild(accessToken, guildId)` は `fetchCurrentUserGuildById` にリネームして衝突を回避
- `fetchGuildRoles(botToken, guildId)` — 新規追加。Guild の全ロール `{id, name}[]` を取得

---

## 6. コンポーネント構成（変更分）

| ファイル | 変更内容 |
|---|---|
| `globals.css` | カラー変数定義、フォント変更 |
| `components/ui/` | badge / button / card / table / input / select を新デザインに合わせて更新 |
| `dashboard-shell.tsx` | サイドバー + トップバー構造に刷新。Guild名表示追加 |
| `app/guild/page.tsx` | 新規作成 |
| `app/guild/guild-selector.tsx` | 新規作成（Clientコンポーネント） |
| `app/page.tsx` | ステータスバー追加 |
| `app/logs/logs-explorer.tsx` | Guild入力削除、バッジ色分け、インジケーター追加 |
| `app/settings/settings-panel.tsx` | Guild入力削除、Dashboard Accessセクション追加 |
| `app/api/guilds/route.ts` | 新規作成 |

---

## 7. 実装しないこと（スコープ外）

- ダークモード / ライトモード切り替えトグル（ダーク固定）
- Guild アイコン画像の表示（Discord CDN からの取得は行わない）
- Overview のリアルタイムイベントカウント更新（静的な初期値表示のみ）
