-- 認証済みユーザーが植物マスタと閾値を追加・編集できるようにする
CREATE POLICY "authenticated users can insert" ON plants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated users can update" ON plants
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated users can insert" ON plant_thresholds
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated users can update" ON plant_thresholds
    FOR UPDATE USING (auth.uid() IS NOT NULL);
