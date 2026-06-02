-- plant_thresholds の plant_id FK を ON DELETE RESTRICT → ON DELETE CASCADE に変更する
-- 植物を削除したら関連する閾値データも一緒に削除されるのが自然な挙動のため
ALTER TABLE plant_thresholds
    DROP CONSTRAINT plant_thresholds_plant_id_fkey,
    ADD CONSTRAINT plant_thresholds_plant_id_fkey
        FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE;
