-- ============================================================
-- sensor_type_masters: センサー種別マスタ（9種）
-- ============================================================
INSERT INTO sensor_type_masters (id, label, unit, cultivation_type) VALUES
    ('water_temp',    '水温',     '℃',     'hydroponic'),
    ('ec',            'EC値',     'mS/cm', 'hydroponic'),
    ('ph',            'pH',       NULL,    'hydroponic'),
    ('water_level',   '水位',     'cm',    'hydroponic'),
    ('soil_moisture', '土壌水分', '%',     'soil'),
    ('soil_temp',     '地温',     '℃',     'soil'),
    ('air_temp',      '気温',     '℃',     'both'),
    ('humidity',      '湿度',     '%',     'both'),
    ('light',         '照度',     'lux',   'both');

-- ============================================================
-- plants: 植物マスタ（開発用）
-- ============================================================
INSERT INTO plants (id, name, cultivation_type) VALUES
    ('a1b2c3d4-0000-7000-8000-000000000001', 'バジル', 'hydroponic'),
    ('a1b2c3d4-0000-7000-8000-000000000002', 'トマト', 'soil'),
    ('a1b2c3d4-0000-7000-8000-000000000003', 'レタス', 'hydroponic');

-- ============================================================
-- plant_thresholds: 適正値・アラート閾値（開発用）
-- ============================================================
INSERT INTO plant_thresholds (id, plant_id, sensor_type_id, optimal_min, optimal_max, alert_min, alert_max) VALUES
    -- バジル × EC値
    ('b1b2c3d4-0000-7000-8000-000000000001',
     'a1b2c3d4-0000-7000-8000-000000000001', 'ec',
     1.5, 2.0, 1.0, 2.5),
    -- バジル × pH
    ('b1b2c3d4-0000-7000-8000-000000000002',
     'a1b2c3d4-0000-7000-8000-000000000001', 'ph',
     6.0, 6.5, 5.5, 7.0),
    -- バジル × 水温
    ('b1b2c3d4-0000-7000-8000-000000000003',
     'a1b2c3d4-0000-7000-8000-000000000001', 'water_temp',
     20.0, 25.0, 15.0, 30.0),
    -- レタス × EC値
    ('b1b2c3d4-0000-7000-8000-000000000004',
     'a1b2c3d4-0000-7000-8000-000000000003', 'ec',
     1.0, 1.5, 0.5, 2.0),
    -- レタス × pH
    ('b1b2c3d4-0000-7000-8000-000000000005',
     'a1b2c3d4-0000-7000-8000-000000000003', 'ph',
     6.0, 7.0, 5.5, 7.5);

-- ============================================================
-- 開発用ユーザー・ゾーン・デバイス
-- api_key: dev-api-key-001（SHA-256ハッシュ登録済み）
-- ============================================================

-- auth.users に開発用ユーザーを登録（ローカル開発環境専用）
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    'c1b2c3d4-0000-7000-8000-000000000001',
    'authenticated',
    'authenticated',
    'dev@example.com',
    crypt('devpassword123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
);

-- public.users（auth.users.id と同一 UUID）
INSERT INTO users (id, email, created_at) VALUES (
    'c1b2c3d4-0000-7000-8000-000000000001',
    'dev@example.com',
    now()
);

-- 開発用ゾーン
INSERT INTO zones (id, user_id, name, type, created_at) VALUES (
    'd1b2c3d4-0000-7000-8000-000000000001',
    'c1b2c3d4-0000-7000-8000-000000000001',
    '水耕ゾーン1',
    'hydroponic',
    now()
);

-- 開発用デバイス（api_key_hash は SHA-256("dev-api-key-001")）
INSERT INTO devices (id, zone_id, name, api_key_hash) VALUES (
    'e1b2c3d4-0000-7000-8000-000000000001',
    'd1b2c3d4-0000-7000-8000-000000000001',
    '開発用デバイス1',
    '0c8d48c0f50b513727be8cff1dcd66dbfe49419755a0dba68ccc503dc4ec439d'
);
