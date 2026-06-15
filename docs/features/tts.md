# TTS

VOICEVOX を使ってボイスチャンネルでメッセージを読み上げる機能。

## コマンド

### `/setup tts channel:#チャンネル`

TTS の固定テキストチャンネルを設定する。

Bot がボイスチャンネルに接続中、このチャンネルのメッセージが読み上げられる。

`Manage Guild` 権限が必要。

### `/join`

コマンドを実行したユーザーのVCに Bot が参加する。

`/join` を実行したテキストチャンネルが一時的な TTS ソースに追加される。

実行結果のパターン:

- `joined` — Bot がVCへの参加に成功した
- `blocked` — Bot がすでに別のVCにいる（`/force-join` を使用）
- `already-connected` — Bot がすでに同じVCにいる

### `/force-join`

確認ボタンを押した後、コマンドを実行したユーザーのVCに Bot を強制移動する。

Bot がすでに別のVCにいる場合は確認モーダルが表示される。**移動**を押した後にのみ移動する。

必要な権限: Discord サーバーオーナー、または Dashboard `admin` グラント（ユーザーまたはロール）。Dashboard `viewer` では不可。

### `/leave`

Bot をVCから切断し、一時的な TTS ソースチャンネルをクリアする。

`/setup tts` で設定した固定チャンネルは削除されない。

### `/speaker set speaker_id:<ID>`

個人用の VOICEVOX スピーカーを設定する。スピーカーIDはオートコンプリートで選択（25種類）。

この設定はサーバーデフォルトより優先される。

### `/speaker server-default speaker_id:<ID>`

サーバーのデフォルト VOICEVOX スピーカーを設定する。

必要な権限: Discord サーバーオーナー、または Dashboard `admin` グラント（ユーザーまたはロール）。

## スピーカーの優先順位

1. `/speaker set` または Dashboard で設定したユーザー個人のスピーカー
2. `/speaker server-default` または Dashboard で設定したサーバーデフォルトスピーカー
3. `VOICEVOX_SPEAKER_ID` 環境変数（フォールバック、デフォルト `2`）

## メッセージルール

Bot がVCに接続中のみメッセージを読み上げる。

読み上げ対象チャンネル:

- `/join` または `/force-join` で追加された一時テキストチャンネル
- `/setup tts` で設定した固定チャンネル

スキップされるメッセージ:

- Bot が送信したメッセージ
- 空メッセージ
- `/` で始まるメッセージ（スラッシュコマンド類似）
- `//` で始まるメッセージ（ユーザーミュート）
- 120 文字の TTS 上限を超えるテキスト

## 安全フィルター

VOICEVOX 合成前に適用される。

- URL を読み上げテキストから除去する
- Discord メンションを読み上げテキストから除去する
- `/...` で始まるメッセージをスキップする
- `//...` で始まるメッセージをスキップする
- 空メッセージをスキップする
- テキストを 120 文字に切り詰める
- 辞書エントリはリテラル文字列で置換する（正規表現不可）
- 辞書置換数に上限を設けてループを防ぐ
- ユーザーごとのギルドレート制限で短時間の連続送信をブロックする

## 辞書機能

辞書エントリは Dashboard の TTS 設定セクションで管理する。

### スコープ

- `guild` — サーバー全体の置換（全ユーザーに適用）
- `user` — ユーザー個別の置換（そのユーザーに限りギルドエントリより優先）

### 置換順序

1. メッセージ送信者の有効な `user` エントリ（優先度が高い順）
2. 有効な `guild` エントリ（優先度が高い順）

辞書キーはリテラル文字列として扱われる（正規表現ではない）。部分一致も合成前に置換される。

設定例:

```text
キー: www
置換後: わらわら
スコープ: guild
優先度: 10
有効: true
```

## Dashboard での設定

`/tts` および `/settings` から管理できる。

Dashboard `viewer` は TTS 設定を閲覧できる。Dashboard `admin` またはサーバーオーナーは編集できる。

管理項目:

- TTS テキストチャンネルID
- サーバーデフォルト VOICEVOX スピーカーID
- ユーザー別スピーカー設定
- ギルドおよびユーザー辞書エントリ（スコープ、優先度、有効/無効）

## ログイベント

| イベント | 説明 |
|---|---|
| `tts.session.started` | Bot がVCに参加して TTS を開始した。`reason`: `join-command`, `force-join-command`, `force-join-confirmed` |
| `tts.session.stopped` | Bot がVCを退出した。`reason`: `leave-command`, `auto-leave` |
| `tts.message.spoken` | メッセージが正常に読み上げられた |
| `tts.message.skipped` | 読み上げ対象チャンネルのメッセージがスキップされた（空、コマンド類似、ユーザーミュート、長すぎる） |
| `system.voicevox.error` | VOICEVOX 合成または再生に失敗した |

メッセージ内容は TTS ログに保存されない。メッセージイベントとはIDで紐付けられる。

## キューとリトライ

受理された TTS メッセージはギルドスコープのローカルキューで処理される。同一ギルドのメッセージは順番に合成・再生される。

VOICEVOX の `audio_query` と `synthesis` は一時的な失敗時にバックオフ付きでリトライし、`system.voicevox.error` を記録する。

デフォルト設定:

- 最大試行回数: 3 回
- 基本バックオフ: 250ms
- バックオフ順序: 250ms → 500ms

## レイテンシチューニング

起動遅延のほとんどは VOICEVOX の CPU 合成による。ローカル確認では `audio_query` は通常 100ms 以内、`synthesis` は短いフレーズで 1.7〜2.1 秒。

推奨 Docker Compose 設定:

```env
VOICEVOX_SPEAKER_ID=2
VOICEVOX_CPU_NUM_THREADS=6
VOICEVOX_CPU_LIMIT=6
VOICEVOX_MEMORY_LIMIT=3g
```

非力なホストでは `VOICEVOX_CPU_NUM_THREADS` と `VOICEVOX_CPU_LIMIT` を合わせて下げること。

レイテンシ改善のヒント: メッセージを短くする、速いスピーカーIDを使用する、Docker Desktop に多くの CPU を割り当てる。

## 検証

アプリスタックを起動する。

```bash
docker compose --profile app up -d --build bot voicevox
```

リビルド後にスラッシュコマンドを登録する。

```bash
docker compose --profile app exec bot node apps/bot/dist/register-commands.js
```

Bot ログを確認する。

```bash
docker compose --profile app logs -f bot
```

基本確認:

1. Discord のVCに参加する。
2. `/setup tts channel:#テキストチャンネル` を実行する。
3. テキストチャンネルで `/join` を実行する。
4. `/speaker set speaker_id:<ID>` を任意で実行する。
5. `/join` したテキストチャンネルに通常メッセージを送信する。
6. `/setup tts` で設定したチャンネルにも通常メッセージを送信する。
7. Bot が接続中に両方が読み上げられることを確認する。
8. `/leave` を実行して読み上げが停止することを確認する。

安全フィルター確認:

1. `// ミュートテキスト` を送信して読み上げられないことを確認する。
2. URLを含むメッセージを送信してURLが読み上げられないことを確認する。
3. Discord メンションを含むメッセージを送信してメンションが読み上げられないことを確認する。
4. 同じユーザーからメッセージを連続送信してレート制限が適用されることを確認する。

強制移動確認:

1. `/join` で Bot を接続する。
2. 自分が別のVCに移動する。
3. `/join` を実行して Bot が移動しないことを確認する。
4. `/force-join` を実行して **移動** を押し、Bot が移動することを確認する。
