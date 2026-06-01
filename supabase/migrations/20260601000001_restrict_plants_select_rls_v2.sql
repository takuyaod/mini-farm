-- plants SELECT ポリシーを「自分が作成したもののみ」に絞る（シードデータ共有を廃止）

-- 既存の「owner or seed can read」ポリシーを削除
DROP POLICY IF EXISTS "owner or seed can read" ON plants;

-- 自分が作成した植物のみ参照可（created_by IS NULL 条件を除去）
CREATE POLICY "owner can read" ON plants
    FOR SELECT USING (
        created_by = auth.uid()
    );

-- plant_thresholds SELECT ポリシーも同様に更新
--
-- 注意: 以下のポリシーは plants テーブルの RLS に依存している。
-- EXISTS サブクエリが plants の created_by を参照するため、
-- plants テーブルの RLS ポリシーを変更する際は plant_thresholds の可視性にも影響することに留意すること。
DROP POLICY IF EXISTS "owner or seed can read" ON plant_thresholds;

-- 紐づく植物が自分のものであれば閾値も参照可（created_by IS NULL 条件を除去）
-- NOTE: このポリシーの EXISTS サブクエリは plants(id) を検索するが、
--       plant_thresholds(plant_id) のインデックス（idx_plant_thresholds_plant_id）は
--       20260601000000_restrict_plants_select_rls.sql で作成済みのため、ここでは作成しない。
CREATE POLICY "owner can read" ON plant_thresholds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM plants
            WHERE plants.id = plant_thresholds.plant_id
              AND plants.created_by = auth.uid()
        )
    );
