# 技術選定仕様書 v8 — ミニ農園モニタリングシステム

---

## 技術スタック一覧

| 役割 | 採用技術 | バージョン |
|---|---|---|
| フロントエンド | Next.js（App Router） | 16.x |
| デプロイ | Vercel | — |
| DB / Auth | Supabase（PostgreSQL + Row Level Security） | Free プラン |
| リアルタイム | Supabase Realtime | — |
| ESP32 受信 API | Supabase Edge Functions | — |
| グラフ | Recharts | — |
| UI コンポーネント | shadcn/ui | — |
| アイコン | lucide-react | — |
| 認証方式 | Supabase Auth（OAuth / GitHub） | — |
| マイコン | ESPr Developer S3 Type-C | — |
| 開発環境 | DevContainer + Docker Compose | — |
| エディタ / AI | Claude Code | — |

---

## リポジトリ構成

```
project-root/
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── app/                    ← Next.js プロジェクトルート
│   ├── src/
│   │   ├── app/            ← App Router
│   │   ├── components/
│   │   └── lib/
│   ├── public/
│   ├── proxy.ts            ← 認証ガード（未認証を /login にリダイレクト）
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── firmware/               ← ESP32 本体プログラム
│   ├── src/
│   │   └── main.cpp
│   └── platformio.ini      ← Wi-Fi認証情報・送信間隔をここで管理（APIキーは不要。キーレス登録方式）
├── emulator/               ← ESP32 エミュレータ（開発用）
│   ├── src/
│   │   └── index.ts
│   └── package.json
├── supabase/
│   ├── migrations/         ← DDL（スキーマ管理）
│   ├── seed.sql            ← 初期データ・モックデータ（開発用デバイスのMACアドレスを含む）
│   └── config.toml
├── shared/
│   └── constants.ts        ← 送信間隔・オフライン閾値など共有定数
├── docs/
│   ├── DATA_MODEL_v5.md
│   ├── SCREEN_SPEC_v6.md
│   ├── HANDOFF.md
│   └── TECH_STACK_v8.md    ← 本ドキュメント
├── docker-compose.yml
└── README.md
```

---

## 各技術の選定理由

### Next.js 16（App Router）

- App Router により Server Components・Server Actions を活用し、Supabase との連携をサーバーサイドで完結できる
- Vercel との親和性が高く、デプロイ設定の工数を最小化できる
- `Root Directory: app` を Vercel プロジェクト設定で指定することで、モノレポ構成に対応する

### Vercel

- Next.js の開発元であり、ゼロコンフィグでデプロイできる
- Free プランで個人プロジェクトの規模に対応可能

### Supabase（Free プラン）

- PostgreSQL をそのまま使えるため、`DATA_MODEL_v5.md` のスキーマを変更なく適用できる
- Row Level Security（RLS）によりユーザーごとのデータ分離をDBレベルで保証できる
- Realtime・Auth・Edge Functions がセットになっており、バックエンドを別途構築する必要がない
- pg_cron 拡張が標準で利用可能（`idempotency_key` のクリーンアップに使用）
- Supabase CLI をコンテナ内にインストールすることで、ローカル開発環境を DevContainer 内で完結できる

**Free プランの主な制限**

| 項目 | 上限 |
|---|---|
| DB ストレージ | 500 MB |
| Edge Functions 実行回数 | 500 万回 / 月 |
| Realtime メッセージ | 200 万回 / 月 |
| アクティブユーザー（Auth） | 50,000 人 / 月 |

> **ストレージとデータ保持について**  
> 全データを保持する方針のため、ストレージ消費量を把握しておく。  
> 本番の送信間隔10分・センサー3本の構成では約 0.2MB/日の消費となり、  
> 500MB に達するまで約 2,500日かかる試算。Free プランで長期運用が可能。

### Supabase Auth（OAuth）

- Supabase Auth の OAuth プロバイダー機能を使用する
- 初期サポートプロバイダー：**GitHub**
- メール/パスワード認証は使用しない。サインアップフローは OAuth プロバイダーが担うため `/signup` 画面は不要
- セッション管理には `@supabase/ssr` を使用し、Cookie ベースでサーバー・クライアント双方からセッションを参照できる
- `proxy.ts` で全ルートを保護し、未認証の場合は `/login` にリダイレクトする
  - 保護対象外：`/login`・`/auth/callback`
