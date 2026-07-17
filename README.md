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

キーレス登録（案B/TOFU方式）により APIキーは不要。docker compose 経由で起動する場合、エミュレータはルートの `.env` から環境変数を読み込む。`DEVICE_MAC` で擬似MACアドレスを設定する（デフォルト値 `AA:BB:CC:DD:EE:01` は `supabase/seed.sql` の開発用 active デバイスと同じ値）。

```bash
# ルートの .env（初回セットアップ時に cp .env.example .env で作成済み）
DEVICE_MAC=AA:BB:CC:DD:EE:01
```

`ts-node` でホストから直接起動する場合はインラインで指定する。

```bash
DEVICE_MAC=AA:BB:CC:DD:EE:01 SUPABASE_URL=http://localhost:54321 npx ts-node emulator/src/index.ts
```

エミュレータは `POST /start` 時に `POST /functions/v1/enroll` を実行し（実機ESP32の起動時挙動を模倣）、成功（2xx）した場合のみ `readings` の送信を開始する。未知の MAC の場合は `pending` デバイスとして新規作成されるため、ダッシュボードで承認（active化）するまで `readings` は 403 になる（ログに承認待ちである旨が出力される）。

### 制御エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/start` | `enroll` を実行し、成功した場合のみ送信を開始する |
| `POST` | `/stop` | 送信を停止する |
| `GET` | `/status` | 現在の状態と送信間隔を返す |
| `POST` | `/start-batch` | バッチ送信テスト（`count` パラメータで件数を指定、最大20） |

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
