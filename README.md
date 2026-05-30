# mini-farm

ESP32 センサーデータを Supabase に送信し、Next.js ダッシュボードで監視する農園モニタリングシステム。

## ローカル起動

1. `.env.example` をコピーして `.env` を作成
2. `.env` に `SUPABASE_PUBLISHABLE_KEY` を設定
3. GitHub OAuth 用に `.env` へ以下を設定
	 - `GITHUB_CLIENT_ID`
	 - `GITHUB_CLIENT_SECRET`
4. Supabase を起動
5. App/Emulator を起動

```bash
cp .env.example .env
supabase start
docker compose up -d
```

## GitHub OAuth 設定（ローカル）

GitHub 側は `OAuth Apps` を使う（`GitHub Apps` ではない）。

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://127.0.0.1:54321/auth/v1/callback`

注意:
- `localhost` と `127.0.0.1` は別扱い。callback URL は完全一致が必要。
- callback URL は Next.js 側 (`/auth/callback`) ではなく、Supabase Auth 側 (`/auth/v1/callback`) を設定する。

## よくあるエラーと対処

### `DNS_PROBE_FINISHED_NXDOMAIN`（`host.docker.internal` へ飛ぶ）

原因:
- ブラウザ遷移先に内部ホストが使われている。

対処:
- App コンテナ再作成で環境変数を更新する。

```bash
docker compose up -d --force-recreate app
```

### `redirect_uri is not associated with this application`

原因:
- GitHub OAuth App の callback URL と実際の `redirect_uri` が不一致。

対処:
- GitHub OAuth App の Authorization callback URL を
	`http://127.0.0.1:54321/auth/v1/callback` に合わせる。

### `http://localhost:3000/login?error=auth_code_error`

原因候補:
- OAuth 開始/交換時の cookie 不整合
- App コンテナから Supabase への接続失敗
- 古いブラウザ cookie / セッション汚染

対処:
1. GitHub と localhost の cookie を削除
2. Supabase を `.env` 読み込み状態で再起動
3. App コンテナを再作成

```bash
set -a && source .env && set +a
supabase stop && supabase start
docker compose up -d --force-recreate app
```