- OAuth コールバックは `/auth/callback` ルートで処理する（`@supabase/ssr` の `supabase.auth.exchangeCodeForSession` を使用）

> **`@supabase/auth-helpers-nextjs` は使用しない**  
> このパッケージは deprecated であり、今後のバグ修正と機能追加は `@supabase/ssr` に集中する。  
> `@supabase/auth-helpers-nextjs` と `@supabase/ssr` を同一プロジェクトに混在させると認証が壊れる。  
> `createMiddlewareClient` → `createServerClient`（`@supabase/ssr`）に移行済み。

**OAuth ログインフロー**

```
ユーザーが /login にアクセス
  → "GitHub でログイン" ボタンをクリック
  → Supabase Auth が GitHub OAuth ページへリダイレクト
  → GitHub 認証完了
  → /auth/callback へリダイレクト
  → supabase.auth.exchangeCodeForSession(code) でセッションを確立
  → / へリダイレクト
```

**proxy.ts の保護範囲**

Next.js 16 では `middleware.ts` が `proxy.ts` にリネームされ、エクスポート関数名も `middleware` → `proxy` に変わった。

```ts
// app/proxy.ts（概要）
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
// セッションがなければ /login にリダイレクト
// 認証済みで /login にアクセスした場合は / にリダイレクト
```

> **⚠️ proxy だけでは Server Actions は保護されない**  
> `proxy.ts` はネットワーク境界であり認可システムではない。  
> データを取得・更新する Server Actions および Server Components でも、  
> 必ず個別にセッションを再検証すること。  
> DB レベルの RLS が最終的な防衛ラインとなる。

**Server Actions / Server Components でのセッション検証**

```ts
// proxy.ts 内：getClaims() を使用（ローカルJWT検証。Auth サーバーへのネットワーク呼び出しなし）
const { data: { claims } } = await supabase.auth.getClaims()

// Server Actions・Server Components 内：
// - 読み取り専用操作には getClaims()（高速）
// - データ変更を伴う操作には getUser()（Auth サーバーで照合。強制ログアウトや削除済みユーザーを確実に検知）
// いずれの場合も DB レベルの RLS が最終防衛ラインとなる

// getClaims() の例（読み取り操作）
const { data: { claims } } = await supabase.auth.getClaims()
if (!claims) throw new Error('Unauthorized')

// getUser() の例（データ変更操作）
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Unauthorized')
```

> **getClaims() と getUser() のトレードオフ**  
> `getClaims()` はローカルJWT検証のみで高速だが、サーバー側での強制ログアウトやアカウント削除を  
> JWTの有効期限（最大1時間）が切れるまで検知できない。  
> `getUser()` は毎回 Auth サーバーへのネットワーク呼び出しが発生するが、即時検知できる。  
> 最終防衛ラインは RLS であるため、読み取り操作では `getClaims()` が推奨される。

### Supabase Realtime

- `readings` テーブルへの INSERT イベントを購読し、ダッシュボードをリアルタイム更新する
- ポーリングなしでセンサー値の変化を即時反映できる

### Supabase Edge Functions

- ESP32 からの HTTP POST（`/api/readings`）を受け付けるエンドポイントとして使用する
- DB に近い場所で実行されるため、認証・バリデーション・アラート判定をまとめて処理できる
- Deno ベースの TypeScript で記述する
- **デバイス認証（MACアドレス照合・`status` チェック）および `last_seen_at` 更新は Edge Function 内で Service Role Key を使って処理する**（RLS をバイパスするため）

### Recharts

- React ネイティブのグラフライブラリであり、Next.js との統合がシンプル
- `LineChart` でセンサーの時系列データを表示する
- 閾値バンド（`ReferenceLine` / `ReferenceArea`）を重ねて表示できる

### shadcn/ui

- Radix UI ベースのヘッドレスコンポーネント群で、スタイルを自由にカスタマイズできる
- Tailwind CSS と組み合わせて使用する
- コンポーネントをコピーしてプロジェクト内に配置する方式のため、依存関係が最小

### lucide-react

- shadcn/ui が内部的に使用しており、追加インストール不要（`shadcn/ui` セットアップ時に自動で入る）
- アイコンセットが豊富で、農園 UI に必要な素材（Bell・Settings・AlertTriangle・Wifi・Leaf など）が揃っている
- アイコンは `<Bell size={20} />` のように React コンポーネントとして使用する

### ESPr Developer S3 Type-C（マイコン）

