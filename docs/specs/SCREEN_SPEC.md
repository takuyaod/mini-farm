# 画面仕様書 v6 — ミニ農園モニタリングシステム

データモデルは `DATA_MODEL.md` を参照。  
本ドキュメントは P1 画面（ホーム・ゾーン詳細・アラート）および認証画面の確定仕様。

> **このファイルについて**  
> `SCREEN_SPEC.md`（v5 時点の内容）のデバイス管理セクションをキーレス登録（案B / TOFU方式）に合わせて改訂した版。  
> 変更の概要は末尾の「[v5 からの変更点](#v5-からの変更点)」を参照。

---

## 技術スタック

| 役割 | 採用 |
|---|---|
| フレームワーク | Next.js（App Router） |
| デプロイ | Vercel |
| DB / Auth | Supabase（PostgreSQL + Row Level Security） |
| リアルタイム | Supabase Realtime |
| ESP32 受信 API | Supabase Edge Functions |
| グラフ | Recharts |
| UI コンポーネント | shadcn/ui |
| アイコン | lucide-react |
| 認証方式 | Supabase Auth（OAuth / GitHub） |

---

## ルーティング

```
/                        → ダッシュボード（ホーム）
/zones                   → ゾーン管理（全ゾーン一覧・追加）
/zones/[id]              → ゾーン詳細
/zones/[id]/settings     → ゾーン設定
/alerts                  → アラート
/settings/plants         → 植物マスタ管理（P2）
/login                   → ログイン（OAuth）
/auth/callback           → OAuth コールバック処理（画面なし）
```

### ページの役割分担

| ページ | 目的 |
|---|---|
| `/`（ダッシュボード） | **監視** — アクティブゾーンのリアルタイム状態・センサーデータ |
| `/zones` | **管理** — 全ゾーン（アクティブ＋非アクティブ）の一覧・操作 |
| `/zones/[id]` | **詳細** — センサーデータ＋栽培履歴 |
| `/zones/[id]/settings` | **設定** — 名前・デバイス・休止操作 |

> `/signup` は不要。OAuth プロバイダーが初回ログイン時にアカウントを自動作成する。  
> `/settings/calibrations`（センサー補正）は `sensor_calibrations` テーブルとともに後回し。  
> テーブル追加のタイミングで画面仕様を追記する。

---

## 認証

### 方針

Supabase Auth の OAuth 機能を使用する。初期サポートプロバイダーは **GitHub**。  
セッション管理には `@supabase/ssr` を使用し、Cookie ベースで保持する。

### 認証フロー

```
未認証ユーザーが保護ルートにアクセス
  → proxy.ts が /login にリダイレクト

/login でプロバイダーボタンをクリック
  → Supabase が GitHub OAuth ページへリダイレクト
  → GitHub 認証完了
  → /auth/callback へリダイレクト
  → セッション確立
  → / へリダイレクト
```

### ルート保護（proxy.ts）

- 保護対象：`/login` と `/auth/callback` と `_next` 静的リソース以外のすべてのルート
- 未認証の場合：`/login` にリダイレクト
- 認証済みで `/login` にアクセスした場合：`/` にリダイレクト

### 画面：ログイン `/login`

- ヘッダー・ナビゲーションなし（認証前のため）
- アプリロゴ・アプリ名を中央表示
- 「GitHub でログイン」ボタン（lucide-react の `LogIn` アイコン付き）
- エラー時（OAuth キャンセルなど）：画面下部にエラーメッセージを表示

### OAuthコールバック `/auth/callback`

`@supabase/ssr` の `supabase.auth.exchangeCodeForSession(code)` を使用してセッションを確立する。  
処理完了後は `/` へリダイレクトする。

### アバターとユーザー情報

- OAuth プロバイダーから取得した `user_metadata.avatar_url` があればアバター画像を表示
- なければイニシャル表示（`user_metadata.full_name` または `email` の先頭1文字）
- ドロップダウンにはユーザー名・メールアドレスを表示

---

## 共通仕様

### ヘッダー（全画面共通）

- アプリ名 + Supabase Realtime 接続中を緑の点滅ドットで表示（`更新中` テキスト付き）
- ベルアイコン（lucide-react `Bell`）：`alerts` テーブルの `resolved_at IS NULL` 件数をバッジ表示。クリックで `/alerts` へ
- ナビゲーション：「ダッシュボード」「ゾーン」「アラート」「植物マスタ」（`/settings/plants`）
- アバター：OAuth プロバイダーの画像 or イニシャル表示。クリックでドロップダウン（ログアウト）

### デザイントークン使用方針

UI コンポーネントでは生の Tailwind カラークラス（`text-gray-*`、`border-red-*` など）を使用せず、`tailwind.config.ts` で定義したセマンティックトークンを使うこと。

| カテゴリ | トークン | 用途 |
|---|---|---|
| テキスト | `text-content-primary` | 見出し・主要な値など一番目立たせるテキスト |
| テキスト | `text-content-secondary` | ラベル・補足テキスト |
| テキスト | `text-content-muted` | 非活性・ヒントテキスト |
| サーフェス | `bg-surface-bg` | ページ背景・タイル背景（非選択時） |
| サーフェス | `ring-surface-border` | カード・パネルの枠線 |
| サーフェス | `border-surface-border` | カード・パネルの `border` クラス枠線 |
| サーフェス | `bg-surface-muted` | ホバー時背景・選択状態の薄い背景 |
| アラート | `border-alert-border` | アラート状態のボーダー |
| アラート | `bg-alert-bg` | アラート状態の背景 |
| アラート | `text-alert-text` | アラートテキスト・アイコン色 |
| アラート | `text-alert-text-strong` | アラート本文（より暗いトーン） |
| アラート | `bg-alert-hover` | プログレスバーのトラック（適正外範囲） |
| ブランド | `text-brand-default` | 選択状態・ブランドアクション |
| ブランド | `bg-brand-default` | プライマリボタン・適正範囲バーの塗り色 |

Recharts など CSS クラスを受け付けないコンポーネントには、対応するトークンの実際の色値を直接指定する（`tailwind.config.ts` の定義値を参照）。

### アイコン使用方針

全アイコンは lucide-react を使用する。主な対応表：

| 用途 | アイコン |
|---|---|
| アラート・警告 | `AlertTriangle` |
| 通知ベル | `Bell` |
| 設定 | `Settings` |
| オンライン（緑点滅） | `Wifi` |
| オフライン | `WifiOff` |
| 植物・栽培 | `Leaf` |
| 収穫 | `Scissors` |
| ゾーン追加 | `Plus` |
| 戻る | `ChevronLeft` |
| ログイン | `LogIn` |
| ログアウト | `LogOut` |
| センサー | `Activity` |

### オフライン判定

- `devices.last_seen_at` が `now() - interval '15 minutes'` より古い場合、そのデバイスはオフライン扱い
- 閾値は本番送信間隔（10分）の1.5倍に設定している。送信間隔を変更する場合は閾値も合わせて更新すること
- オフライン時はゾーンカード・デバイス欄に「オフライン」バッジを表示
- センサータイルの値をグレーアウトし「最終値」と表示

### Realtime 購読

- `readings` テーブルへの `INSERT` イベントを購読
- 受信したら該当ゾーンのセンサー現況を再フェッチ（楽観的更新は行わない）

---

## 画面 1：ゾーン管理 `/zones`

### レイアウト

- ページ上部にページタイトル（「ゾーン管理」）と「ゾーンを追加」ボタンを表示
- アクティブゾーン一覧セクション：ゾーン名・栽培方式バッジ・デバイス台数・現在の作付けを表示
- 各ゾーン行をクリックすると `/zones/[id]` へ遷移

### ゾーン行の表示内容

| 要素 | ソース |
|---|---|
| ゾーン名 | `zones.name` |
| 栽培方式バッジ | `zones.type`（`hydroponic` → 青、`soil` → 緑） |
| デバイス台数 | `devices` テーブルをカウント |
| 現在の作付け | `zone_plants.harvested_at IS NULL` のレコードから `plants.name` |

### 「ゾーンを追加」ボタン

- 右上（ヘッダー行）と空状態のエリア中央に表示
- クリックでゾーン追加モーダルを開く

### 非アクティブゾーン一覧

- アクティブゾーン一覧の下に「休止中」セクションを表示（非アクティブゾーンが1件以上ある場合のみ）
- ゾーン名を表示（クリックでゾーン詳細には遷移しない）
- 各行に「再開する」ボタンを表示
- 「再開する」ボタンクリックで `activateZone` Server Action を実行し `zones.is_active = true` に更新
- 処理中は「処理中...」と表示してボタンを無効化

---

## 画面 1-b：ダッシュボード（ホーム） `/`

### レイアウト

- **1 ゾーンのとき**：ゾーンカードを全幅（`width: 100%`）で表示
- **2 ゾーン以上のとき**：`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` でグリッド表示
- 「ゾーンを追加」は `/zones` ページに移管済み。ダッシュボードには「ゾーン管理」ボタンを配置して `/zones` へ誘導

### アラートバナー

- `resolved_at IS NULL` の件数が 1件以上のときのみ表示
- 表示内容：ゾーン名とセンサー種別を列挙。3件超は「他 N件」に省略
- 0件になると即時非表示（Realtime で `resolved_at` 更新を検知して消す）
- 右端に「確認する →」リンク（`/alerts` へ遷移）

### ゾーンカード

#### ヘッダー部

| 要素 | ソース・仕様 |
|---|---|
| ゾーン名 | `zones.name` |
| デバイス台数 | `devices` テーブルをカウント |
| 栽培方式バッジ | `zones.type`（`hydroponic` → 青、`soil` → 緑） |
| アラートバッジ | `alerts` の未解消件数。1件以上で赤バッジ表示 |
| アラート中のカード | 左辺に赤ボーダー 3px |

#### センサータイル

| 要素 | 仕様 |
|---|---|
| 表示値 | `readings` の最新 1件の raw 値 |
| 表示順 | `threshold_breach` / `sensor_fault` 発生中のタイルを先頭、残りは `sensor_type_masters` 登録順 |
| 表示件数 | 最大 3件（ホーム）/ 全件（ゾーン詳細） |
| 範囲バー | `plant_thresholds` の `alert_min / optimal_min / optimal_max / alert_max` を 0–100% にマッピング |
| バー色 | 適正範囲内（`optimal_min` ≤ 値 ≤ `optimal_max`）→ 緑、逸脱 → 赤 |

> **閾値が取得できない場合**（栽培なし、または該当センサー種別の `plant_thresholds` 未登録）  
> 範囲バーを非表示にし、値のみ表示する。

#### フッター部

| 要素 | ソース |
|---|---|
| 植物名 | `plants.name`（`zone_plants.harvested_at IS NULL` のレコードから）。栽培なしの場合は「作付けなし」 |
| 最終受信時刻 | 複数デバイスがある場合は `devices.last_seen_at` の最新値 |

- カードクリックでゾーン詳細 `/zones/[id]` へ遷移

#### 未解消アラート一覧

- ホームには最大 5件を表示。`started_at` 降順
- 6件以上は「すべて見る →」リンクで `/alerts` へ
- 解消ボタン：クリックで `alerts.resolved_at = now()` を即時セット（楽観的 UI 更新）

---

## 画面 2：ゾーン詳細 `/zones/[id]`

### ヘッダー

- ← 戻るボタン（lucide-react `ChevronLeft`）（ホームへ）
- ゾーン名
- 右端に設定アイコン（lucide-react `Settings`）（`/zones/[id]/settings` へ）
- アラートバナー：このゾーンに関する未解消アラートのみ表示

### ゾーン情報カード

#### 上部

| 要素 | ソース |
|---|---|
| 植物名 | `plants.name`。栽培なしの場合は「作付けなし」 |
| 植付からの日数 | `now() - zone_plants.planted_at`（日数）。栽培なしの場合は非表示 |
| 栽培方式バッジ | `zones.type` |
| アラート件数バッジ | このゾーンのセンサーに紐づく未解消アラート件数 |

#### アクションボタン

| ボタン | 動作 |
|---|---|
| 収穫する | 収穫モーダル（モーダル A）を開く |

### センサー現況

- 全センサーを表示（件数制限なし）
- タイルをタップ → そのセンサーのグラフに切り替え
- 選択中タイルに `border: 1.5px solid var(--color-border-info)` + 「グラフ表示中」ラベル
- アラート発生タイルは赤背景・赤文字＋「上限超過」「下限割れ」ラベル
- 各タイルの範囲バー下に `alert_min / optimal_min – optimal_max / alert_max` の数値をヒントとして表示

### グラフ

| 要素 | 仕様 |
|---|---|
| ライブラリ | Recharts `LineChart` |
| 初期表示センサー | アラート発生中のものを優先、なければ先頭タイルのセンサー |
| 期間切替 | `24h`（生データ）/ `7d`（1時間平均）/ `30d`（日次平均） |
| 閾値バンド | `optimal_min / optimal_max` を緑の帯で常時表示、`alert_min / alert_max` を赤の破線で常時表示 |
| ホバーツールチップ | 日時・値を表示 |
| サマリー | グラフ下に 最小 / 最大 / 平均 を表示 |

> **7d・30d の集計方法**  
> TimescaleDB は使用しない（Supabase PostgreSQL 17 環境では利用不可）。  
> `AVG() + GROUP BY` で都度集計する。本番の送信間隔が10分のため、  
> 7d で約1,000件・30d で約4,300件（センサー1本あたり）となり、インデックスが効いていれば十分な速度が出る。  
> 将来遅くなった場合はマテリアライズドビューへの切り替えで対応する。

**値の取得クエリ（24h：生データ）**

```sql
SELECT recorded_at, value
FROM readings
WHERE sensor_id = $1
  AND recorded_at >= now() - interval '24 hours'
ORDER BY recorded_at ASC;
```

**値の取得クエリ（7d：1時間平均）**

```sql
SELECT
    date_trunc('hour', recorded_at) AS recorded_at,
    AVG(value) AS value
FROM readings
WHERE sensor_id = $1
  AND recorded_at >= now() - interval '7 days'
GROUP BY date_trunc('hour', recorded_at)
ORDER BY recorded_at ASC;
```

**値の取得クエリ（30d：日次平均）**

```sql
SELECT
    date_trunc('day', recorded_at) AS recorded_at,
    AVG(value) AS value
FROM readings
WHERE sensor_id = $1
  AND recorded_at >= now() - interval '30 days'
GROUP BY date_trunc('day', recorded_at)
ORDER BY recorded_at ASC;
```

> **センサー補正（`sensor_calibrations`）追加後**  
> 補正済みトグル（ON: `readings.value + calibration.offset` / OFF: raw 値）と  
> ホバーツールチップへの補正差分表示を追記する。

### デバイス欄

- `last_seen_at` が 15分以内 → lucide-react `Wifi`（緑点滅）（オンライン）
- `last_seen_at` が 15分超 → lucide-react `WifiOff`（グレー）（オフライン）
- `devices.mac_address` を表示（例：`AA:BB:CC:DD:EE:FF`）
- `devices.status` が `revoked` の場合はグレーの「無効化済み」バッジを表示（`Wifi` / `WifiOff` より優先表示）
- デバイスに紐づくセンサー種別をピル表示
- 将来デバイスが複数になった場合は行が増えるだけ

### 栽培履歴セクション

- デバイス欄の下に表示
- データソース：`zone_plants` テーブルの `harvested_at IS NOT NULL` のレコードを `planted_at` 降順で取得
- テーブル形式で以下の項目を表示

| カラム | ソース・仕様 |
|---|---|
| 植物名 | `plants.name` |
| 植付日 | `zone_plants.planted_at`（`ja-JP` 形式） |
| 収穫日 | `zone_plants.harvested_at`（`ja-JP` 形式） |
| 栽培日数 | `harvested_at - planted_at` を日単位で計算 |
| 収穫量 | `zone_plants.harvest_weight_g`（g 単位）。NULL の場合は「記録なし」 |
| メモ | `zone_plants.notes`。NULL の場合は「—」 |

- 履歴が 0 件の場合は「過去の収穫記録がありません」のエンプティステートを表示
- Server Component でデータ取得し、`CultivationHistory` コンポーネントに props として渡す

---

## モーダル A：収穫

### トリガー

ゾーン詳細の「収穫する」ボタン

### 表示内容

| 要素 | ソース |
|---|---|
| 植付日 | `zone_plants.planted_at` |
| 栽培日数 | `now() - zone_plants.planted_at` |

### 入力

| フィールド | 仕様 |
|---|---|
| 収穫量 | 数値入力 + `g` 固定。0 以上の整数。必須 |
| メモ | テキストエリア。任意。`zone_plants.notes` に保存 |

- 0 g は入力可（枯死・廃棄の記録用）。DB 送信時は `harvest_weight_g = NULL`（`chk_weight_positive` 制約回避）
- 「確定するとこのゾーンの栽培が終了します」の警告文を表示

### 確定操作

```sql
UPDATE zone_plants
SET
    harvested_at      = now(),
    harvest_weight_g  = $1,  -- 0 g の場合は NULL
    notes             = $2
WHERE id = $3;
```

### 確定後の挙動

- モーダルを閉じる
- ゾーン詳細画面に残る
- ゾーン情報カードが「栽培なし」状態に切り替わる
- 「新しい作付けを開始する」ボタンを表示（`/zones/[id]/settings` へ誘導）

---

## 画面 3：アラート `/alerts`

### フィルター

#### タブ

| タブ | 条件 | カウント表示 |
|---|---|---|
| 未解消 | `resolved_at IS NULL` | 赤バッジ |
| 解消済み | `resolved_at IS NOT NULL` | グレーバッジ |

タブをまたいでゾーンフィルターの選択状態は保持する。

#### ゾーン絞り込み

- 「すべて」+ 各ゾーン名のチップを横並び表示
- 各チップに `zone_id` をシードにした固定色ドットを付与
- 1ゾーンのみの場合はフィルター行を非表示
- ゾーン絞り込み変更時はリストをリセットして先頭 20件を再取得

### アラートカード

#### 未解消

| 要素 | ソース・仕様 |
|---|---|
| 左ボーダー色 | `threshold_breach` → 赤（`#E24B4A`）、`sensor_fault` → アンバー（`#EF9F27`） |
| アラート種別バッジ | `alert_type` × `breach_direction`：上限超過 / 下限割れ / センサー異常 |
| タイトル | センサー名 + 種別の文言（例：「EC値 が上限を超過しています」） |
| 場所 | ゾーン名 · 植物名（`threshold_breach`）またはデバイス名（`sensor_fault`） |
| 発報値チップ | `alerts.triggered_value`（raw 値） |
| 閾値チップ | `breach_direction` に応じて `alert_min` または `alert_max` を表示 |
| 経過時間 | `now() - alerts.started_at`（分・時間・日で表現） |
| 解消ボタン | クリックで `resolved_at = now()` を即時セット。確認ダイアログなし（楽観的 UI 更新） |

#### 解消済み

- カードの `opacity: 0.7`
- 解消ボタンの代わりに「解消済み · {resolved_at} · 継続 {duration}」を緑で表示
- `breach_direction` に対応したバッジ色はそのまま維持

### ページネーション（もっと見る）

- 1回の取得件数：20件
- カーソルページネーション：`started_at < 最後のレコードの started_at` で取得（`OFFSET` は使わない）
- ボタンラベル：`さらに読み込む（残り N件）`
  - N は `COUNT` クエリで取得
  - N = 0 になったらボタンを非表示にして「すべて表示しました」と表示

### `sensor_fault` の検知ロジック（バックエンド側）

Edge Function 内で `readings` INSERT 時に実行。検知ロジック自体は後回し（`DATA_MODEL.md` の設計方針どおり）。

| 種類 | 条件 |
|---|---|
| 固着検知 | 同一センサーの直近 N 件が完全に同一値（N は環境変数で設定） |
| 範囲外検知 | 物理的にあり得ない値（例：pH ≤ 0 または ≥ 14、水温 ≤ -10 ℃）→ 種別ごとに定義 |

アラートストーム防止：同一センサー・同一 `alert_type` に `resolved_at IS NULL` のレコードが存在する場合は新規作成しない（`DATA_MODEL.md` の設計方針どおり）。

---

## ゾーン管理画面（`/zones/[id]/settings`）

ゾーン詳細画面のヘッダーにある設定アイコンから遷移する。

### セクション構成

| セクション | 表示条件 | 内容 |
|---|---|---|
| ゾーン名を変更 | 常に表示 | ゾーン名のインライン編集フォーム |
| 作付けを開始 | 現在の作付けがない場合のみ表示 | 植物の選択と作付け開始 |
| デバイス管理 | 常に表示 | 未承認（pending）デバイスの承認・登録済みデバイスの名前編集・無効化をまとめて管理 |
| センサーを削除 | アクティブなセンサーが1件以上ある場合のみ表示 | センサーの論理削除 |
| ゾーンを休止する | 常に表示 | ゾーンの非アクティブ化（破壊的操作として扱う） |

### 「ゾーンを休止する」セクション

- ページ最下部に赤いボーダーのセクションとして表示
- 操作の説明文を表示（ダッシュボードから非表示になること、データ送信が拒否されること、再開可能なこと）
- 「ゾーンを休止する」ボタン（赤系のアウトラインボタン）クリックで確認UI（インライン）を表示
- 確認UI では警告文と「休止する」「キャンセル」ボタンを表示
- 「休止する」ボタンクリックで `deactivateZone` Server Action を実行し `zones.is_active = false` に更新
- 処理完了後は `/zones` ページへリダイレクト

### デバイス管理セクション

「未承認デバイスの承認」「登録済みデバイスの名前編集・無効化」を1つのセクションにまとめる。  
キーレス登録（案B / TOFU方式）採用に伴い、旧APIキー方式の「デバイス追加（手動キー発行）」「APIキー再発行」「キーのコピー」は廃止した。デバイスはESP32が自ら `POST /enroll` することで登録され、UIからの手動追加はできない。

- **未承認デバイス（`status='pending'` が1件以上ある場合に表示）**  
  全ユーザー共通の pending デバイス一覧を横並びで表示する（他ユーザーが起動したデバイスも含む。詳細は `DATA_MODEL.md` の RLS 設計を参照）。
  - `devices.mac_address`（例：`AA:BB:CC:DD:EE:FF`）
  - 初回接続日時：`devices.created_at`（`ja-JP` 形式）
  - `devices.firmware_ver`
  - デバイス名の入力欄（任意）
  - 「このゾーンに承認」ボタン：クリックで `approveDevice` Server Action を実行し、`devices.user_id = 承認者`, `devices.zone_id = このゾーンのid`, `devices.status = 'active'`、入力があれば `devices.name` も更新する
  - 処理中は「処理中...」と表示してボタンを無効化（二重送信ガード）
- **登録済みデバイス（このゾーンに割り当て済みのデバイスが1件以上ある場合に表示）**  
  デバイスごとに以下を横並びで表示する。
  - デバイス名（未設定の場合は `mac_address` の下6桁で代替表示）
  - `devices.mac_address`
  - ステータスバッジ（`active` → 緑「稼働中」、`revoked` → グレー「無効化済み」）
  - 「編集」ボタン: インラインフォームでデバイス名を編集
  - 「無効化する」ボタン（破壊的操作。`active` のデバイスにのみ表示）: クリックで確認ダイアログを表示し、確定すると `revokeDevice` Server Action を実行して `devices.status = 'revoked'` に更新する。処理中はボタンを無効化（二重送信ガード）

> **登録キー管理画面は追加しない**  
> 案A（MACクレーム方式）で検討した「登録キー管理画面」（共有登録キーの発行・失効UI）は、案B採用によりキーの発行・焼き込み自体が不要になったため追加しない。

### `approveDevice` / `revokeDevice` Server Action 仕様

`'use server'` の Server Action として実装し、以下を必ず満たす。

| 項目 | 仕様 |
|---|---|
| 認証確認 | データ変更操作のため `getUser()`（Auth サーバーで照合）を使用し、未認証なら早期リターンでエラーを返す |
| 入力検証 | `deviceId`（UUID形式）・`zoneId`（UUID形式）・`name`（100文字以内、任意）をアクション冒頭でバリデーションし、不正値は早期リターン |
| ゾーン所有権確認 | `zoneId` が呼び出し元ユーザーの `zones.user_id = auth.uid()` であることを確認してから更新する（RLS の `WITH CHECK` も同条件で二重に保証する） |
| 更新方式 | 後述の原子的 `UPDATE`（`WHERE` に状態条件を含む単一クエリ）のみを使用する。SELECT してから UPDATE する2ステップ方式は禁止（TOCTOU レース対策） |
| 戻り値 | `{ success: true }` または `{ success: false, error: string }` の判別可能な戻り値とし、呼び出し側（`useActionState`）でエラーメッセージを表示する |
| キャッシュ再検証 | 成功時は `revalidatePath('/zones/[id]/settings')` に加え、pending 一覧はゾーン横断で共有されるため `/zones/[id]/settings` 以外のゾーンからも古い pending 一覧が見えないよう `revalidatePath('/zones/[id]/settings', 'layout')` 相当（全ゾーン設定ページ）または pending 一覧専用の `revalidateTag('pending-devices')` を使用する |

**`approveDevice` の原子的 UPDATE（競合安全）**

```sql
UPDATE devices
SET user_id = $承認者のuid,
    zone_id = $ゾーンid,
    status  = 'active',
    name    = COALESCE($入力された名前, name)
WHERE id = $deviceId
  AND status = 'pending'
  AND (user_id IS NULL OR user_id = $承認者のuid);
```

`user_id IS NULL`（公開 pending。誰でも承認可）と `user_id = $承認者のuid`（ゾーン削除で巻き戻った所有者持ち pending の再割当）の両方を許可するが、他ユーザーが既に所有する pending には条件がマッチしないため競合しない。影響行数が 0 件の場合（他ユーザーが先に承認済み、またはデバイスが既に存在しない）は `{ success: false, error: '他のユーザーが既に承認済みです' }` を返し、pending 一覧を再検証してクライアントの表示を最新化する。詳細な設計意図は `DATA_MODEL.md` の [`approveDevice` の競合安全性（atomicity）](DATA_MODEL.md#rls-ポリシー設計) を参照。

**`revokeDevice` の原子的 UPDATE**

```sql
UPDATE devices
SET status = 'revoked'
WHERE id = $deviceId
  AND status = 'active'
  AND user_id = $所有者のuid;
```

影響行数が 0 件の場合（既に無効化済み、または対象が見つからない）はエラーとして扱う。

---

## 画面 P2：植物マスタ `/settings/plants`

### レイアウト

- ページヘッダー（「植物マスタ」タイトル、登録件数、「植物を追加」ボタン）
- 植物カードグリッド（1 列 / 2 列 / 3 列 でレスポンシブ表示）
- 植物が 0 件の場合は空状態コンポーネントを表示

### 植物カード

| 要素 | ソース |
|---|---|
| 植物名 | `plants.name` |
| 栽培方式バッジ | `plants.cultivation_type`（水耕 / 土壌 / 両対応） |
| 閾値サマリー | 最大 3 件の `plant_thresholds` をスケールバーで表示。0 件の場合は「閾値が設定されていません」 |

### カードフッターのアクション

| ボタン | アイコン | 動作 |
|---|---|---|
| 閾値を編集 | `Pencil` | `EditThresholdModal` を開く |
| 植物を編集 | `Settings2` | `EditPlantModal` を開く |
| 削除 | `Trash2` | `DeleteConfirmModal` を開く |

### EditPlantModal — 植物名・栽培方式の編集

- トリガー：植物カードの「植物を編集」ボタン（`Settings2` アイコン）
- 編集フィールド：植物名（テキスト入力）・栽培方式（セグメントコントロール：水耕 / 土壌 / 両対応）
- バリデーション：植物名は必須・100 文字以内
- 権限チェック：`created_by = null`（システム植物）または `created_by ≠ 自分` の場合は変更不可（エラー表示）
- 成功後：モーダルを自動的に閉じ、一覧を最新状態に更新

### AddPlantModal — 植物の追加

- 植物名（必須）・栽培方式・センサー閾値を入力して植物を登録
- 閾値はセンサー種別ごとに「警告下限 ≤ 適正下限 ≤ 適正上限 ≤ 警告上限」の順序チェックあり

### EditThresholdModal — 閾値の編集

- センサー種別ごとに `alert_min / optimal_min / optimal_max / alert_max` を編集
- 栽培方式に対応するセンサー種別のみ表示

### DeleteConfirmModal — 植物の削除確認

- 対象植物名を表示して削除を確認
- ゾーンで使用中の植物は削除不可（エラー表示）
- システム植物（`created_by = null`）は削除不可

---

## 未決定事項（P2 以降）

> **後回し（スキーマ追加後に仕様を追記）**
> - センサー補正値管理画面（`/settings/calibrations`）：`sensor_calibrations` テーブル追加後に定義
> - 成長ステージ機能（ステージトラック・ステージ変更モーダル・ステージ別閾値表示）：`plant_thresholds` と `zone_plants` への `growth_stage` カラム追加後に定義

---

## v5 からの変更点

デバイス登録をAPIキー方式からキーレス登録（案B / TOFU方式）に変更したことに伴い、ゾーン設定画面のデバイス管理セクションを改訂した。

### 変更

| 対象 | 内容 |
|---|---|
| デバイス管理セクション | 「デバイスを追加（手動キー発行）」「APIキー再発行」「キーのコピー」を廃止し、「未承認デバイスの承認」「登録済みデバイスの名前編集・無効化」に置き換え |
| デバイス欄（ゾーン詳細） | `devices.mac_address` の表示と `revoked` バッジを追加 |
| セクション構成の表 | 「デバイス管理」の内容説明をキーレス登録に合わせて更新 |
| 参照するデータモデル | `DATA_MODEL.md`（v4 → v5 に更新） |

### 追加

| 対象 | 内容 |
|---|---|
| 未承認デバイス一覧 | MACアドレス・初回接続日時（`created_at`）・firmwareバージョンを表示し、名前入力・ゾーン割当で承認（active化）する UI を追加 |
| 「無効化する」ボタン | 登録済みデバイスを `revoked` にする破壊的操作（確認ダイアログ + 二重送信ガード）を追加 |
| `approveDevice` / `revokeDevice` Server Action 仕様 | 認証確認（`getUser()`）・入力検証・ゾーン所有権確認・原子的 `UPDATE`（`WHERE` に状態条件を含む）による競合安全性・戻り値・キャッシュ再検証の仕様を明記 |

### 追加しないもの

| 対象 | 理由 |
|---|---|
| 登録キー管理画面 | 案A（MACクレーム方式）で検討したが、案B採用によりキーの発行・焼き込み自体が不要になったため追加しない |

### 変更なし

デバイス管理セクション以外の画面レイアウト・センサータイル・グラフ・モーダル・アラート画面の仕様は v5 から変更なし。
