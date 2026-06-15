-- ============================================================
-- devices スキーマ v2（案A: MAC クレーム方式）
-- #114: devices スキーマ変更・enrollment_keys 追加・RLS フラット化
-- ============================================================

-- ============================================================
-- 1. device_status ENUM 型を作成
-- ============================================================
CREATE TYPE device_status AS ENUM (
    'pending',   -- 未承認（enroll 済み・ゾーン未割り当て）
    'active',    -- 承認済み（ゾーンに割り当て済み・データ送信可）
    'revoked'    -- 無効化（管理者が手動で無効化）
);

-- ============================================================
-- 2. devices テーブルの変更
-- ============================================================

-- 2-1. api_key_hash の UNIQUE 制約を削除し、カラムを削除
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_api_key_hash_key;
ALTER TABLE devices DROP COLUMN IF EXISTS api_key_hash;

-- 2-2. user_id カラムを追加（NULL 許容で追加後、NOT NULL 制約を設定）
ALTER TABLE devices
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

-- 既存レコードが存在する場合は zone_id 経由で user_id を補完する
-- （supabase db reset では seed.sql の前にマイグレーションが走るため実際には空テーブル）
-- zone_id IS NOT NULL を明示し、ゾーン未割り当てデバイスが誤って更新されないよう保護する
UPDATE devices d
   SET user_id = z.user_id
  FROM zones z
 WHERE z.id = d.zone_id
   AND d.user_id IS NULL
   AND d.zone_id IS NOT NULL;

ALTER TABLE devices ALTER COLUMN user_id SET NOT NULL;

-- 2-3. mac_address カラムを追加
--   supabase db reset では初期スキーマ直後に走るため devices は空テーブル。
--   空テーブルへの NOT NULL UNIQUE 追加は DEFAULT 不要。
ALTER TABLE devices
    ADD COLUMN mac_address VARCHAR(17) NOT NULL UNIQUE;

-- 2-4. status カラムを追加
ALTER TABLE devices
    ADD COLUMN status device_status NOT NULL DEFAULT 'pending';

-- 2-5. device_token_hash カラムを追加（将来用・当面未使用）
--   NULL がデフォルトのため NULL キーワードは省略する
ALTER TABLE devices
    ADD COLUMN device_token_hash VARCHAR;  -- NULL = 未設定（将来用）

-- 2-6. zone_id を NULL 許容に変更
ALTER TABLE devices ALTER COLUMN zone_id DROP NOT NULL;

-- 2-7. zone_id の FK 制約を ON DELETE RESTRICT から ON DELETE SET NULL へ差し替え
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_zone_id_fkey;
ALTER TABLE devices
    ADD CONSTRAINT devices_zone_id_fkey
        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;

-- 2-8. status と zone_id の整合性を DB レベルで保証する CHECK 制約
--   active 状態のデバイスは必ずゾーンに割り当てられていること。
--   アプリ層（Edge Function）でもガードするが、DB 層でも保証することで二重防衛とする。
--
--   NOTE: zone_id は ON DELETE SET NULL のため、ゾーン削除時には zone_id が NULL になる。
--   この CHECK 制約と矛盾しないよう、ゾーン削除の BEFORE DELETE トリガーで
--   status='active' のデバイスを事前に 'pending' へ戻す（後述 セクション 2-9 参照）。
ALTER TABLE devices
    ADD CONSTRAINT chk_active_requires_zone
    CHECK (status != 'active' OR zone_id IS NOT NULL);

-- 2-9. ゾーン削除時に active デバイスを pending へ戻すトリガー
--   ON DELETE SET NULL（2-7）が実行される前に status を 'pending' に戻すことで、
--   chk_active_requires_zone（2-8）との矛盾を防ぐ。
--   これによりゾーン削除は常に成功し、デバイスは再割り当て待ち状態になる。
CREATE OR REPLACE FUNCTION reset_device_status_on_zone_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE devices
       SET status = 'pending', zone_id = NULL
     WHERE zone_id = OLD.id
       AND status = 'active';
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_zone_delete_reset_devices
    BEFORE DELETE ON zones
    FOR EACH ROW EXECUTE FUNCTION reset_device_status_on_zone_delete();

