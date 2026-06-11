# UI/UX 全面リデザイン設計書

**日付:** 2026-06-11  
**対象:** Discord Bot + Web ダッシュボード  
**スコープ:** 全ページ完全作り直し（API ルート・DB アクセスは流用）

---

## 背景と目的

現状のダッシュボードとBotメッセージには以下の根本的な問題がある：

- ログに生 JSON・生 ID が表示され、一般メンバーには意味不明
- データが数字だけで「良いのか悪いのか」が判断できない
- ナビゲーション構造がフラットで直感的でない
- 設定変更のフローが複雑（セクションごとに保存ボタン）
- Botメッセージがデザイン・言語ともにバラバラ
- タイムスタンプが ISO 8601 形式のまま表示される

**目的:** 一般メンバーを含む全ユーザーが迷わず使えるUIに刷新する。

---

## アプローチ

**Approach B: 完全リビルド**  
- API ルート (`apps/dashboard/src/app/api/`) は再利用
- ページコンポーネント・UIコンポーネント・表示ロジックを全て書き直す
- Bot メッセージのフォーマットも統一デザインに書き直す

---

## Section 1: 基盤（デザインシステム＋ナビゲーション）

### デザイントークン追加

既存のダーク Zinc ベース（zinc-950/zinc-900）は維持しつつ追加：

**タイポグラフィスケール**（`src/lib/typography.ts` に定義）
- `heading-xl`: 24px/700 — ページタイトル
- `heading-lg`: 20px/600 — セクション見出し
- `heading-md`: 16px/600 — カード見出し
- `body`: 14px/400 — 本文
- `label`: 13px/500 — ラベル
- `caption`: 12px/400 — 補足テキスト

**セマンティックカラー**（Tailwind CSS 変数として定義）
- `success`: green-400/green-500
- `warning`: yellow-400/yellow-500
- `error`: red-400/red-500
- `info`: blue-400/blue-500
- `neutral`: zinc-500

**チャートライブラリ追加**
- `recharts` を `apps/dashboard` に追加
- shadcn/ui と同スタック、Tailwind カラーとの親和性が高い

### ナビゲーション再設計

**現状:** 7 項目フラットリスト  
**新設計:** 3 グループ構造

```
アクティビティ
  ├ 概要       (Home icon)
  └ ログ       (Activity icon) + リアルタイムバッジ

機能
  ├ 音声       (Mic icon)
  ├ 募集       (Users icon)
  └ TTS        (Volume icon)

システム
  ├ 設定       (Settings icon)
  └ ヘルス     (Heart icon) + ステータスドット
```

- 各アイテム：アイコン + ラベル + オプションバッジ
- モバイル（< 768px）：ハンバーガーメニューに折りたたみ
- **ファイル:** `src/app/dashboard-shell.tsx` を全面書き直し、`src/app/dashboard-ui.ts` のナビ定義を更新

---

## Section 2: ダッシュボード各ページ

### 概要ページ (`src/app/page.tsx`)

**KPI カード 4枚（グリッド）**
- アクティブ VC 数
- 今日のイベント数
- 進行中の募集数
- TTS セッション数

各カードに前週比トレンド（`↑12%` など）を表示。

**7日間アクティビティチャート**
- Recharts `<AreaChart>` でカテゴリ別積み上げ
- カテゴリ色：青(messages)・紫(voice)・teal(temp-vc)・緑(recruitment)・橙(audit)

**最近のアクティビティ feed**
- 直近 10 件を人間語で表示（後述のログ表示仕様と共通）
- 「すべて見る →」でログページへ

### ログページ (`src/app/logs/logs-explorer.tsx`)

**上部: 24時間イベント頻度バーチャート**
- Recharts `<BarChart>` でカテゴリ別色分け

**メイン: アクティビティ feed**（テーブルを廃止）

