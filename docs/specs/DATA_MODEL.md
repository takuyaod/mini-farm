# データモデル v5

ミニ農園モニタリングシステムのデータベース設計書。  
水耕・土壌の両栽培方式、複数品種、1ゾーン複数ESP32に対応。

> **このファイルについて**  
> `DATA_MODEL_v4.md`（v4）を精査した改訂版。  
> デバイス認証を API キー方式から MAC クレーム方式（案A）に変更。  
> 変更の概要は末尾の「[v4 からの変更点](#v4-からの変更点)」を参照。

---

## テーブル一覧

| テーブル | 役割 |
|---|---|
| `users` | ユーザー認証 |
| `zones` | 栽培エリア（水耕 / 土壌） |
| `devices` | ゾーンに紐づくESP32（MAC アドレスで識別） |
| `enrollment_keys` | デバイス登録用の共有キー |
| `sensor_type_masters` | センサー種別マスタ（表記揺れ防止） |
| `sensors` | デバイスに物理的に取り付けたセンサー |
| `readings` | センサーの時系列計測値（rawを保存） |
| `plants` | 植物マスタ |
| `plant_thresholds` | 品種 × センサー種別の適正値・アラート閾値 |
| `zone_plants` | どのゾーンで何を育てているか（栽培履歴） |
| `alerts` | アラート発報・解消の記録 |

> **後回しにしたテーブル**  
> `sensor_calibrations`（センサー補正値履歴）は rawを保存している限りいつでも追加できる。  
> 必要になった時点でテーブルを追加し、過去データに遡って補正を適用できる。

---

## UUID v7 関数

すべてのテーブルの主キーは UUID v7 を使用する。  
UUID v7 はタイムスタンプを先頭に埋め込んだ時系列ソート可能な UUID であり、  
UUID v4（ランダム）と比べてBTreeインデックスのページ分割が少なく、  
大量INSERTが発生する `readings` テーブルで特に効果がある。

> **PostgreSQL 18 への移行時の注意**  
> PostgreSQL 18 では組み込みの `uuidv7()` 関数が利用可能になる。  
> Supabase が PostgreSQL 18 に移行した時点で、本関数を削除し  
> 各テーブルの `DEFAULT` を `uuidv7()` に変更すること。

```sql
-- UUID v7 生成関数（PL/pgSQL 実装。PostgreSQL 17 対応）
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
PARALLEL SAFE
AS $$
DECLARE
  unix_ts_ms BYTEA;
  uuid_bytes BYTEA;
BEGIN
  unix_ts_ms = substring(
    int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
    FROM 3
  );
  uuid_bytes = uuid_send(gen_random_uuid());
  uuid_bytes = overlay(uuid_bytes placing unix_ts_ms FROM 1 FOR 6);
  uuid_bytes = set_byte(
    uuid_bytes, 6,
    (b'0111' || substring(get_byte(uuid_bytes, 6)::bit(8) FROM 5))::bit(8)::int
  );
  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;
```

---

## ENUM 定義

```sql
-- 栽培方式
-- zones では 'both' は使用しない（水耕か土壌かを明示する）
-- sensor_type_masters と plants では 'both' 使用可
CREATE TYPE cultivation_type AS ENUM ('hydroponic', 'soil', 'both');

-- アラート種別
-- sensor_fault の検知ロジックは後回し。ENUMの値だけ確保しておく
CREATE TYPE alert_type AS ENUM (
    'threshold_breach',  -- 適正値逸脱
    'sensor_fault'       -- センサー異常（後回し）
);
```

---

## テーブル定義

### users

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### zones

栽培エリアの単位。1ゾーン1植物（同時栽培）を前提とする。

```sql
CREATE TABLE zones (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name       VARCHAR(100) NOT NULL,
    type       cultivation_type NOT NULL,  -- 'both' は使用しない
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active  BOOLEAN NOT NULL DEFAULT true  -- false = 休止中（sensors.is_active と同じパターン）
);
```

> **ゾーンの休止（非アクティブ化）**  
> `devices` / `zone_plants` が `ON DELETE RESTRICT` で参照しているためゾーンの物理削除は不可。  
> `is_active = false` に設定することで論理的に休止状態にし、ダッシュボードから非表示にする。  
> 非アクティブゾーンのデバイスから Edge Function にデータが送信された場合は 403 を返す。  
> `/zones` ページから `is_active = true` に戻すことで再開できる。

---

### devices

ゾーンに設置するESP32。1ゾーンに複数台置ける。  
認証はデバイスの MAC アドレスで行う（個体ごとの API キーは不要）。

```sql
-- devices.status の ENUM
CREATE TYPE device_status AS ENUM (
    'pending',   -- 未承認（enroll 済み・ゾーン未割り当て）
    'active',    -- 承認済み（ゾーンに割り当て済み・データ送信可）
    'revoked'    -- 無効化（管理者が手動で無効化）
);

CREATE TABLE devices (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    zone_id      UUID REFERENCES zones(id) ON DELETE SET NULL,  -- NULL = pending
    mac_address  VARCHAR(17) NOT NULL UNIQUE,  -- 例: "AA:BB:CC:DD:EE:FF"（コロン区切り大文字）
    name         VARCHAR(100),                 -- 例: "水質担当"（任意）
    status       device_status NOT NULL DEFAULT 'pending',
    firmware_ver VARCHAR(20),
    last_seen_at TIMESTAMPTZ                   -- readings受信時に自動更新。15分超でオフライン扱い
);
```

> **MAC アドレスの形式**  
> `AA:BB:CC:DD:EE:FF` 形式（コロン区切り・大文字）で正規化して保存する。  
> ESP32 は `WiFi.macAddress()` で取得した文字列をそのまま送信する。

> **zone_id の NULL 許容**  
> `pending` 状態では `zone_id = NULL`。UI でゾーンに割り当てると `active` に更新する。  
> ゾーンが削除された場合は `ON DELETE SET NULL` で `NULL` に戻り `pending` 状態に準ずる。

> **オフライン判定の閾値について**  
> 本番の送信間隔は10分のため、閾値は送信間隔の1.5倍である15分に設定する。  
> 送信間隔を変更した場合は、この閾値も合わせて見直すこと。  
> 閾値は `OFFLINE_THRESHOLD_MINUTES` 定数としてバックエンド・フロントエンドで一元管理する。

---

### enrollment_keys

全デバイスに共通で焼き込む「登録キー」の管理テーブル。  
1ユーザーにつき有効キーを複数持てるが、通常は1本運用。  
キー本体はプレーンテキストで保存せず SHA-256 ハッシュのみ保存する。

```sql
CREATE TABLE enrollment_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- ユーザー削除時に連鎖削除（失効した登録キーも同時に破棄）
    key_hash    VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256ハッシュ（hex）
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ                  -- NULL = 有効。失効操作で now() をセット
);
```

> **キー発行フロー**  
> UI で「新しい登録キーを発行」ボタンを押す → サーバー側でランダム文字列を生成 →  
> プレーンテキストを1度だけ画面に表示（コピー後は復元不可）→ ハッシュのみ DB に保存。
>
> **キー再発行時のセキュリティ**  
> 旧キーは即座に `revoked_at = now()` にして無効化する。  
> 旧キーを持つ未登録デバイスは再度 enroll できなくなるため、再発行前にすべてのデバイスを enroll 済みにすること。

---

### sensor_type_masters

センサー種別のマスタテーブル。文字列フリーのカラムを避けて表記揺れを防ぐ。

```sql
CREATE TABLE sensor_type_masters (
    id               VARCHAR(30) PRIMARY KEY,  -- 例: "ec", "ph", "water_temp"
    label            VARCHAR(50) NOT NULL,      -- 例: "EC値"
    unit             VARCHAR(20),               -- 例: "mS/cm"
    cultivation_type cultivation_type NOT NULL  -- 'both' = 水耕・土壌どちらでも使用可
);
```

**初期データ**

| id | label | unit | cultivation_type |
|---|---|---|---|
| `water_temp` | 水温 | ℃ | hydroponic |
| `ec` | EC値 | mS/cm | hydroponic |
| `ph` | pH | — | hydroponic |
| `water_level` | 水位 | cm | hydroponic |
| `soil_moisture` | 土壌水分 | % | soil |
| `soil_temp` | 地温 | ℃ | soil |
| `air_temp` | 気温 | ℃ | both |
| `humidity` | 湿度 | % | both |
| `light` | 照度 | lux | both |

> **`sensor_type_masters.id` は変更しない**  
> ESP32のファームウェアはこの `id` 文字列をハードコードして送信する。  
> 変更するとファームウェアの書き直しが必要になるため、一度登録した `id` は変えない。

---

### sensors

デバイスに物理的に取り付けたセンサーの定義。  
センサーを撤去しても `is_active = false` で論理削除し、過去の計測値を保持する。

```sql
CREATE TABLE sensors (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    device_id         UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    sensor_type_id    VARCHAR(30) NOT NULL REFERENCES sensor_type_masters(id) ON DELETE RESTRICT,
    label             VARCHAR(100),   -- 独自の表示名（任意）
    is_active         BOOLEAN NOT NULL DEFAULT true,
    decommissioned_at TIMESTAMPTZ     -- 撤去日時
);

-- 同一デバイスに同種センサーを複数登録できないようにする。
-- is_active = true のみに絞ることで、撤去済みを同種で再登録できる余地を残す。
CREATE UNIQUE INDEX uq_sensor_per_device
    ON sensors (device_id, sensor_type_id)
    WHERE is_active = true;
```

---

### readings

センサーの時系列計測値。レコード数が最も多くなるテーブル。  
**`value` はrawの計測値を保存する。補正は後から `sensor_calibrations` テーブルを追加して対応する。**

UUID v7 を主キーに採用しており、挿入時刻順にソートされるため  
BTreeインデックスのページ分割が抑制され、大量INSERT時のパフォーマンスが向上する。

```sql
CREATE TABLE readings (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    sensor_id        UUID NOT NULL REFERENCES sensors(id) ON DELETE RESTRICT,
    value            FLOAT NOT NULL,        -- raw値（補正前）
    recorded_at      TIMESTAMPTZ NOT NULL,  -- UTCで統一。NTP失敗時はバックエンドの受信時刻を使う
    idempotency_key  VARCHAR(128) UNIQUE    -- 重複送信防止。有効期限は24時間（後述）
);

CREATE INDEX idx_readings_sensor_time
    ON readings (sensor_id, recorded_at DESC);
```

> **データ保持方針**  
> すべての readings を削除せず保持する。自動削除・自動集計は実装しない。  
> Supabase Free プランの DB ストレージ上限（500MB）を超えた時点で有料プランへの移行を検討する。  
> 本番の送信間隔は10分のため、センサー3本構成で約 500MB に達するまで約2,500日かかる試算。

> **idempotency_key のクリーンアップ**  
> readings レコード自体は保持したまま、`idempotency_key` のみ NULL に更新することで  
> UNIQUE 制約を解放する。pg_cron で毎日1回実行する。
>
> ```sql
> -- 毎日 03:00 UTC に実行
> SELECT cron.schedule(
>   'cleanup-idempotency-keys',
>   '0 3 * * *',
>   $$
>     UPDATE readings
>     SET idempotency_key = NULL
>     WHERE recorded_at < now() - interval '24 hours'
>       AND idempotency_key IS NOT NULL;
>   $$
> );
> ```

---

### plants

植物マスタ。品種ごとに1レコード。

```sql
CREATE TABLE plants (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name             VARCHAR(100) NOT NULL,
    cultivation_type cultivation_type NOT NULL,  -- 'both' = 水耕・土壌どちらでも育てられる品種
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

---

### plant_thresholds

品種 × センサー種別の適正値・アラート閾値。

```sql
CREATE TABLE plant_thresholds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    plant_id        UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    sensor_type_id  VARCHAR(30) NOT NULL REFERENCES sensor_type_masters(id) ON DELETE RESTRICT,
    optimal_min     FLOAT,    -- 適正値の下限
    optimal_max     FLOAT,    -- 適正値の上限
    alert_min       FLOAT,    -- アラート発報の下限
    alert_max       FLOAT,    -- アラート発報の上限

    UNIQUE (plant_id, sensor_type_id),

    -- 大小関係の整合性チェック: alert_min <= optimal_min <= optimal_max <= alert_max
    CONSTRAINT chk_threshold_order CHECK (
        (alert_min   IS NULL OR optimal_min IS NULL OR alert_min   <= optimal_min) AND
        (optimal_min IS NULL OR optimal_max IS NULL OR optimal_min <= optimal_max) AND
        (optimal_max IS NULL OR alert_max   IS NULL OR optimal_max <= alert_max)
    )
);
```

> **v3 からの変更なし（構造）**  
> `growth_stage` 軸は削除済み。`(plant_id, sensor_type_id)` の2軸。  
> 成長ステージ別の閾値が必要になったら `growth_stage` カラムを追加して対応する。

**バジル（水耕）のデータ例**

| plant | sensor_type | optimal_min | optimal_max | alert_min | alert_max |
|---|---|---|---|---|---|
| バジル | ec | 1.5 | 2.0 | 1.0 | 2.5 |
| バジル | ph | 6.0 | 6.5 | 5.5 | 7.0 |

---

### zone_plants

どのゾーンで何を育てているかの記録。栽培履歴を兼ねる。  
`harvested_at IS NULL` が現在の栽培を表す。  
Partial Unique Index により、1ゾーンに同時栽培中の植物が2件以上になることをDBレベルで防ぐ。

```sql
CREATE TABLE zone_plants (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    zone_id           UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    plant_id          UUID NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
    planted_at        TIMESTAMPTZ NOT NULL,
    harvested_at      TIMESTAMPTZ,               -- NULL = 栽培中
    harvest_weight_g  FLOAT,                     -- 収穫量（g）
    notes             TEXT,

    CONSTRAINT chk_harvest_after_plant CHECK (
        harvested_at IS NULL OR harvested_at > planted_at
    ),
    CONSTRAINT chk_weight_positive CHECK (
        harvest_weight_g IS NULL OR harvest_weight_g > 0
    )
);

