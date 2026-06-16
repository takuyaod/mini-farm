-- ============================================================
-- devices スキーマ v2（案A: MACクレーム方式）
-- issue #114
-- ============================================================

-- ============================================================
-- 1. device_status ENUM 追加
-- ============================================================
CREATE TYPE device_status AS ENUM ('pending', 'active', 'revoked');

-- ============================================================
-- 2. devices テーブル変更
-- ============================================================

-- status を追加（DEFAULT 'pending' があるため既存行も自動的に埋まる）
-- mac_address のバックフィルで status を更新するため、先に追加しておく。
ALTER TABLE devices
    ADD COLUMN status device_status NOT NULL DEFAULT 'pending';

-- user_id を追加（段階的手順: nullable で追加 → バックフィル → NOT NULL 化）
-- 既存行がある本番環境でも migration が失敗しないよう、デフォルトなし NOT NULL の
-- 一括追加は避ける。ローカル開発（空テーブルへの db reset）では UPDATE は 0 行で no-op。
ALTER TABLE devices
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

-- 既存デバイスの所有者は zone 経由で確定できる（移行前 devices.zone_id は NOT NULL）。
UPDATE devices d
    SET user_id = z.user_id
    FROM zones z
    WHERE d.zone_id = z.id
      AND d.user_id IS NULL;

ALTER TABLE devices
    ALTER COLUMN user_id SET NOT NULL;

-- mac_address を追加（フォーマット: AA:BB:CC:DD:EE:FF、大文字16進）
-- user_id と同様に段階的手順で追加する。
ALTER TABLE devices
    ADD COLUMN mac_address VARCHAR(17);

-- 既存デバイスは実 MAC を持たないため、id 由来の一意な擬似 MAC を生成して埋め、
-- status を 'pending'（再クレーム待ち）に落とす（案A: MAC クレーム方式と整合）。
-- uuid v7 の末尾 48bit（ランダム部）を 6 オクテットに変換するため衝突は実用上発生しない。
-- ローカル開発（空テーブル）では UPDATE は 0 行で no-op。
UPDATE devices
    SET mac_address = upper(
            substr(replace(id::text, '-', ''), 21, 2) || ':' ||
            substr(replace(id::text, '-', ''), 23, 2) || ':' ||
            substr(replace(id::text, '-', ''), 25, 2) || ':' ||
            substr(replace(id::text, '-', ''), 27, 2) || ':' ||
            substr(replace(id::text, '-', ''), 29, 2) || ':' ||
            substr(replace(id::text, '-', ''), 31, 2)
        ),
        status = 'pending'
    WHERE mac_address IS NULL;

ALTER TABLE devices
    ALTER COLUMN mac_address SET NOT NULL;

ALTER TABLE devices
    ADD CONSTRAINT devices_mac_address_key UNIQUE (mac_address);

ALTER TABLE devices
    ADD CONSTRAINT devices_mac_address_check
        CHECK (mac_address ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$');

-- device_token_hash を追加（将来用）
ALTER TABLE devices
    ADD COLUMN device_token_hash VARCHAR NULL;

-- zone_id の NOT NULL 制約を削除
ALTER TABLE devices
    ALTER COLUMN zone_id DROP NOT NULL;

-- zone_id の既存 FK を削除して ON DELETE SET NULL で再追加
ALTER TABLE devices
    DROP CONSTRAINT devices_zone_id_fkey;

ALTER TABLE devices
    ADD CONSTRAINT devices_zone_id_fkey
        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;

-- api_key_hash カラムを削除（UNIQUE 制約・インデックスも連動削除）
ALTER TABLE devices
    DROP COLUMN api_key_hash;

-- ============================================================
-- 3. enrollment_keys テーブル新規作成
-- ============================================================
CREATE TABLE enrollment_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    -- CASCADE: ユーザー削除時に enrollment_keys も自動削除
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash    VARCHAR(64) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);

-- ============================================================
-- 4. RLS 変更
-- ============================================================

-- devices: 既存ポリシーを削除
DROP POLICY IF EXISTS "owner only" ON devices;

-- devices: フラット述語でポリシーを再定義
CREATE POLICY "devices select owner only" ON devices
    FOR SELECT USING (devices.user_id = auth.uid());

-- INSERT: user_id チェックに加え、zone_id を指定する場合はそのゾーンの所有者であることを確認
CREATE POLICY "devices insert owner only" ON devices
    FOR INSERT WITH CHECK (
        devices.user_id = auth.uid()
        AND (
            zone_id IS NULL
            OR EXISTS (
                SELECT 1 FROM zones
                WHERE zones.id = zone_id
                  AND zones.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "devices delete owner only" ON devices
    FOR DELETE USING (devices.user_id = auth.uid());

-- UPDATE: user_id チェックに加え、zone_id を変更する場合はそのゾーンの所有者であることを確認
CREATE POLICY "devices update owner only" ON devices
    FOR UPDATE
    USING (devices.user_id = auth.uid())
    WITH CHECK (
        devices.user_id = auth.uid()
        AND (
            zone_id IS NULL
            OR EXISTS (
                SELECT 1 FROM zones
                WHERE zones.id = zone_id
                  AND zones.user_id = auth.uid()
            )
        )
    );

-- enrollment_keys: RLS を有効化
ALTER TABLE enrollment_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner only" ON enrollment_keys
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. インデックス追加
-- ============================================================

-- user_id へのインデックス（RLS フラット化によりチェーン JOIN が不要になったため追加）
CREATE INDEX idx_devices_user_id ON devices (user_id);
-- mac_address は UNIQUE 制約で自動的にインデックスが作成されるため不要