- ESP32-S3-WROOM-1-N16R8 搭載（16MB Flash / 8MB PSRAM）
- 3.3V 動作、Wi-Fi / BLE 対応
- Wi-Fi 経由で Supabase Edge Functions に HTTP POST する
- NTP 同期できない場合は `timestamp` を省略し、バックエンドの受信時刻を使用する

---

## ファームウェア設計方針

### 送信間隔

| 環境 | 送信間隔 |
|---|---|
| 本番（実機） | 10分（600,000ms） |
| 開発（エミュレータ） | 5秒（5,000ms） |

本番とエミュレータで間隔を分けることで、開発中の動作確認速度を確保しつつ、  
本番のストレージ消費とネットワーク負荷を抑える。

> **送信間隔とオフライン判定閾値の連動**  
> オフライン判定閾値は `OFFLINE_THRESHOLD_MIN = 15`（分）で管理する（`shared/constants.ts`）。  
> 送信間隔を変更した場合はこの定数も合わせて更新すること。  
> 閾値は送信間隔の1.5倍以上を目安にする。

### Wi-Fi認証情報の管理

Wi-Fi認証情報（SSID・パスワード）は `platformio.ini` の `build_flags` でファームウェアに注入する。  
ソースコード（`main.cpp`）にプレーンテキストで書かない。