-- 1ゾーン1植物をDBレベルで保証する
CREATE UNIQUE INDEX uq_zone_plants_active
    ON zone_plants (zone_id)
    WHERE harvested_at IS NULL;
```

**「現在の栽培」を取得するクエリ例**

```sql
SELECT zp.*, p.name AS plant_name
FROM zone_plants zp
JOIN plants p ON p.id = zp.plant_id
WHERE zp.zone_id = $1
  AND zp.harvested_at IS NULL;
```

**適正値を取得するクエリ例（アラート判定用）**

```sql
SELECT pt.*
FROM zone_plants zp
JOIN plant_thresholds pt ON pt.plant_id = zp.plant_id
WHERE zp.zone_id    = $1
  AND zp.harvested_at IS NULL;
```

---

### alerts

アラートの発報・解消を管理する。  
`resolved_at IS NULL` が未解消のアラートを表す。  
同一センサー・同一 `alert_type` に未解消アラートが存在する場合は新規作成しない（アラートストーム防止）。

```sql
CREATE TABLE alerts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    sensor_id         UUID NOT NULL REFERENCES sensors(id) ON DELETE RESTRICT,
    alert_type        alert_type NOT NULL,
    triggered_value   FLOAT,               -- 発報時の計測値（raw）
    breach_direction  VARCHAR(4),          -- 'high'（上限超過）/ 'low'（下限割れ）/ NULL（sensor_fault）
    started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at       TIMESTAMPTZ          -- NULL = 未解消
);
```

---

## ER図

```
users
 ├─[1:N]─ zones
 │          ├─[1:N]─ devices（zone_id NULL 許容）
 │          │          └─[1:N]─ sensors ──[1:N]─ readings
 │          │                      │
 │          │          sensor_type_masters ──[1:N]─ sensors
 │          │                      └─[1:N]─ plant_thresholds
 │          │
 │          └─[1:N]─ zone_plants
 │
 ├─[1:N]─ devices（user_id で直接所有）
 └─[1:N]─ enrollment_keys

