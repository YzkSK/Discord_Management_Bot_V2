# 本番デプロイ

Linux Docker Compose によるデプロイ構成。HTTPS は nginx の TLS オーバーライドで有効化する。

## サーバー要件

- Docker と Docker Compose が使える Linux サーバー
- Node.js 24 と pnpm 10
- このリポジトリへの Git アクセス
- `DEPLOY_PATH` に設定したパスへのリポジトリチェックアウト
- `.env.production.example` からサーバー上に本番用 `.env` を作成済み
- 本番ドメインをサーバーに向けた DNS レコード
- HTTPS を有効化する場合は TLS 証明書

## GitHub Secrets

以下のリポジトリまたは環境シークレットを設定する:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`

## サーバーでの手動確認

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

HTTP ポート `80` で nginx を起動する。初回ブートストラップ、内部テスト、または証明書発行ワークフローに使用する。

## HTTPS 本番環境

パブリックアクセス用に TLS オーバーライドを追加して起動する。

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml ps
```

TLS オーバーライドはポート `80` と `443` を公開し、HTTP を HTTPS にリダイレクトして証明書を nginx にマウントする。

デフォルトで nginx は以下を読む:

- `./secrets/tls/fullchain.pem`
- `./secrets/tls/privkey.pem`

証明書ディレクトリは本番 `.env` の `TLS_CERT_DIR` で上書きできる:

```env
TLS_CERT_DIR=/etc/letsencrypt/live/example.com
```

証明書ディレクトリは `/etc/nginx/certs` に読み取り専用でマウントされる。証明書、秘密鍵、`secrets/` ディレクトリはコミットしないこと。

HTTPS オリジンに合わせて以下の環境変数を設定する:

```env
PUBLIC_DASHBOARD_URL=https://example.com
NEXTAUTH_URL=https://example.com
DISCORD_REDIRECT_URI=https://example.com/api/auth/callback/discord
```

Discord Developer Portal の OAuth2 リダイレクトURIは `DISCORD_REDIRECT_URI` と完全に一致させること。

## HTTP と HTTPS の違い

- HTTP: nginx がポート `80` のみ公開
- HTTPS: nginx がポート `80` と `443` を公開
- HTTPS モードでは nginx が TLS を終端し、Docker 内の `dashboard:3000` にプロキシする
- 本番では dashboard サービスのポート `3000` を外部に公開しないこと
- `NEXTAUTH_URL` と Discord OAuth リダイレクトURLは `https://` を使用すること

## GitHub Actions デプロイ

GitHub Actions から `Deploy` ワークフローを手動で実行する。プッシュ時の自動デプロイは設定していない。

## 対象外

- TLS 証明書の自動化
- ブルー/グリーンデプロイ
- オフサイトバックアップ
- マルチサーバー構成
