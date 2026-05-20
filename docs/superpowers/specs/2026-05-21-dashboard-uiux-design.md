# Dashboard UI/UX Foundation Design

## Goal

Phase6では、Dashboardを「動作検証しやすい管理画面」に寄せる。派手な見た目より、ログ確認、設定確認、TempVC/Recruitmentの状態確認へ迷わず移動できることを優先する。

## Scope

- 共通AppShellでHome、Logs、Settingsの見た目と導線を統一する。
- HomeはPhase一覧ではなく、運用ダッシュボードとして現在の確認入口を並べる。
- LogsはGuild ID、検索、イベント名、Actorのフィルタ状態を読み取りやすくし、詳細表示を扱いやすくする。
- SettingsはGuild IDのロード、現在値、保存操作をまとまった操作面として整理する。
- `.superpowers/` はローカルのbrainstorming出力としてGit対象外にする。

## Out Of Scope

- tRPC化。
- TempVC/Recruitmentの全設定UI。
- グラフ、分析、監視ダッシュボード。
- スマホ専用の細かい最適化。
- 認証/RBACの仕様変更。

## Architecture

Dashboard専用の小さなUI helperを `apps/dashboard/src/app/dashboard-ui.ts` に置き、ナビゲーション項目、Guild ID正規化、フィルタ件数などの画面ロジックをテスト可能にする。Reactコンポーネントは既存のNext.js App Router構成を維持し、共通レイアウトを `dashboard-shell.tsx` として追加する。

## Testing

UIそのもののE2EはこのIssueでは入れない。代わりに、画面間で再利用するロジックをNode testで確認し、既存の `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` をPhase完了条件にする。
