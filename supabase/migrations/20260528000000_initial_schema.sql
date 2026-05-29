-- ============================================================
-- UUID v7 生成関数（PostgreSQL 17 対応）
-- PostgreSQL 18 移行時は組み込み uuidv7() に切り替えること
-- ============================================================
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

-- ============================================================
-- ENUM 定義
-- ============================================================
CREATE TYPE cultivation_type AS ENUM ('hydroponic', 'soil', 'both');
CREATE TYPE alert_type AS ENUM ('threshold_breach', 'sensor_fault');

-- ============================================================
-- テーブル定義（依存順）
-- ============================================================

-- users: ユーザープロファイル（auth.users.id と同一 UUID で管理）
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- zones: 栽培エリア
CREATE TABLE zones (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name       VARCHAR(100) NOT NULL,
    type       cultivation_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- devices: ゾーンに設置する ESP32
CREATE TABLE devices (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    zone_id       UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    name          VARCHAR(100),
    api_key_hash  VARCHAR(64) NOT NULL UNIQUE,
    firmware_ver  VARCHAR(20),
    last_seen_at  TIMESTAMPTZ
);

-- sensor_type_masters: センサー種別マスタ
CREATE TABLE sensor_type_masters (
    id               VARCHAR(30) PRIMARY KEY,
    label            VARCHAR(50) NOT NULL,
    unit             VARCHAR(20),
    cultivation_type cultivation_type NOT NULL
);

-- sensors: デバイスに取り付けたセンサー
CREATE TABLE sensors (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    device_id         UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    sensor_type_id    VARCHAR(30) NOT NULL REFERENCES sensor_type_masters(id) ON DELETE RESTRICT,
    label             VARCHAR(100),
    is_active         BOOLEAN NOT NULL DEFAULT true,
    decommissioned_at TIMESTAMPTZ
);

-- readings: センサー時系列計測値
CREATE TABLE readings (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    sensor_id        UUID NOT NULL REFERENCES sensors(id) ON DELETE RESTRICT,
    value            FLOAT NOT NULL,
    recorded_at      TIMESTAMPTZ NOT NULL,
    idempotency_key  VARCHAR(128) UNIQUE
);

-- plants: 植物マスタ
CREATE TABLE plants (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name             VARCHAR(100) NOT NULL,
    cultivation_type cultivation_type NOT NULL
);

-- plant_thresholds: 品種 × センサー種別の適正値・アラート閾値
CREATE TABLE plant_thresholds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    plant_id        UUID NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
    sensor_type_id  VARCHAR(30) NOT NULL REFERENCES sensor_type_masters(id) ON DELETE RESTRICT,
    optimal_min     FLOAT,
    optimal_max     FLOAT,
    alert_min       FLOAT,
    alert_max       FLOAT,

    UNIQUE (plant_id, sensor_type_id),

    CONSTRAINT chk_threshold_order CHECK (
        (alert_min   IS NULL OR optimal_min IS NULL OR alert_min   <= optimal_min) AND
        (optimal_min IS NULL OR optimal_max IS NULL OR optimal_min <= optimal_max) AND
        (optimal_max IS NULL OR alert_max   IS NULL OR optimal_max <= alert_max)
    )
);

-- zone_plants: ゾーン × 植物の栽培履歴
CREATE TABLE zone_plants (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    zone_id           UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    plant_id          UUID NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
    planted_at        TIMESTAMPTZ NOT NULL,
    harvested_at      TIMESTAMPTZ,
    harvest_weight_g  FLOAT,
    notes             TEXT,

    CONSTRAINT chk_harvest_after_plant CHECK (
        harvested_at IS NULL OR harvested_at > planted_at
    ),
    CONSTRAINT chk_weight_positive CHECK (
        harvest_weight_g IS NULL OR harvest_weight_g > 0
    )
);

-- alerts: アラート発報・解消記録
CREATE TABLE alerts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    sensor_id         UUID NOT NULL REFERENCES sensors(id) ON DELETE RESTRICT,
    alert_type        alert_type NOT NULL,
    triggered_value   FLOAT,
    breach_direction  VARCHAR(4),
    started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at       TIMESTAMPTZ
);

-- ============================================================
-- インデックス
-- ============================================================

CREATE INDEX idx_readings_sensor_time
    ON readings (sensor_id, recorded_at DESC);

CREATE UNIQUE INDEX uq_sensor_per_device
    ON sensors (device_id, sensor_type_id)
    WHERE is_active = true;

CREATE UNIQUE INDEX uq_zone_plants_active
    ON zone_plants (zone_id)
    WHERE harvested_at IS NULL;

-- ============================================================
-- RLS: グローバルマスタ（全ユーザー読み取り可・書き込み不可）
-- ============================================================

ALTER TABLE sensor_type_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read" ON sensor_type_masters
    FOR SELECT USING (true);

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read" ON plants
    FOR SELECT USING (true);

ALTER TABLE plant_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read" ON plant_thresholds
    FOR SELECT USING (true);

-- ============================================================
-- RLS: ユーザーデータ（zones.user_id = auth.uid() を起点に所有者検証）
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can read own record" ON users
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "users can update own record" ON users
    FOR UPDATE USING (id = auth.uid());

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON zones
    FOR ALL USING (user_id = auth.uid());

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON devices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zones
            WHERE zones.id = devices.zone_id
              AND zones.user_id = auth.uid()
        )
    );

ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON sensors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM devices
            JOIN zones ON zones.id = devices.zone_id
            WHERE devices.id = sensors.device_id
              AND zones.user_id = auth.uid()
        )
    );

ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON readings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sensors
            JOIN devices ON devices.id = sensors.device_id
            JOIN zones ON zones.id = devices.zone_id
            WHERE sensors.id = readings.sensor_id
              AND zones.user_id = auth.uid()
        )
    );

ALTER TABLE zone_plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON zone_plants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zones
            WHERE zones.id = zone_plants.zone_id
              AND zones.user_id = auth.uid()
        )
    );

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sensors
            JOIN devices ON devices.id = sensors.device_id
            JOIN zones ON zones.id = devices.zone_id
            WHERE sensors.id = alerts.sensor_id
              AND zones.user_id = auth.uid()
        )
    );

-- ============================================================
-- pg_cron: idempotency_key を 24 時間後に NULL へ更新（毎日 03:00 UTC）
-- ============================================================

SELECT cron.schedule(
    'cleanup-idempotency-keys',
    '0 3 * * *',
    $$
        UPDATE readings
        SET idempotency_key = NULL
        WHERE recorded_at < now() - interval '24 hours'
          AND idempotency_key IS NOT NULL;
    $$
);
