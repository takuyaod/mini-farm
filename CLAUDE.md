# mini-farm — CLAUDE.md

ESP32センサーデータをSupabaseに送信し、Next.jsダッシュボードでリアルタイム監視する農園モニタリングシステム。

## アーキテクチャ

```
ESP32 → HTTP POST（10分間隔）
  → Supabase Edge Functions（認証・バリデーション・アラート判定）
    → Supabase PostgreSQL
      ← Supabase Realtime（INSERTイベント購読）
        → Next.js ダッシュボード
```

## リポジトリ構成

```
app/          Next.js（App Router）
emulator/     ESP32エミュレータ（開発用）
firmware/     ESP32本体プログラム（C++/PlatformIO）
supabase/     migrations/ + seed.sql
shared/       constants.ts（送信間隔・オフライン閾値）
docs/         仕様書
```

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js 16（App Router）+ shadcn/ui + Recharts |
| DB / Auth / API | Supabase（PostgreSQL + RLS + Edge Functions + Realtime） |
| 認証 | Supabase Auth（GitHub OAuth）|
| デプロイ | Vercel（Root Directory: `app`） |

## 開発環境の起動

DevContainerを開くだけで全サービスが自動起動する（`postStartCommand`で`supabase start && docker compose up -d`が実行される）。

| ポート | サービス |
|---|---|
| 3000 | Next.js |
| 3001 | ESP32エミュレータAPI |
| 54321 | Supabase API |
| 54323 | Supabase Studio |

エミュレータは起動時に停止状態。送信開始は `POST http://localhost:3001/start`。

## Next.js 実装ルール

### ディレクトリ構成（features directory）

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の features directory パターンに準拠する。

```
app/src/
├── app/                    # App Router（ルーティングのみ）
│   ├── (auth)/
│   ├── zones/[id]/
│   └── layout.tsx
├── components/             # アプリ全体で共有するコンポーネント
├── features/               # 機能単位のモジュール
│   ├── dashboard/
│   │   ├── api/            # Supabaseクエリ・Server Actions
│   │   ├── components/     # その機能専用コンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   └── types/          # 型定義
│   ├── alerts/
│   └── zones/
├── lib/                    # Supabaseクライアント等の外部連携
└── types/                  # アプリ全体の共通型
```

- `app/`配下はルーティングのみ。ロジックは`features/`に置く
- 機能をまたぐインポートは禁止。共有するものは`components/`か`lib/`へ
- 必要なサブディレクトリだけ作ればよい（すべて必須ではない）

### Server Components / Client Components

- **デフォルトはServer Component**。`'use client'`は最小限に留める
- Client Componentが必要なケース：`useState`/`useEffect`/ブラウザイベント/Supabase Realtimeの購読
- データ取得はServer Componentで直接行い、props経由でClient Componentに渡す

### Data Fetching

- Server ComponentではSupabaseクライアントを直接呼び出す（`fetch()`ラッパー不要）
- データ変更はServer Actions（`'use server'`）を使い、完了後に`revalidatePath()`で再検証
- Route Handler（`app/api/*/route.ts`）はSupabase Edge Functionsで代替できる場合は使わない

### App Router の注意点（Pages Routerからの変更）

- `params`はPromiseになった → `params: Promise<{ id: string }>`として`await`する
- `getServerSideProps`/`getStaticProps`は廃止 → Server Componentで直接データ取得
- `_app.tsx`/`_document.tsx`は廃止 → `app/layout.tsx`で代替
- `middleware.ts`は**Next.js 16では`proxy.ts`にリネームされ、エクスポート関数名も`middleware`→`proxy`に変わった**

仕様の詳細 → [技術選定仕様書](docs/specs/TECH_STACK.md) / [画面仕様書](docs/specs/SCREEN_SPEC.md)

---

## 仕様書の管理

仕様書は `docs/specs/` に格納する。

| ファイル | 内容 |
|---|---|
| [INDEX.md](docs/specs/INDEX.md) | 仕様書の目次・システム概要 |
| [TECH_STACK.md](docs/specs/TECH_STACK.md) | 技術スタック・開発環境・デプロイ |
| [DATA_MODEL.md](docs/specs/DATA_MODEL.md) | DBスキーマ・テーブル定義・RLS |
| [SCREEN_SPEC.md](docs/specs/SCREEN_SPEC.md) | 画面レイアウト・ルーティング・認証フロー |

**issueを作成するとき、または実装によって仕様が変わるときは、対応する仕様書を必ず先に更新してからコードを書く。**

## 重要な実装ルール

### 認証
- `proxy.ts`（Next.js 16での`middleware.ts`相当）で全ルートを保護
- 読み取り操作は`getClaims()`、データ変更操作は`getUser()`でセッション検証
- `@supabase/auth-helpers-nextjs`は**使用禁止**（deprecated）。`@supabase/ssr`を使うこと
- 最終防衛ラインはRLS

### 定数管理
- 送信間隔・オフライン判定閾値は`shared/constants.ts`で一元管理
- `OFFLINE_THRESHOLD_MIN = 15`（送信間隔10分の1.5倍）

### APIキー
- ESP32のAPIキーは`platformio.ini`の`build_flags`で注入。`main.cpp`にプレーンテキストで書かない
- `platformio.ini`は`.gitignore`に追加し、`platformio.ini.example`をコミットする

### マイグレーション
- スキーマ変更は`supabase/migrations/`にSQLを追加して`supabase db reset`で適用
- 主キーはUUID v7（`uuid_generate_v7()`）
