# mini-farm

ESP32 センサーデータを Supabase に送信し、Next.js ダッシュボードで監視する農園モニタリングシステム。

## 開発環境の起動

### DevContainer（推奨）

DevContainerを開くだけで全サービスが自動起動する（`postStartCommand` で `supabase start && docker compose up -d` が実行される）。

### ローカルDocker Compose（DevContainer代替）

DevContainerが使えない場合は以下の手順で起動する。

```bash
# 初回のみ: Supabase CLI をホストにインストール
brew install supabase/tap/supabase

# 初回のみ: .env を作成
cp .env.example .env
# .env を開いて SUPABASE_PUBLISHABLE_KEY を記入する

# Supabase を起動（表示される anon key を .env の SUPABASE_PUBLISHABLE_KEY に記入）
supabase start

# Next.js・エミュレータを起動
docker compose up -d
```

### ポート一覧

| ポート | サービス |
|---|---|
| 3000 | Next.js |
| 3001 | ESP32エミュレータAPI |
| 54321 | Supabase API |
| 54323 | Supabase Studio |

---

## GitHub OAuth 設定（ローカル）

GitHub 側は `OAuth Apps` を使う（`GitHub Apps` ではない）。

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://127.0.0.1:54321/auth/v1/callback`

注意:
- `localhost` と `127.0.0.1` は別扱い。callback URL は完全一致が必要。
- callback URL は Next.js 側 (`/auth/callback`) ではなく、Supabase Auth 側 (`/auth/v1/callback`) を設定する。

---

## ESP32エミュレータ

エミュレータは起動時に停止状態で待機する。送信開始は `POST http://localhost:3001/start`。

### エミュレータの環境変数

docker compose 経由で起動する場合、エミュレータはルートの `.env` から環境変数を読み込む。`DEVICE_API_KEY` を設定しておけば動作する（デフォルト値 `dev-api-key-001` は `supabase/seed.sql` に登録済み）。

```bash
# ルートの .env（初回セットアップ時に cp .env.example .env で作成済み）
DEVICE_API_KEY=dev-api-key-001
```

`ts-node` でホストから直接起動する場合はインラインで指定する。

```bash
DEVICE_API_KEY=dev-api-key-001 SUPABASE_URL=http://localhost:54321 npx ts-node emulator/src/index.ts
```

### 制御エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/start` | 送信を開始する |
| `POST` | `/stop` | 送信を停止する |
| `GET` | `/status` | 現在の状態と送信間隔を返す |
| `POST` | `/start-batch` | バッチ送信テスト（`count` パラメータで件数を指定、最大20） |

### GitHubログインユーザーとして送信する

通常のエミュレータは `DEVICE_API_KEY` で送信するが、GitHub OAuth などでログインしたユーザーの JWT トークンを設定すると、そのユーザーとして送信できる。

#### ステップ 1: JWT トークンを取得する

**方法 A: Supabase Studio から取得する**

1. ブラウザで Supabase Studio（`http://localhost:54323`）を開く
2. 左メニューから **Authentication > Users** を選択する
3. 対象ユーザーの行にある **...** メニューをクリックし、**Copy JWT** を選択する

**方法 B: ブラウザの DevTools から取得する**

> **注意:** この操作は開発環境（ローカル）でのみ実施すること。本番環境のブラウザで同様の操作を行うと、実際のユーザーのトークンが漏洩するリスクがあるため絶対に行わないこと。

1. Next.jsダッシュボード（`http://localhost:3000`）に GitHub OAuth でログインする
2. DevTools を開き、**Application** タブ → **Cookies** → `http://localhost:3000` を選択する
3. `sb-*-auth-token` という名前のクッキーを見つける
4. その値は Base64 エンコードされた JSON なので、DevTools コンソールで以下を実行して `access_token` を取り出す

```js
const raw = document.cookie
  .split('; ')
  .find(c => c.startsWith('sb-'))
  ?.split('=')
  .slice(1)
  .join('=');
const token = JSON.parse(decodeURIComponent(raw));
console.log(token.access_token);
```

> または、DevTools の **Application > Local Storage** に `sb-*-auth-token` が保存されている場合は、そこから `access_token` フィールドの値をコピーする。

#### ステップ 2: ルートの .env に設定してエミュレータを再起動する

```bash
# ルートの .env に取得したトークンを設定する
USER_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# エミュレータコンテナを再起動する
docker compose up -d --force-recreate emulator
```

再起動後のログに `Using USER_JWT_TOKEN as Bearer token (login user mode).` と表示されれば設定完了。

> **注意:** JWT トークンには有効期限がある（デフォルト1時間）。期限切れの場合は再度ログインして新しいトークンを取得すること。

---

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

---

## 仕様書

詳細な仕様は `docs/specs/` を参照。

| ファイル | 内容 |
|---|---|
| [docs/specs/INDEX.md](docs/specs/INDEX.md) | 仕様書の目次・システム概要 |
| [docs/specs/TECH_STACK.md](docs/specs/TECH_STACK.md) | 技術スタック・開発環境・デプロイ |
| [docs/specs/DATA_MODEL.md](docs/specs/DATA_MODEL.md) | DBスキーマ・テーブル定義・RLS |
| [docs/specs/SCREEN_SPEC.md](docs/specs/SCREEN_SPEC.md) | 画面レイアウト・ルーティング・認証フロー |