> **キーレス登録（案B / TOFU方式）採用によりAPIキー・登録キーの注入は不要**  
> ファームウェアに秘密情報を一切持たせない方針のため、以前あった `API_KEY` の `build_flags` 注入は廃止した。  
> デバイスの識別・認証は `WiFi.macAddress()` で取得できる MACアドレスのみで行う（詳細は `DATA_MODEL.md` の [devices](DATA_MODEL.md#devices) を参照）。

```ini
; firmware/platformio.ini
[env:esp32s3]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
build_flags =
    -D WIFI_SSID=\"your-wifi-ssid\"
    -D WIFI_PASSWORD=\"your-wifi-password\"
    -D SUPABASE_URL=\"https://your-project.supabase.co\"
    -D SEND_INTERVAL_MS=600000
```

```cpp
// firmware/src/main.cpp
const char* wifiSsid       = WIFI_SSID;
const char* wifiPassword   = WIFI_PASSWORD;
const char* supabaseUrl    = SUPABASE_URL;
const int   sendIntervalMs = SEND_INTERVAL_MS;
```

`platformio.ini` は `.gitignore` に追加し、リポジトリにコミットしない。  
テンプレートとして `platformio.ini.example` を用意する。

```ini
; firmware/platformio.ini.example（リポジトリにコミットする）
[env:esp32s3]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
build_flags =
    -D WIFI_SSID=\"your-wifi-ssid\"
    -D WIFI_PASSWORD=\"your-wifi-password\"
    -D SUPABASE_URL=\"https://your-project.supabase.co\"
    -D SEND_INTERVAL_MS=600000
```

### ファームウェアの変更が必要なケース

ESP32 のファームウェアを書き直す必要があるのは以下のケースのみ。  
それ以外（ゾーン割り当て・閾値・植物マスタ・デバイスの承認等）はアプリ側で完結する。

| ケース | 内容 |
|---|---|
| センサーを物理的に追加・撤去したとき | `readings` に含める `sensor_type` の文字列を追加・削除する |
| Wi-Fi 認証情報を変えたとき | SSID・パスワードを更新して再ビルド |
| Supabase プロジェクトを作り直したとき | `SUPABASE_URL` を更新して再ビルド（ほぼ発生しない） |

> キーレス登録（案B）採用により「APIキーを再発行したとき」の再ビルドは発生しなくなった。

### ゾーンとデバイスの割り当て

ファームウェアはゾーンを知らない。ESP32 は起動時に `POST /enroll` で MACアドレスのみを送信し、  
バックエンドが `mac_address` → `devices` → `zone_id` の順で解決する。  
ゾーンの割り当て・変更はアプリ側（ゾーン設定画面のpending承認UI）から `devices.zone_id` を更新するだけでよく、ファームウェアの変更は不要。

---

## 開発環境

### 方針

**DevContainer** を開発環境の基盤とする。  
Claude Code は DevContainer 内で動作し、ホストへの直接インストールは Docker Desktop のみで済む。

| ツール | インストール場所 |
|---|---|
| Docker Desktop | ホスト（必須） |
| Supabase CLI | DevContainer 内 |
| Node.js | DevContainer 内 |
| PlatformIO（ESP32 ビルド用） | DevContainer 内 |
| gh cli | DevContainer 内 |
| Claude Code | DevContainer 内 |

### 起動の仕組み

```
DevContainer 起動（Docker Desktop が必要）
  └─ postStartCommand が自動実行
       ├─ supabase start
       │    └─ Docker ソケット経由でホストの Docker デーモンに命令
       │         → Supabase コンテナ群がホスト上で起動
       └─ docker compose up -d
            → Next.js・emulator がホスト上で起動
```

DevContainer を開くだけで全サービスが起動する。追加のコマンドは不要。  
エミュレータは起動時に **停止状態** で待機する。送信を開始するには `POST http://localhost:3001/start` を叩く。

### DevContainer 設定

```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:22

# Supabase CLI
RUN npm install -g supabase@latest

# PlatformIO CLI（ESP32 ビルド用）
RUN pip3 install platformio --break-system-packages

# gh cli
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg \
         https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] \
         https://cli.github.com/packages stable main" \
         | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh

RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*
```

```json
// .devcontainer/devcontainer.json
{
  "name": "mini-farm",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "mounts": [
    "source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind",
    "source=${localEnv:HOME}/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock,target=/home/vscode/.1password/agent.sock,type=bind"
  ],
  "postCreateCommand": "cd app && npm install && cd ../emulator && npm install",
  "postStartCommand": "supabase start && docker compose up -d",
  "forwardPorts": [3000, 3001, 54321, 54323],
  "portsAttributes": {
    "3000":  { "label": "Next.js" },
    "3001":  { "label": "Emulator API" },
    "54321": { "label": "Supabase API" },
    "54323": { "label": "Supabase Studio" }
  },
  "remoteEnv": {
    "NEXT_PUBLIC_SUPABASE_URL": "http://host.docker.internal:54321",
    "SUPABASE_URL": "http://host.docker.internal:54321",
    "SSH_AUTH_SOCK": "/home/vscode/.1password/agent.sock"
  }
}
```

> **1Password SSH エージェントについて**  
> 1Password アプリの Settings > Developer で「Use the SSH agent」を有効にすること。  
> ソケットは macOS では `~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock` に作成される。  
> Finder にはソケットファイルが表示されないため、`ls -la` で確認する。

> **gh cli の認証について**  
> コンテナを起動したあと、ターミナルで `gh auth login` を一度実行する。  
> `SSH` / `GitHub.com` を選択し、1Password に登録した SSH キーを指定する。  
> 認証情報はコンテナ内の `~/.config/gh/hosts.yml` に保存されるため、コンテナを再ビルドした場合は再実行が必要。

> **疎通確認**  
> コンテナ内で `ssh-add -l` を実行し、1Password に登録した SSH キーのフィンガープリントが表示されれば正常。

### Docker Compose 構成

Next.js と ESP32 エミュレータを管理する。  
Supabase コンテナは `supabase start` が管理するため、ここには含めない。

```yaml
# docker-compose.yml
services:
  app:
    build: ./app
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: http://host.docker.internal:54321
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${SUPABASE_PUBLISHABLE_KEY}
    volumes:
      - ./app:/app
      - /app/node_modules

  emulator:
    build: ./emulator
    ports:
      - "3001:3001"          # HTTP API（スタート/ストップ制御用）
    environment:
      SUPABASE_URL: http://host.docker.internal:54321
      DEVICE_MAC: ${DEVICE_MAC}
    restart: unless-stopped
```

### ローカル Docker Compose 起動手順（DevContainer 代替）

DevContainer が使えない場合は、ホストに Supabase CLI をインストールして `docker compose up` だけで起動できる。

**前提条件**

- Docker Desktop がインストール済みであること

**初回セットアップ**

```bash
# 1. Supabase CLI をホストにインストール（初回のみ）
brew install supabase/tap/supabase

# 2. .env を作成
cp .env.example .env
# .env を開いて SUPABASE_PUBLISHABLE_KEY を記入する
# supabase start 実行後に表示される "anon key" を使用する
```

**毎回の起動手順**

```bash
# 1. Supabase を起動
supabase start

# 2. Next.js・エミュレータを起動
docker compose up -d
```

> anon key はローカル Supabase では固定値のため、初回セットアップ後は `.env` の書き換えは不要。

**環境変数（`.env`）**

| 変数名 | 内容 |
|---|---|
| `SUPABASE_PUBLISHABLE_KEY` | `supabase start` で表示される anon key |
| `DEVICE_MAC` | エミュレータ用の擬似MACアドレス（開発用: `AA:BB:CC:DD:EE:01`）。キーレス登録によりデバイスキーは不要になった |

> `.env` は `.gitignore` に登録済みのため、リポジトリにコミットされない。  
> `.env.example` をコピーして使用すること。

---

### 開発用デバイスの管理（seed.sql）

ゾーン管理画面（P2）が完成する前にエミュレータ・実機テストを行えるよう、  
`seed.sql` に承認済み（`status='active'`）の開発用デバイスをあらかじめ用意する。  
MACアドレス `AA:BB:CC:DD:EE:01` は開発環境専用の擬似アドレスであり、本番には流れない。

```sql
-- supabase/seed.sql（抜粋）

-- UUID v7 関数の作成（マイグレーションで定義済みの場合は不要）
-- 開発用ユーザー
INSERT INTO users (id, email, password_hash) VALUES (
  'user-0000-0000-0000-000000000001',
  'dev@example.com',
  'dummy-hash'
);

-- 開発用ゾーン
INSERT INTO zones (id, user_id, name, type) VALUES (
  'zone-0000-0000-0000-000000000001',
  'user-0000-0000-0000-000000000001',
  '水耕ゾーン1',
  'hydroponic'
);

-- 開発用デバイス（承認済み。MACアドレス: "AA:BB:CC:DD:EE:01"）
INSERT INTO devices (id, zone_id, user_id, mac_address, name, status, firmware_ver) VALUES (
  'devi-0000-0000-0000-000000000001',
  'zone-0000-0000-0000-000000000001',
  'user-0000-0000-0000-000000000001',
  'AA:BB:CC:DD:EE:01',
  '開発用デバイス',
  'active',
  '0.0.1'
);
```

> seed.sql の固定UUIDはリテラルで記述しているため UUID v7 形式ではない。  
> これは開発用の固定IDであり意図的なもの。本番データはすべて `uuid_generate_v7()` で生成される。

エミュレータの環境変数 `DEVICE_MAC=AA:BB:CC:DD:EE:01` と対応させる。

### 共有定数（shared/constants.ts）

送信間隔・オフライン判定閾値は Edge Function と Next.js の双方で参照する。  
一箇所で定義して同期漏れを防ぐ。

```typescript
// shared/constants.ts
export const SEND_INTERVAL_MS      = 10 * 60 * 1000  // 10分（本番送信間隔）
export const OFFLINE_THRESHOLD_MIN = 15               // 15分（送信間隔の1.5倍）

// オフライン判定の SQL 条件（フロントエンドの Supabase クエリで使用）
// WHERE last_seen_at < now() - interval '15 minutes'
```

送信間隔を変更する場合は `SEND_INTERVAL_MS` と `OFFLINE_THRESHOLD_MIN` を同時に更新すること。

### ESP32 エミュレータ

マイコン実機の代わりに、Node.js スクリプトが定期的に HTTP POST を送信する。  
センサー値は基準値にランダムなノイズを加えて現実的な変動を再現する。  
送信間隔は開発効率を優先して 5秒に設定する（本番の 10分とは別管理）。

**認証モード（キーレス登録 / TOFU方式）**

APIキー・登録キーは不要。`DEVICE_MAC` で擬似MACアドレスを指定するのみで、  
`enroll` は無認証、`readings` は `X-Device-MAC` ヘッダーで認証される（実機ESP32と同じ認証方式）。

| 環境変数 | 動作 |
|---|---|
| `DEVICE_MAC` | エミュレータが名乗る擬似MACアドレス（デフォルト: `AA:BB:CC:DD:EE:01`） |

**手動制御 API（HTTP）**

エミュレータは起動時に停止状態で待機する。以下のエンドポイントで制御する。

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/start` | `POST /api/enroll` を1回実行後、送信を開始する（すでに実行中の場合は何もしない） |
| `POST` | `/stop` | 送信を停止する |
| `GET` | `/status` | 現在の状態（`running` / `stopped`）と送信間隔を返す |

```typescript
// emulator/src/index.ts
import express from 'express'

const app  = express()
const PORT = Number(process.env.PORT ?? 3001)

const BASE_URL    = process.env.SUPABASE_URL ?? 'http://host.docker.internal:54321'
const DEVICE_MAC  = process.env.DEVICE_MAC   ?? 'AA:BB:CC:DD:EE:01'
const INTERVAL_MS = 5_000  // 開発用。本番ファームウェアは 600_000ms（10分）

let timer: ReturnType<typeof setInterval> | null = null

function jitter(base: number, range: number) {
  return base + (Math.random() - 0.5) * range
}

async function enroll() {
  // 実機ESP32と同じく起動時に毎回実行する（無認証・冪等）
  const res = await fetch(`${BASE_URL}/functions/v1/enroll`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mac_address: DEVICE_MAC, firmware_ver: '0.0.1' }),
  })
  console.log(`[${new Date().toISOString()}] POST /enroll → ${res.status}`)
}

