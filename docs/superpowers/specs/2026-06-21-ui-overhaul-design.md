# UI 全面改修 設計書

**日付**: 2026-06-21  
**ブランチ**: feat/ui-overhaul（新規）  
**担当**: Yuzuki

---

## 背景・目的

Discord Bot ダッシュボードの UI を現代的なプレミアム SaaS スタイルに刷新する。現在は独自 CVA ベースのコンポーネントと zinc カラーパレット + グリーンアクセントで構成されているが、以下の課題がある。

- コンポーネント品質のばらつき（独自実装のため保守コストが高い）
- ユーザー ID / チャンネル ID が生の数値で表示される UX 上の問題
- サイドバーが常に展開状態でコンテンツ領域を圧迫
- デザインの一貫性が不足

**目指すゴール**: Linear / Vercel / Notion に近いシャープで洗練されたダークテーマ。

---

## 技術スタック（変更分）

| 項目 | 現在 | 変更後 |
|---|---|---|
| コンポーネント基盤 | 独自 CVA | shadcn/ui (Radix UI ベース) |
| アクセントカラー | green-500 | indigo-500 |
| ベースカラー | zinc | slate |
| フォント | デフォルト sans | Inter (next/font) |
| Select | ネイティブ `<select>` | Radix Select |
| Dialog / AlertDialog | 独自実装 | shadcn Dialog / AlertDialog |

---

## デザイントークン

### カラーパレット

```css
/* globals.css に定義 */
:root {
  --background: 222 47% 2%;       /* slate-950 #020617 */
  --foreground: 210 40% 98%;      /* slate-50  #f8fafc */
  --card: 222 47% 5%;             /* slate-900 #0f172a */
  --card-foreground: 210 40% 98%;
  --border: 217 33% 25%;          /* slate-700 #334155 */
  --input: 217 33% 25%;
  --primary: 239 84% 67%;         /* indigo-500 #6366f1 */
  --primary-foreground: 0 0% 100%;
  --muted: 217 19% 27%;           /* slate-800 */
  --muted-foreground: 215 20% 65%;/* slate-400 #94a3b8 */
  --accent: 239 84% 67%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --ring: 239 84% 67%;
  --radius: 0.75rem;              /* rounded-xl */
}
```

### フォント

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });
```

---

## コンポーネント移行計画

### Phase 1: 基盤セットアップ
- `npx shadcn@latest init` (Next.js, TypeScript, Tailwind v4, slate ベース)
- `globals.css` をインジゴ / slate トークンに更新
- Inter フォント追加

### Phase 2: DashboardShell（サイドバー刷新）

**コラプス可能サイドバー仕様**:
- 展開時: 240px（アイコン + ラベル）
- 折りたたみ時: 64px（アイコンのみ）
- コラプスボタン: サイドバー下部、`ChevronLeft` / `ChevronRight`
- 状態保存: `localStorage('sidebar-collapsed')`
- アニメーション: `transition-all duration-200 ease-in-out`
- アクティブ項目: `bg-indigo-500/10 text-indigo-400` + 左ボーダー `border-l-2 border-indigo-500`
- ツールチップ: 折りたたみ時にホバーで Radix `Tooltip` 表示

**PageHeader コンポーネント**（新規）:
```tsx
// タイトル + 説明 + 右側アクションボタンを受け取る共通ヘッダー
<PageHeader title="..." description="..." actions={<Button>...</Button>} />
```

### Phase 3: 低リスクコンポーネント一括置き換え

以下を shadcn/ui CLI でインストールし、既存を上書き:
- `Button` — variants: default/destructive/outline/ghost/secondary/link
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Badge` — variants: default/secondary/destructive/outline
- `Input`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- `Skeleton`

### Phase 4: Radix ベースコンポーネント

- `Select` — ネイティブ select を Radix Select に置き換え（既存の `select.tsx` を更新）
- `Dialog` — `settings-modal.tsx` を shadcn Dialog ベースに書き換え
- `AlertDialog` — `confirm-dialog.tsx` を shadcn AlertDialog に書き換え
- `Tooltip` — サイドバー折りたたみ時のラベル表示用
- `ScrollArea` — ログページ・サイドバーのスクロール領域

### Phase 5: 各ページのビジュアルブラッシュアップ

#### 全ページ共通
- カード角丸: `rounded-xl`
- カードシャドウ: `border border-slate-800 shadow-sm`
- 空状態 (empty state): アイコン + メッセージのコンポーネント化

#### Overview ページ
- KPI カード: 上部に薄い indigo ストライプ + Lucide アイコン
- AreaChart グラデーション: indigo-500 → transparent
- Recent Activity: タイムライン風（左に縦ライン + ドット）

#### Recruitment ページ
- Kanban カード左ボーダー: Open=indigo, Full=amber, Closed=slate
- ドーナツチャート色: indigo / amber / slate に統一

#### TTS ページ
- `Tabs` (shadcn) で辞書 / スピーカー管理 / 設定を切り替え

#### Voice ページ
- 参加者リスト → カード型表示（アバター + チャンネル名）

---

## ユーザー / チャンネル ID 解決

**問題**: 現在 `UserMention` / `ChannelMention` コンポーネントが生の Snowflake ID を表示している。

**設計**:
- `UserMention`: Discord API `GET /guilds/{guildId}/members/{userId}` でニックネームまたは表示名を取得
- `ChannelMention`: `GET /guilds/{guildId}/channels` でチャンネル名を取得
- 既存の API ルート or bot 側の REST クライアントを経由（直接 Discord API を叩かない）
- 未解決時フォールバック: `Unknown User` / `#unknown-channel`
- ID はホバーツールチップ (`title` 属性 or Radix Tooltip) に格下げ

**優先ページ**: Logs ページ（イベントに埋め込まれる ID が最も多い）

---

## 移行戦略

1. `feat/ui-overhaul` ブランチで作業
2. Phase 1 → 5 の順で進め、各 Phase ごとにダッシュボードを起動して目視確認
3. 型エラーがないことを `tsc --noEmit` で確認
4. 各 Phase を個別コミットで積み上げ

---

## 検証方法

1. `npm run dev` でダッシュボードを起動
2. 各ページを全役割（viewer / admin / owner）でブラウザ確認
3. サイドバーのコラプス動作とロカールストレージ保持を確認
4. ユーザー・チャンネル名解決の表示を Logs ページで確認
5. モバイル幅 (375px) でレイアウト崩れがないことを確認
6. `tsc --noEmit` でコンパイルエラーなし

---

## 対象ファイル（主要）

- `apps/dashboard/src/app/globals.css` — カラートークン
- `apps/dashboard/src/app/layout.tsx` — Inter フォント追加
- `apps/dashboard/src/app/dashboard-shell.tsx` — コラプスサイドバー
- `apps/dashboard/src/components/ui/` — shadcn/ui コンポーネント群
- `apps/dashboard/src/components/user-mention.tsx` — 名前解決
- `apps/dashboard/src/components/channel-mention.tsx` — 名前解決
- `apps/dashboard/src/app/page.tsx` — Overview 改善
- `apps/dashboard/src/app/recruitment/` — Kanban 改善
- `apps/dashboard/src/app/tts/` — Tabs 導入
- `apps/dashboard/src/app/voice/` — カード型表示
