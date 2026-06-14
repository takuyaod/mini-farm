# ミニ農園モニタリングシステム — 仕様書インデックス

ESP32マイコンで取得したセンサーデータをクラウドに送信し、Webダッシュボードでリアルタイム監視する農園モニタリングシステム。水耕・土壌の両栽培方式、複数ゾーン・複数デバイス構成に対応する。

---

## 仕様書一覧

| 仕様書 | バージョン | 内容 |
|---|---|---|
| [データモデル](DATA_MODEL.md) | v5 | DBスキーマ・テーブル定義・RLSポリシー・ESP32送信フォーマット |
| [画面仕様書](SCREEN_SPEC.md) | v6 | 画面レイアウト・ルーティング・認証フロー・Realtimeリアルタイム更新 |
| [技術選定仕様書](TECH_STACK.md) | v7 | 技術スタック・リポジトリ構成・開発環境（DevContainer）・Vercelデプロイ |

---

## システム概要

### アーキテクチャ

```
ESP32（センサー計測）
  └─ HTTP POST（10分間隔）
       → Supabase Edge Functions（認証・バリデーション・アラート判定）
            → Supabase PostgreSQL（データ保存）
                 ← Supabase Realtime（INSERT イベント購読）
                      → Next.js ダッシュボード（リアルタイム表示）
```

### 技術スタック早見表

| 役割 | 採用技術 |
|---|---|
| フロントエンド | Next.js 16（App Router）+ shadcn/ui + Recharts |
| ホスティング | Vercel |
| DB / Auth / API | Supabase（PostgreSQL + RLS + Edge Functions + Realtime） |
| マイコン | ESPr Developer S3 Type-C（ESP32-S3） |
| 開発環境 | DevContainer + Docker Compose |

詳細 → [技術選定仕様書](TECH_STACK.md)

---

## データモデル概要

主要テーブル11本で構成。`zones`（栽培エリア）を起点に、デバイス・センサー・計測値・アラートが連なる構造。  
v5 よりデバイス認証を API キー方式から **MAC クレーム方式（案A）** に変更した。

```
users → zones → devices（zone_id NULL 許容）→ sensors → readings
     ↑                                     ↑
     └─ enrollment_keys        sensor_type_masters
     └─ devices（user_id で直接所有）

zones → zone_plants ← plants → plant_thresholds
sensors → alerts
```

- デバイス認証フロー（v5〜）:
  1. 全 ESP32 に同一ファーム＋共有「登録キー」（`enrollment_keys`）1本を書き込む
  2. 起動時に ESP32 が MAC アドレスを enroll エンドポイントに POST → `pending` 状態でデバイス登録
  3. UI で pending デバイスをゾーンに割り当て → `active` 化
  4. 以降は `X-Device-MAC` ヘッダーのみで認証（登録キー不要）
- `devices.user_id` を直接持つためフラット RLS 述語（JOIN なし）が適用される
- 計測値（`readings`）はraw値で保存。補正は`sensor_calibrations`テーブル追加で後対応
- 主キーはUUID v7（時系列ソート可能。大量INSERTの多い`readings`でBTreeインデックス断片化を抑制）
- オフライン判定閾値：15分（本番送信間隔10分の1.5倍）。`shared/constants.ts`で一元管理

詳細 → [データモデル](DATA_MODEL.md)

---

## 画面構成概要

| 画面 | パス | 概要 |
|---|---|---|
| ダッシュボード | `/` | 全ゾーンのセンサー現況カード・アラートバナー |
| ゾーン詳細 | `/zones/[id]` | センサータイル全件・グラフ（24h/7d/30d）・デバイス状態 |
| アラート | `/alerts` | 未解消/解消済みタブ・ゾーン絞り込み・解消ボタン |
| ログイン | `/login` | GitHub OAuthログイン |

- 認証：Supabase Auth（GitHub OAuth）。`proxy.ts`で全ルートを保護
- リアルタイム更新：`readings`テーブルへのINSERTイベントをRealtimeで購読
- グラフ：24h=生データ、7d=1時間平均、30d=日次平均（`AVG() + GROUP BY`で都度集計）

詳細 → [画面仕様書](SCREEN_SPEC.md)

---

## 開発環境の起動

```bash
# DevContainerを開くだけで全サービスが自動起動
# supabase start + docker compose up -d が postStartCommand で実行される

# エミュレータの送信開始（5秒間隔でセンサーデータを送信）
curl -X POST http://localhost:3001/start
```

| ポート | サービス |
|---|---|
| 3000 | Next.js |
| 3001 | ESP32エミュレータAPI |
| 54321 | Supabase API |
| 54323 | Supabase Studio |

詳細 → [技術選定仕様書 — 開発環境](TECH_STACK.md#開発環境)

---

## MVP 以降に後回しにした機能

| 機能 | 対応方法 |
|---|---|
| センサー補正（`sensor_calibrations`） | テーブル追加のみ。raw保存済みのため過去データに遡って適用可能 |
| 成長ステージ別閾値 | `plant_thresholds`と`zone_plants`への`growth_stage`カラム追加 |
| `sensor_fault`検知ロジック | Edge Functionのコード追加のみ（スキーマ変更不要） |
| ゾーン管理・植物マスタ管理画面（P2） | `/zones/[id]/settings`・`/settings/plants` |
| PostgreSQL 18移行時のUUID v7 | `uuid_generate_v7()`を削除し組み込み`uuidv7()`に切り替え |