async function sendReadings() {
  const body = {
    timestamp:       new Date().toISOString(),
    idempotency_key: `${DEVICE_MAC}_${Date.now()}`,
    readings: [
      { sensor_type: 'ec',         value: jitter(1.8, 0.2) },
      { sensor_type: 'ph',         value: jitter(6.2, 0.3) },
      { sensor_type: 'water_temp', value: jitter(22.5, 1.0) },
    ],
  }

  const res = await fetch(`${BASE_URL}/functions/v1/readings`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-Device-MAC':  DEVICE_MAC,
    },
    body: JSON.stringify(body),
  })

  console.log(`[${new Date().toISOString()}] POST /readings → ${res.status}`)
}

// スタート
app.post('/start', async (_req, res) => {
  if (timer) {
    res.json({ status: 'running', message: 'Already running' })
    return
  }
  await enroll()  // 実機と同じく起動時に毎回enrollする
  timer = setInterval(sendReadings, INTERVAL_MS)
  sendReadings()  // 即時1回送信
  console.log('[emulator] Started')
  res.json({ status: 'running' })
})

// ストップ
app.post('/stop', (_req, res) => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  console.log('[emulator] Stopped')
  res.json({ status: 'stopped' })
})

// 状態確認
app.get('/status', (_req, res) => {
  res.json({
    status:      timer ? 'running' : 'stopped',
    interval_ms: INTERVAL_MS,
  })
})