sensors ──[1:N]─ alerts

plants ──[1:N]── zone_plants
   └─[1:N]────── plant_thresholds
```

---

## ESP32 送信フォーマット

MAC クレーム方式では **enroll** と **readings** の 2 フローに分かれる。

### フロー 1：デバイス登録（enroll）

ESP32 起動時に1度だけ実行する。成功後は以降の送信で登録キーは不要。

```json
POST /api/enroll
Content-Type: application/json

{
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "enrollment_key": "{登録キー（プレーンテキスト）}",
  "firmware_ver": "1.0.0"
}
```

**レスポンス（成功）**

| ステータス | 意味 |
|---|---|
| `201 Created` | 新規登録成功。`pending` 状態でデバイスを作成した |
| `200 OK` | 冪等：同じ MAC アドレスで再登録（すでに `pending` or `active`）。状態は変更しない |

```json
// 201 / 200 共通
{ "status": "pending", "device_id": "..." }
```

**エラーケース**

| ステータス | 原因 |
|---|---|
| `401 Unauthorized` | `enrollment_key` が無効（`key_hash` 不一致 or `revoked_at IS NOT NULL`） |
| `400 Bad Request` | `mac_address` の形式不正 |

> **冪等性の設計**  
> 同一 MAC で再送されても二重登録しない。リトライ安全な設計とする。  
> `revoked` 状態のデバイスが再 enroll した場合は `403 Forbidden` を返す（手動無効化を尊重）。

---

### フロー 2：センサーデータ送信（readings）

`active` 状態のデバイスのみ受け付ける。登録キーは不要。

```json
POST /api/readings
X-Device-MAC: AA:BB:CC:DD:EE:FF
Content-Type: application/json

