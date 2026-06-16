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

-- user_id を追加
-- 注意: NOT NULL をデフォルト値なしで追加しているため、既存行がある環境では migration が失敗します。
-- このプロジェクトはローカル開発環境での `supabase db reset` を前提としており、
-- 既存データがある本番環境への適用は想定していません。
-- 本番環境に適用する場合は: nullable で追加 → バックフィル → NOT NULL 化 の段階的手順が必要です。
ALTER TABLE devices
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT;

-- mac_address を追加（フォーマット: AA:BB:CC:DD:EE:FF、大文字16進）
-- 注意: user_id と同様に既存行がある環境では migration が失敗します（上記コメント参照）。
ALTER TABLE devices
    ADD COLUMN mac_address VARCHAR(17) NOT NULL UNIQUE
        CHECK (mac_address ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$');

-- status を追加
ALTER TABLE devices
    ADD COLUMN status device_status NOT NULL DEFAULT 'pending';

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
