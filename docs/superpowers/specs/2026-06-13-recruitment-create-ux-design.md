# 募集作成フロー UX 改善設計

## 背景

現在の `/recruitment create` はすべての入力をスラッシュコマンドのインラインオプションとして受け取る。
オプションが3必須（ジャンル・定員・内容）＋2任意（VC・自動締め切り）と多く、特に「内容」を短いインライン入力に書くのが使いにくい。
これをモーダル（ポップアップフォーム）ベースに変更し、VC自動検出・設定ボタンで導線を整理する。

## 変更後のフロー

1. ユーザーが `/recruitment create` を打つ（オプションなし）
2. Discordのモーダルが開く：
   - タイトル（必須、最大80文字）
   - 定員（必須、1〜99の整数）
   - 内容（必須、最大1000文字）
3. ユーザーが送信する
4. ユーザーが現在VCに入っていれば、そのVCを自動的にセット
5. 自動締め切りONで募集を作成・投稿
6. 作成者にだけ見えるephemeral返信を送る（後述）

## 投稿本体のボタン

```
[参加]  [脱退]  [締め切る]  [設定]
```

変更点：`[設定]` ボタンを追加する。

## [設定] ボタンの挙動

- **作成者が押した場合**：ephemeral で自動締め切りトグルを表示
  - 現在ON → `[自動締め切りをOFFにする]`
  - 現在OFF → `[自動締め切りをONにする]`
- **作成者以外が押した場合**：ephemeral でエラーを返す

## カスタムID

| ID | 用途 |
|----|------|
| `recruitment-create-modal` | モーダルのカスタムID |
| `recruitment:settings:{recruitmentId}` | [設定] ボタン |
| `recruitment:toggle-auto-close:{recruitmentId}` | 自動締め切りトグル |

## バリデーション

- 定員はテキスト入力を整数に変換し、1〜99の範囲外なら ephemeral エラーを返して終了

## 変更対象ファイル

- `apps/bot/src/commands/recruitment.ts`
  - コマンド定義からオプションをすべて削除
  - `handleRecruitmentCommand` をモーダル返却に変更
  - モーダルsubmit処理（VC自動検出・バリデーション・投稿）を実装
- `apps/bot/src/discord/recruitment-channel.ts`
  - `[設定]` ボタンを投稿メッセージに追加
- `apps/bot/src/discord/recruitment-interactions.ts`
  - `recruitment:settings` ハンドラを追加（権限チェック → ephemeralトグル表示）
  - `recruitment:toggle-auto-close` ハンドラを追加（DB更新 → ephemeral確認）
- `apps/bot/src/discord/interactions.ts`
  - 新しいカスタムIDのルーティングを追加

## 検証方法

1. `/recruitment create` を打ち、モーダルが開くことを確認
2. フォームを送信し、VCに入っている場合・入っていない場合それぞれで投稿内容を確認
3. 投稿に `[設定]` ボタンが表示されることを確認
4. 作成者が `[設定]` → トグルが ephemeral で表示されることを確認
5. 他のユーザーが `[設定]` → エラーが返ることを確認
6. 自動締め切りON/OFFを切り替えてDBに反映されることを確認
7. 定員に不正な値（0、100、文字列）を入れたときのエラーを確認