{
  "timestamp": "2026-05-26T10:00:00Z",
  "readings": [
    { "sensor_type": "ec",         "value": 1.8 },
    { "sensor_type": "ph",         "value": 6.2 },
    { "sensor_type": "water_temp", "value": 22.5 }
  ],
  "idempotency_key": "AA:BB:CC:DD:EE:FF_1748253600"
}
```

> **MAC ヘッダーによる認証**  
> Edge Function は `X-Device-MAC` ヘッダーの MAC アドレスで `devices` テーブルを検索し、  
> `status = 'active'` のデバイスのみ処理する。  
> `zone_id` はバックエンドが `devices` から引くため、ESP32は送信不要。

**エラーケース**

| ステータス | 原因 |
|---|---|
| `401 Unauthorized` | MAC アドレスが `devices` に存在しない |
| `403 Forbidden` | デバイスが `pending`（ゾーン未割り当て）または `revoked` |
| `403 Forbidden` | ゾーン（`zones.is_active = false`）が休止中 |

### Wi-Fi断絶からの復帰時（バッチ送信）

```json
POST /api/readings/batch
X-Device-MAC: AA:BB:CC:DD:EE:FF
Content-Type: application/json

{
  "batches": [
    {
      "timestamp": "2026-05-26T09:00:00Z",
      "idempotency_key": "AA:BB:CC:DD:EE:FF_1748250000",
      "readings": [
        { "sensor_type": "ec", "value": 1.7 },
        { "sensor_type": "ph", "value": 6.3 }
      ]
    }
  ]
}
```

---

## Edge Function 挙動仕様

### enroll エンドポイント（`POST /api/enroll`）

1. リクエストボディから `enrollment_key`（プレーンテキスト）を取得し SHA-256 でハッシュ化する
2. `enrollment_keys` テーブルで `key_hash` を照合する
   - 一致するレコードが存在しない → `401 Unauthorized`
   - `revoked_at IS NOT NULL` → `401 Unauthorized`
3. `mac_address` の形式チェック（`AA:BB:CC:DD:EE:FF` 正規表現）
   - 形式不正 → `400 Bad Request`
4. `devices` テーブルで `mac_address` を検索する
   - 存在しない → `INSERT` して `status = 'pending'`、`user_id = enrollment_keys.user_id` を設定。`201 Created`
   - 存在する（`pending` or `active`）→ `firmware_ver` のみ更新して `200 OK`（冪等）
   - 存在する（`revoked`）→ `403 Forbidden`

> Edge Function 内では Service Role Key で RLS をバイパスする。  
> `user_id` は `enrollment_keys.user_id` から引き継ぐ（リクエストに Auth セッションなし）。

### readings エンドポイント（`POST /api/readings`）

1. `X-Device-MAC` ヘッダーから MAC アドレスを取得する
2. `devices` テーブルで `mac_address` を照合する
   - 存在しない → `401 Unauthorized`
   - `status = 'pending'` → `403 Forbidden`（ゾーン未割り当て）
   - `status = 'revoked'` → `403 Forbidden`
3. `devices.zone_id` を取得し `zones.is_active` を確認する
   - `is_active = false` → `403 Forbidden`（ゾーン休止中）
4. `device_id` × `sensor_type_id` で `sensors` テーブルを検索してセンサーを特定する
5. `readings` を INSERT する
6. `devices.last_seen_at = now()` を同一トランザクション内で更新する

> `zone_id` はバックエンドが `devices` レコードから自動で引き込む。ESP32 は送信不要。

### `last_seen_at` の更新

`readings` の INSERT と同じトランザクション内で `devices.last_seen_at` を更新する。

```sql
UPDATE devices SET last_seen_at = now() WHERE id = $device_id;
```

非同期処理にしない理由：INSERT は成功したのに `last_seen_at` が更新されないケースを防ぐため。  
オフライン判定の信頼性がダッシュボードの UX に直結する。

### オフライン判定の定数管理

本番送信間隔（10分）と閾値（15分）は一箇所で定義し、バックエンド・フロントエンドで共有する。

```typescript
// shared/constants.ts（Edge Function・Next.js 双方でインポート可能なファイル）
export const SEND_INTERVAL_MS      = 10 * 60 * 1000  // 10分
export const OFFLINE_THRESHOLD_MIN = 15               // 15分（送信間隔の1.5倍）
```

> 送信間隔を変更する場合は `OFFLINE_THRESHOLD_MIN` も同時に更新すること。

### 未知の `sensor_type` が来た場合

`sensor_type_masters` に存在しない `sensor_type` を含むリクエストは、  
その `sensor_type` のみスキップし、残りは正常処理する。レスポンスに警告を含める。

```json
// レスポンス例
{
  "accepted": ["ec", "ph"],
  "skipped": [{ "sensor_type": "unknown_sensor", "reason": "not registered" }]
}
```

全件エラーにしない理由：1つの未知センサーのせいで正常なセンサーのデータが欠損するのを防ぐため。

### `sensor_type` とセンサーの対応

ESP32 は `sensor_type` 文字列のみ送信する。  
バックエンドは `device_id` × `sensor_type_id` で `sensors` テーブルから該当センサーを特定する。  
`uq_sensor_per_device` の Partial Unique Index（`is_active = true`）がこの特定の前提となる。

---

## RLS ポリシー設計

### テーブル分類

**グローバルマスタ**（全ユーザーが読める・書けない）

| テーブル | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `sensor_type_masters` | 全員 OK | 不可（管理者のみ） |

```sql
-- 例：sensor_type_masters
ALTER TABLE sensor_type_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read" ON sensor_type_masters
  FOR SELECT USING (true);
