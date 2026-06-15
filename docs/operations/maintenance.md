# メンテナンス

## ヘルスチェック

アプリスタックを起動する。

```bash
docker compose --profile app up -d --build
```

Dashboard のヘルスを確認する。

```bash
curl http://localhost:3000/api/health
```

全依存サービスが利用可能な場合のレスポンス:

```json
{
  "status": "ok"
}
```

いずれかの依存サービスが利用できない場合は HTTP `503` が返り、該当サービスが `error` としてマークされる。シークレットや接続文字列はレスポンスに含まれない。

## PostgreSQL バックアップ

ローカルバックアップを実行する。

```bash
docker compose --profile maintenance run --rm backup
```

出力ファイルの保存先:

```text
./backups/postgres
```

バックアップファイルは `.gitignore` で除外される。リポジトリには `backups/.gitkeep` のみを残すこと。

## ログアーカイブ

手動アーカイブを実行する。

```bash
pnpm logs:archive
```

アーカイブファイルの保存先:

```text
./backups/archive
```

アーカイブの動作:

- 180 日超のログは `.json.gz` としてエクスポートされる
- 365 日超のログはエクスポート後に削除される
- アーカイブファイルは Dashboard から検索できない

## 本番環境でのバックアップ

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile maintenance run --rm backup
```