app.listen(PORT, () => {
  console.log(`[emulator] HTTP API listening on :${PORT}  (stopped)`)
  console.log(`[emulator] POST /start | POST /stop | GET /status`)
})
```

> **`express` の追加が必要**  
> `emulator/package.json` に `express` と `@types/express` を追加する。

### マイグレーション

スキーマの変更は `supabase/migrations/` に SQL ファイルを追加し、`supabase db reset` で適用する。  
`supabase db reset` は `migrations/` を順番に実行したあと `seed.sql` を流し込む。

マイグレーションの先頭ファイルで `uuid_generate_v7()` 関数を定義する。

```bash
# DevContainer 内で実行
supabase db reset
```

---

## Vercel デプロイ設定

| 設定項目 | 値 |
|---|---|
| Root Directory | `app` |
| Framework Preset | Next.js |
| Build Command | `next build`（自動検出） |
| Output Directory | `.next`（自動検出） |

環境変数は Vercel のプロジェクト設定から登録する。  
本番環境の Supabase URL・Publishable Key・Secret Key（旧: Service Role Key）、および OAuth プロバイダーの Client ID / Secret を設定する。

> **Supabase API キーの命名変更について**  
> Supabase は API キーの体系を新しい命名（`sb_publishable_xxx` / `sb_secret_xxx`）に移行中。  
> 旧キー（`anon` / `service_role`）は2026年末まで使用可能だが、新規プロジェクトでは新キーを使用する。  
> 環境変数名は `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` に変更する。

---

## 後回しにした技術・機能

| 項目 | 理由 |
|---|---|
| センサー補正（`sensor_calibrations`） | MVP 段階では補正なしで運用。raw 保存のためテーブル追加のみで対応可能 |
| 成長ステージ機能 | MVP では不要。カラム追加で対応可能 |
| `sensor_fault` 検知ロジック | Edge Function のコード追加のみ。スキーマ変更不要 |
| センサー補正値管理画面 | `sensor_calibrations` テーブル追加後に定義 |
| 送信間隔のアプリ側設定 | 10分固定で運用。変更が必要になった場合は Edge Function のレスポンスに `interval_ms` を含める方式で対応（ファームウェアの軽微な改修のみ） |
| OAuth プロバイダーの追加（Google 等） | 初期は GitHub のみ。Supabase Auth の設定追加のみで対応可能 |
| PostgreSQL 18 への移行（UUID v7 ネイティブ） | Supabase が PostgreSQL 18 に移行した時点で `uuid_generate_v7()` カスタム関数を削除し、組み込みの `uuidv7()` に切り替える |

---

## v7 からの変更点

デバイス登録を APIキー方式からキーレス登録（案B / TOFU方式）に変更したことに伴う改訂。  
issue #113（案A）は PR #123 で Revert されたが、TECH_STACK.md 自体は当時更新されていなかった（v7 は #113 以前の状態のまま）。今回は #113 の反省を踏まえ、対象ファイルとして必ず含めている。

| 対象 | 内容 |
|---|---|
| APIキーの管理（旧） → Wi-Fi認証情報の管理 | `platformio.ini` の `build_flags` による `API_KEY` 注入の記述を削除し、`WIFI_SSID` / `WIFI_PASSWORD` の注入例に置き換え |
| Edge Functions の説明 | 「デバイス認証（`api_key_hash` 照合）」→「デバイス認証（MACアドレス照合・`status` チェック）」に修正 |
| ファームウェアの変更が必要なケース | 「APIキーを再発行したとき」の行を削除（キーレス化により再ビルド不要になったため） |
| ゾーンとデバイスの割り当て | `api_key_hash` によるデバイス解決 → `mac_address` によるデバイス解決に修正 |
| `.env` の環境変数 | `DEVICE_API_KEY` → `DEVICE_MAC` に変更。`USER_JWT_TOKEN`（ログインユーザーとして送信するモード）は `readings` の認証方式が `X-Device-MAC` ヘッダー固定になったため削除 |
| docker-compose.yml | `DEVICE_API_KEY` → `DEVICE_MAC` に変更 |
| 開発用APIキーの管理（seed.sql）→ 開発用デバイスの管理 | 開発用デバイスを `status='active'`・`mac_address='AA:BB:CC:DD:EE:01'` で登録する例に変更。`api_key_hash` の記述を削除 |
| ESP32エミュレータの認証モード・コード例 | `Authorization: Bearer` 方式を廃止し、起動時に `POST /enroll` を実行してから `X-Device-MAC` ヘッダーで `readings` を送信する実装例に変更 |
| リポジトリ構成 | `platformio.ini`・`seed.sql` のコメントをキーレス登録の内容に更新。`docs/` 配下のファイル名をバージョン更新 |

### 過去の変更点（v6 からの変更点）

| 対象 | 内容 |
|---|---|
| `proxy.ts` のセッション検証 | `getUser()` → `getClaims()` に変更。Publishable Key 環境での推奨方式。ローカルJWT検証のみで Auth サーバーへのネットワーク呼び出しが不要になり高速化 |
| Server Actions の検証方針 | 読み取り操作は `getClaims()`、データ変更操作は `getUser()` を推奨するよう整理。両者のトレードオフを明記 |
| `exchangeCodeForSession` の表記 | 「Supabase Auth Helpers の `exchangeCodeForSession`」→「`@supabase/ssr` の `supabase.auth.exchangeCodeForSession`」に修正。`@supabase/auth-helpers-nextjs` は deprecated のため |
| `@supabase/auth-helpers-nextjs` 禁止注記 | deprecated パッケージの使用を明示的に禁止する注記を追加 |
| オフライン判定閾値 | 「5分超」→「15分超」に修正。本番送信間隔（10分）より閾値が短く、正常動作中でも常にオフライン表示されるバグを修正 |
| 共有定数（`shared/constants.ts`） | `SEND_INTERVAL_MS` と `OFFLINE_THRESHOLD_MIN` を一元管理するファイルを追加。送信間隔変更時の連動更新を保証 |
| リポジトリ構成 | `shared/` ディレクトリを追加 |
| UUID v7 対応 | 全テーブルの主キーを UUID v7 に変更した旨を反映。PostgreSQL 18 移行時の対応方針を後回し項目に追加 |
| docker-compose.yml | 環境変数名を `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` に修正（v6 で対応漏れ） |
| seed.sql の UUID 注記 | 固定UUIDがUUID v7形式でない理由（意図的）を明記 |