```
[カテゴリ色ドット] [アイコン] [人間語の説明]          [相対時刻]
🟣  🎤  Yuzuki が #General に参加                   2分前
🔵  ✉️  #雑談 でメッセージが削除されました (3件)      15分前
🔴  🔨  Kaito に 10分間のタイムアウトを適用          1時間前
```

**イベント → 人間語変換ルール**（`src/app/logs/logs-ui.ts` に追加）

| イベントコード | 表示テキスト例 |
|---|---|
| `voice.session.join` | `{actor} が {channel} に参加` |
| `voice.session.leave` | `{actor} が {channel} から退出` |
| `member.join` | `{actor} がサーバーに参加` |
| `member.kick` | `{actor} を {target} がキック` |
| `message.delete` | `{channel} でメッセージを削除 ({count}件)` |
| `recruitment.created` | `{actor} が募集を作成 ({genre})` |
| `tts.session.started` | `{actor} の TTS セッションが開始` |
| `system.bot.crashed` | `Bot が予期せず停止しました` |
| （56 イベント全て同様にマッピング） | |

**クリック展開: 構造化 key-value**（生 JSON 非表示、管理者のみ raw JSON トグル）

**フィルター**
- カテゴリ pill ボタン（現状の 8 カテゴリ維持）
- メンバー名検索：フロントエンドでの表示名フィルタリング（API は `actorId` で検索済み、表示時に Discord displayName を解決してフィルタ）
- 日付範囲ピッカー

**リアルタイムインジケーター**
- 接続中 → 緑の点滅ドット + "ライブ"
- 切断時 → 赤ドット + "オフライン"

### 音声ページ (`src/app/voice/voice-dashboard.tsx`)

**アクティブセッションセクション**
- VC ごとのライブカード：チャンネル名・参加者数・経過時間・参加者メンション

**Temp VC 管理**
- 各 VC をビジュアルカード：オーナー名・現在のメンバー数・ロック/非表示状態バッジ

**ピーク時間帯チャート**
- Recharts `<BarChart>` で 0–23 時の平均セッション数

### 募集ページ (`src/app/recruitment/recruitment-dashboard.tsx`)

**Kanban 風 3 カラム**（表示のみ、ドラッグ＆ドロップ不要）
- 募集中 | 満員 | 締切済み

**各カードに表示**
- ジャンル絵文字 + タイトル
- 定員バー `████░░ 2/4人`
- 作成からの経過時間
- 主催者名

**右上: ドーナツチャート**（ステータス分布、Recharts `<PieChart>`）

### TTS ページ (`src/app/tts/tts-dashboard.tsx`)

**話者セクション**
- アバターカード形式（Discord アイコン + 名前 + 割り当て声優）
- インライン編集

**辞書セクション**
- 検索対応テーブル + インライン編集
- 追加/削除ボタンを各行に配置

### ヘルスページ (`src/app/health/health-dashboard.tsx`)

**サービスタイル**（グリッド）
- 🟢 正常 / 🟡 遅延 / 🔴 障害 の色付きタイル
- レイテンシ数値 + 簡易 sparkline（直近 10 回）

### 設定ページ (`src/app/settings/settings-panel.tsx`)

**タブ構造**
- ログ設定 / 音声 / TTS / アクセス管理

**統合保存フロー**
- セクションごとの保存ボタンを廃止
- 変更を検知したら下部に固定バー「X 件の変更があります」が出現
- 「保存」で一括適用、「キャンセル」で全変更を破棄
- 破壊的変更（権限削除など）は確認モーダルを挟む

---

## Section 3: Bot の Discord メッセージ

### カラーシステム

Component V2 の Container `accent_color` を使用（左側に色バーを表示）：

| 種別 | Hex | 用途 |
|------|-----|------|
| Purple | `0x9B59B6` | 音声 join/leave/session |
| Blue | `0x5865F2` | メッセージ系イベント |
| Teal | `0x1ABC9C` | 募集 |
| Green | `0x57F287` | 成功・サーバー参加 |
| Red | `0xED4245` | エラー・kick・ban・leave |
| Yellow | `0xFEE75C` | 警告・システム |
| Gray | `0x99AAB5` | 中立・設定変更 |