```

**ユーザーデータ**（自分のデータのみ）

| テーブル | ポリシーの基準 |
|---|---|
| `zones` | `zones.user_id = auth.uid()` |
| `devices` | `devices.user_id = auth.uid()`（フラット述語・JOIN 不要） |
| `enrollment_keys` | `enrollment_keys.user_id = auth.uid()` |
| `sensors` | `zones.user_id = auth.uid()`（devices → zones を JOIN） |
| `readings` | `zones.user_id = auth.uid()`（sensors → devices → zones を JOIN） |
| `zone_plants` | `zones.user_id = auth.uid()`（zones を JOIN） |
| `alerts` | `zones.user_id = auth.uid()`（sensors → devices → zones を JOIN） |
| `plants` | `plants.created_by = auth.uid()` |
| `plant_thresholds` | `plants.created_by = auth.uid()`（plants を JOIN） |

```sql
-- devices：フラット述語（user_id を直接持つため JOIN 不要）
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON devices
  FOR ALL USING (devices.user_id = auth.uid());

-- UPDATE 時はゾーンの所有者チェックも追加する
CREATE POLICY "owner can assign zone" ON devices
  FOR UPDATE USING (devices.user_id = auth.uid())
  WITH CHECK (
    zone_id IS NULL OR EXISTS (
      SELECT 1 FROM zones
      WHERE zones.id = devices.zone_id
        AND zones.user_id = auth.uid()
    )
  );
