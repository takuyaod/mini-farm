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

-- public.users は auth.users INSERT 時に handle_new_user トリガーが自動作成する

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
