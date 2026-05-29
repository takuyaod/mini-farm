-- plants テーブルに作成者カラムを追加（seed データは NULL のまま保持）
ALTER TABLE plants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 認証済みユーザーが自分の植物を追加・編集できるようにする
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plants' AND policyname = 'authenticated users can insert'
  ) THEN
    CREATE POLICY "authenticated users can insert" ON plants
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plants' AND policyname = 'owner can update'
  ) THEN
    CREATE POLICY "owner can update" ON plants
        FOR UPDATE USING (created_by = auth.uid());
  END IF;
END $$;

-- plant_thresholds は植物の作成者のみが編集できる
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_thresholds' AND policyname = 'plant owner can insert thresholds'
  ) THEN
    CREATE POLICY "plant owner can insert thresholds" ON plant_thresholds
        FOR INSERT WITH CHECK (
            auth.uid() IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM plants
                WHERE plants.id = plant_thresholds.plant_id
                  AND plants.created_by = auth.uid()
            )
        );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_thresholds' AND policyname = 'plant owner can update thresholds'
  ) THEN
    CREATE POLICY "plant owner can update thresholds" ON plant_thresholds
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM plants
                WHERE plants.id = plant_thresholds.plant_id
                  AND plants.created_by = auth.uid()
            )
        );
  END IF;
END $$;