```

```sql
-- enrollment_keys
ALTER TABLE enrollment_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON enrollment_keys
  FOR ALL USING (enrollment_keys.user_id = auth.uid());
```

### Edge Function での DB 操作

ESP32 からのリクエストは Supabase Auth のセッションを持たないため、  
Edge Function 内では **Service Role Key** を使って RLS をバイパスする。  
デバイス認証（MAC アドレス照合・`status` チェック）は Edge Function 側で完結させる。

---

## 本番 DB への適用手順（将来参照用）

> 現時点（2026-06-14）では `supabase db reset` によるローカル開発専用のマイグレーションであり、本番 DB は存在しない。  
> 将来、既存レコードが存在する本番 DB に `20260614000000_devices_schema_v2.sql` を適用する際は以下の手順に従うこと。

### `mac_address NOT NULL UNIQUE` の適用

`mac_address VARCHAR(17) NOT NULL UNIQUE` は空テーブル前提の制約追加である。  
既存レコードがある環境にそのまま適用すると `ERROR: column "mac_address" of relation "devices" contains null values` で失敗する。

**適用手順**

1. まず NULL 許容でカラムを追加する:
   ```sql
   ALTER TABLE devices ADD COLUMN mac_address VARCHAR(17) UNIQUE;
   ```
2. 既存デバイスの MAC アドレスを手動または管理ツールで補完する:
   ```sql
   UPDATE devices SET mac_address = '<実際のMAC>' WHERE id = '<device_id>';
   ```
3. 全レコードに MAC アドレスが入っていることを確認してから NOT NULL 制約を付与する:
   ```sql
   ALTER TABLE devices ALTER COLUMN mac_address SET NOT NULL;
   ```

### `user_id NOT NULL` の適用

マイグレーション内に記載の通り、NULL 許容で追加 → zone_id 経由で補完 → NOT NULL 制約付与 の手順で適用できる。  
既存デバイスに `zone_id = NULL` のレコードが存在する場合は手動で `user_id` を設定してから NOT NULL 制約を付与すること。

---

## v4 からの変更点

### 新規テーブル

| テーブル | 内容 |
|---|---|
| `enrollment_keys` | デバイス登録用の共有キーを管理する新規テーブル。`user_id`・`key_hash`（SHA-256）・`revoked_at`・`created_at` で構成 |

### `devices` スキーマ変更（認証方式の転換）

| カラム | 変更内容 |
|---|---|
| `api_key_hash` | **削除**。個体ごとの API キー方式を廃止 |
| `user_id` | **追加**（`NOT NULL`）。`auth.users(id)` を直接参照。フラット RLS を実現 |
| `mac_address` | **追加**（`VARCHAR(17) UNIQUE NOT NULL`）。デバイス識別・認証に使用 |
| `status` | **追加**（`device_status` ENUM: `pending` / `active` / `revoked`）。登録フローの状態を管理 |
| `zone_id` | **NULL 許容化**（`NOT NULL` → NULL 許容）。`ON DELETE RESTRICT` → `ON DELETE SET NULL` に変更。`pending` 状態でゾーン未割り当てを表現 |

### RLS フラット化

| 対象 | 変更内容 |
|---|---|
| `devices` | `zones.user_id = auth.uid()`（zones JOIN）→ `devices.user_id = auth.uid()`（フラット述語）に変更。`user_id` を直接持つため JOIN 不要 |
| `enrollment_keys` | 新規。`enrollment_keys.user_id = auth.uid()` でポリシーを適用 |

### 削除

| 対象 | 内容 |
|---|---|
| `api_key` 世代管理 | 個体ごとの API キー発行・再発行フローを廃止。`enrollment_keys` テーブルの共有キー方式に統一 |

### ESP32 送信フロー変更

| 変更前 | 変更後 |
|---|---|
| `Authorization: Bearer {api_key}` ヘッダーで認証 | enroll（初回）+ `X-Device-MAC` ヘッダーで認証 |
| デバイスごとに固有のファームを書き込む | 全デバイスに同一ファーム＋共有「登録キー」1本を1度焼く |

### 変更なし（後から変えると痛いため維持）

| 対象 | 理由 |
|---|---|
| `readings.value` にraw保存 | 補正済みで保存すると校正値を変更した際に過去データの整合性が崩れる |
| `sensor_type_masters` をFKテーブルにする | 文字列フリーにすると表記揺れが混入し、後で直せない |
| `sensors` の論理削除（`is_active`） | 物理削除すると過去の `readings` が孤立する |
| `idempotency_key` on `readings` | Wi-Fi断絶からの復帰時に重複が混入すると過去データが汚染される |
| `ON DELETE RESTRICT` 統一（`plant_thresholds`・`devices.zone_id` を除く） | 意図しないカスケード削除を防ぐ |
| `(device_id, sensor_type_id)` のPartial Unique Index | バックエンドのsensor特定ロジックの前提。後から入れると既存の重複を先に直す必要がある |
| `alert_type` ENUMに `sensor_fault` を残す | 後から追加するとENUMの変更が必要になる。値だけ確保しておくコストはゼロ |

### 後回しにしたもの（スキーマ追加で対応可能）

| 対象 | 追加方法 |
|---|---|
| `sensor_calibrations` テーブル | テーブルを新規追加するだけ。既存データへの影響なし |
| 成長ステージ別閾値 | `plant_thresholds` と `zone_plants` に `growth_stage` カラムを追加し、`growth_stage` ENUMを定義する |
| `sensor_fault` の検知ロジック | バックエンド（Edge Function）のコード追加のみ。スキーマ変更不要 |