-- ============================================================
-- 3. インデックス追加
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_devices_user_id       ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_mac_address   ON devices (mac_address);

-- ============================================================
-- 4. devices の RLS ポリシーを差し替え（フラット述語へ）
-- ============================================================

-- 既存の「ゾーン経由 JOIN」ポリシーを削除
DROP POLICY IF EXISTS "owner only" ON devices;

-- 新規ポリシー 1: SELECT / INSERT / DELETE は user_id で直接判定
-- WITH CHECK を明示することで INSERT/UPDATE 時の検証意図を "owner can assign zone" と揃える
CREATE POLICY "owner only" ON devices
    FOR ALL
    USING (devices.user_id = auth.uid())
    WITH CHECK (devices.user_id = auth.uid());

-- 新規ポリシー 2: UPDATE 時はゾーンの所有権も検証
CREATE POLICY "owner can assign zone" ON devices
    FOR UPDATE
    USING (devices.user_id = auth.uid())
    WITH CHECK (
        zone_id IS NULL OR EXISTS (
            SELECT 1 FROM zones
            WHERE zones.id = devices.zone_id
              AND zones.user_id = auth.uid()
        )
    );

-- ============================================================
-- 5. enrollment_keys テーブルを新規作成
-- ============================================================
CREATE TABLE enrollment_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- ユーザー削除時に連鎖削除（失効した登録キーも同時に破棄）
    key_hash    VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256ハッシュ（hex）
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ                  -- NULL = 有効。失効操作で now() をセット
);

-- ============================================================
-- 6. enrollment_keys のインデックスを追加
-- ============================================================

-- key_hash は UNIQUE 制約により暗黙インデックスが作成される。
-- user_id は RLS 評価・一覧取得でシーケンシャルスキャンが発生しないよう明示追加。
CREATE INDEX IF NOT EXISTS idx_enrollment_keys_user_id ON enrollment_keys (user_id);

-- ============================================================
-- 7. enrollment_keys の RLS を設定
-- ============================================================
ALTER TABLE enrollment_keys ENABLE ROW LEVEL SECURITY;

-- enrollment_keys の RLS ポリシー設計方針:
--
-- RLS は列レベル制御ができないため、FOR ALL（UPDATE を含む）ポリシーでは
-- ユーザーが自身の key_hash を任意の値に書き換えられるセキュリティリスクがある。
-- これを防ぐため、UPDATE を RLS ポリシーから除外する。
--
-- UPDATE（revoked_at の更新による失効操作）は Edge Function（Service Role Key）
-- 経由のみで行う設計とし、UI からの直接 UPDATE は許可しない。
-- Edge Function は RLS をバイパスするため、このポリシーの対象外になる。
--
-- 登録キーの発行は UI からユーザー自身が行う設計のため INSERT は許可する。
-- Edge Function（enroll エンドポイント）は Service Role Key で RLS をバイパスする。

-- SELECT / INSERT / DELETE のみ許可（UPDATE は除外）
CREATE POLICY "owner only" ON enrollment_keys
    FOR SELECT
    USING (enrollment_keys.user_id = auth.uid());

CREATE POLICY "owner insert" ON enrollment_keys
    FOR INSERT
    WITH CHECK (enrollment_keys.user_id = auth.uid());

CREATE POLICY "owner delete" ON enrollment_keys
    FOR DELETE
    USING (enrollment_keys.user_id = auth.uid());

-- UPDATE ポリシーは意図的に定義しない。
-- 失効操作（revoked_at の更新）は Edge Function（Service Role Key）経由のみとする。
-- これにより key_hash の書き換えを RLS レベルで完全に防止する。