**共通ユーティリティ更新先:** `apps/bot/src/discord/components-v2.ts`

```typescript
interface ComponentsV2TextMessageInput {
  title: string;
  lines?: readonly string[];
  accentColor?: number;   // 追加
  privateResponse?: boolean;
}
```

### タイムスタンプ統一

**全箇所で `.toISOString()` → Discord タイムスタンプ形式に変更**

```typescript
// apps/bot/src/discord/log-channel.ts などで統一
const discordTimestamp = (date: Date) =>
  `<t:${Math.floor(date.getTime() / 1000)}:f>`;
const discordRelative = (date: Date) =>
  `<t:${Math.floor(date.getTime() / 1000)}:R>`;
```

Discord 側がユーザーのタイムゾーン・言語で自動フォーマット。

### ログ通知 Embed

**現状:** 色なし + ISO タイムスタンプ  
**新設計:** カテゴリ色 + Discord タイムスタンプ + 簡潔な日本語タイトル

```
[accent_color: 対応色]
## [絵文字] [イベントタイトル(日本語)]
参加者    @Yuzuki
チャンネル  #General
時刻      2026年6月4日 18:27
```

イベント → 絵文字 + タイトルのマッピングも `packages/shared/src/locale.ts` に追加。

### 募集投稿 Embed

```
[accent_color: teal]
## 🎮 FPS ゲーム募集
募集人数   ████░░  2/4人
VC        #game-voice
主催者    @Kaito
内容      VALORANT ランク戦、ゴールド帯以上歓迎

[参加する]  [キャンセル]  [締め切る]
```

**ファイル:** `apps/bot/src/discord/recruitment-channel.ts`

### Temp VC 通知

- 作成時 → Green (`0x57F287`) + `✨ 一時VCが作成されました` + オーナー名 + チャンネルリンク
- 削除時 → Gray (`0x99AAB5`) + `一時VCが閉じました` + 使用時間（相対）

**ファイル:** `apps/bot/src/discord/temp-voice.ts`

### コマンド成功・エラーレスポンス

- 成功 → Green + `✅ [操作内容] を保存しました`（簡潔、1〜2行）
- エラー → Red + `❌ [日本語での原因説明]`（生エラーメッセージは出さない）

### 言語統一

- 全 Bot メッセージ文字列を `packages/shared/src/locale.ts` に集約
- `guildConfig.language`（既存）を全 handler で参照して EN/JA 切り替え
- 英語・日本語が混在している箇所を統一

---

## 技術的制約・注意事項

- **Component V2**: `accent_color` はコンテナレベルで設定可能（Discord API 仕様上 OK）
- **Discord ユーザー名解決**: `/api/logs` のレスポンスに `actorName`（Discord displayName）を含める形に拡張。Bot 側がログ書き込み時に displayName も一緒に保存するか、ダッシュボード API が Discord API を叩いて解決する（どちらでも OK、実装時に選択）。既存の `actorId` は内部キーとして保持し続ける。
- **Recharts**: `apps/dashboard/package.json` に追加が必要
- **モバイル対応**: レスポンシブ（`sm:`/`md:`/`lg:` ブレークポイント）、複雑機能（チャート等）はデスクトップ優先で OK

---

## 検証方法

1. `pnpm dev` でダッシュボード起動、各ページを実際のブラウザで確認
2. ログページ：実際のイベントが人間語で表示されるか、JSON が出ていないか確認
3. 設定ページ：変更 → 一括保存フロー、確認モーダルが出るか確認
4. モバイル幅（375px）でナビゲーションが折りたたまれるか確認
5. Bot 側：`/setup` 実行 → 緑の成功 Embed が表示されるか確認
6. ログ通知チャンネル：ISO タイムスタンプが出ていないか、色バーが付いているか確認
