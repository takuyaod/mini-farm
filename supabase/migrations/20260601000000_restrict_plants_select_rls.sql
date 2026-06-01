-- plants SELECT ポリシーを「自分が作成したもの or シードデータ（created_by IS NULL）」に絞る

-- 既存の全ユーザー読み取りポリシーを削除
DROP POLICY IF EXISTS "anyone can read" ON plants;

-- 自分が作成した植物 or シードデータ（created_by IS NULL）のみ参照可
CREATE POLICY "owner or seed can read" ON plants
    FOR SELECT USING (
        created_by = auth.uid() OR created_by IS NULL
    );

-- plant_thresholds SELECT ポリシーも同様に絞る
-- 植物が見えないのに閾値だけ見えるのは不整合なため

DROP POLICY IF EXISTS "anyone can read" ON plant_thresholds;

-- 紐づく植物が自分のもの or シードデータであれば閾値も参照可
CREATE POLICY "owner or seed can read" ON plant_thresholds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM plants
            WHERE plants.id = plant_thresholds.plant_id
              AND (plants.created_by = auth.uid() OR plants.created_by IS NULL)
        )
    );
