# Dashboard アクセス制御

## ロール

3 つの有効なロールがあり、以下の優先順位で解決される。

| ロール | 権限 |
|---|---|
| `owner` | フルアクセス: 閲覧、設定変更、Dashboard グラント管理 |
| `admin` | Dashboard データの閲覧とギルド設定の変更 |
| `viewer` | Dashboard データの閲覧のみ |

ロールチェックは階層的。`owner` は `admin` と `viewer` を満たし、`admin` は `viewer` を満たす。

## owner の判定

`owner` は Dashboard グラントとして保存されない。ユーザーの Discord ユーザーIDがそのギルドの Discord サーバーオーナーのユーザーIDと一致する場合に `owner` として扱われる。

サーバーオーナーは `/setup` コマンドなしで全 Dashboard ページにアクセスできる。

## Admin と Viewer のグラント

`admin` と `viewer` は `dashboardAccessGrants` に保存される明示的なグラント。

グラントのターゲット:

- `user` — 特定の Discord ユーザーID
- `role` — Discord ロールID

ユーザーが複数のグラントに一致する場合、最も高いロールが適用される。

サーバーオーナーは `/settings` → **Dashboard アクセス** からグラントを管理できる。

## ストレージ

`dashboardAccessGrants` テーブル:

| カラム | 型 | 説明 |
|---|---|---|
| `guildId` | text | Discord ギルドID |
| `targetType` | `user` \| `role` | グラントのターゲット種別 |
| `targetId` | text | Discord ユーザーIDまたはロールID |
| `role` | `viewer` \| `admin` | 付与するロール |

`(guildId, targetType, targetId)` の組み合わせはユニーク。

## 保護されたルート

未認証ユーザーは `/login` にリダイレクトされる。

API は JSON エラーを返す:

| コード | 条件 |
|---|---|
| `400` | 必須の `guildId` が欠けている |
| `401` | 認証されていない |
| `403` | 認証済みだがこのギルドへのアクセス権がない |

## 認証セットアップ（ローカル開発）

Discord Developer Portal での設定:

1. OAuth2 リダイレクトURIに `http://localhost:3000/api/auth/callback/discord` を追加する。
2. 以下の環境変数を設定する。
   ```env
   DISCORD_CLIENT_ID=...
   DISCORD_CLIENT_SECRET=...
   NEXTAUTH_SECRET=...
   NEXTAUTH_URL=http://localhost:3000
   ```
3. ロールベースのグラントを解決できるよう Bot をテストギルドに招待する。
4. 最初のオーナーレベル確認にはサーバーオーナーのアカウントを使用する。

## Settings API

### `GET /api/settings?guildId=<id>`

`viewer` 以上のアクセスが必要。

レスポンス:

```json
{
  "guildId": "123",
  "guildName": "Example",
  "logMode": "full",
  "language": "ja",
  "features": {
    "logs": {
      "logMode": "full",
      "language": "ja"
    },
    "tempVc": {
      "createChannelId": "111",
      "categoryId": "222",
      "configured": true
    },
    "recruitment": {
      "channelId": "333",
      "configured": true
    },
    "tts": {
      "textChannelId": "444",
      "configured": true
    }
  }
}
```

### `PATCH /api/settings`

`admin` または `owner` のアクセスが必要。

ログセクション:

```json
{
  "guildId": "123",
  "logMode": "metadata_only",
  "language": "ja"
}
```

Temp VC セクション:

```json
{
  "guildId": "123",
  "section": "tempVc",
  "values": {
    "createChannelId": "111",
    "categoryId": "222"
  }
}
```

TTS セクション:

```json
{
  "guildId": "123",
  "section": "tts",
  "values": {
    "textChannelId": "444"
  }
}
```

## Dashboard アクセス API

すべてのエンドポイントは `owner` アクセスが必要。

### `GET /api/dashboard-access?guildId=<id>`

ギルドの全グラントを返す。

### `POST /api/dashboard-access`

新しいグラントを作成する。

```json
{
  "guildId": "123",
  "targetType": "role",
  "targetId": "456",
  "role": "admin"
}
```

### `PATCH /api/dashboard-access`

既存のグラントを更新する（POST と同じペイロード）。

### `DELETE /api/dashboard-access`

グラントを削除する。

```json
{
  "guildId": "123",
  "targetType": "role",
  "targetId": "456"
}
```

## Dashboard 管理ロール

`guildConfigs.dashboardManagementRoleIds` は、明示的な `dashboardAccessGrants` 行なしに Dashboard `admin` として扱われる Discord ロールIDのリスト（任意）。

この設定はオーナーのみが変更でき、`/settings` → **Dashboard アクセス** から管理する。
