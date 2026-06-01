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
--
-- 注意: 以下のポリシーは plants テーブルの RLS に依存している。
-- EXISTS サブクエリが plants の created_by を参照するため、
-- plants テーブルの RLS ポリシーを変更する際は plant_thresholds の可視性にも影響することに留意すること。

DROP POLICY IF EXISTS "anyone can read" ON plant_thresholds;

-- 紐づく植物が自分のもの or シードデータであれば閾値も参照可
-- NOTE: このポリシーの EXISTS サブクエリは plants(id) を検索するため、
--       plant_thresholds(plant_id) にインデックスが必要（下記 CREATE INDEX 参照）
CREATE POLICY "owner or seed can read" ON plant_thresholds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM plants
            WHERE plants.id = plant_thresholds.plant_id
              AND (plants.created_by = auth.uid() OR plants.created_by IS NULL)
        )
    );

-- plant_thresholds(plant_id) インデックス
-- 上記 SELECT ポリシーの EXISTS サブクエリがこのカラムを検索条件に使うため、
-- データ量増加時のフルスキャンを防ぐ
CREATE INDEX IF NOT EXISTS idx_plant_thresholds_plant_id ON plant_thresholds (plant_id);
