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
-- 開発用ユーザー・ゾーン・デバイス
-- mac_address: AA:BB:CC:DD:EE:01（擬似MAC、ローカル開発専用）
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

-- public.users は auth.users INSERT 時に handle_new_user トリガーが自動作成する

-- 開発用ゾーン
INSERT INTO zones (id, user_id, name, type, created_at) VALUES (
    'd1b2c3d4-0000-7000-8000-000000000001',
    'c1b2c3d4-0000-7000-8000-000000000001',
    '水耕ゾーン1',
    'hydroponic',
    now()
);

-- 開発用デバイス（案A: MACクレーム方式、擬似MAC使用）
INSERT INTO devices (id, user_id, zone_id, name, mac_address, status, device_token_hash) VALUES (
    'e1b2c3d4-0000-7000-8000-000000000001',
    'c1b2c3d4-0000-7000-8000-000000000001',
    'd1b2c3d4-0000-7000-8000-000000000001',
    '開発用デバイス1',
    'AA:BB:CC:DD:EE:01',
    'active',
    NULL
);

-- 開発用 enrollment_key（ローカル開発環境専用）
-- key_hash は SHA-256("dev-enrollment-key-001") の値
INSERT INTO enrollment_keys (id, user_id, key_hash, created_at, revoked_at) VALUES (
    'f1b2c3d4-0000-7000-8000-000000000001',
    'c1b2c3d4-0000-7000-8000-000000000001',
    'e9e358b0fd99507ba49283bf26d519fa092e2a41777a466eed29b241d0361517',
    now(),
    NULL
);
