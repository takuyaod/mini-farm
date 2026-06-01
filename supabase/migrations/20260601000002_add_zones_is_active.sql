-- zones テーブルに is_active カラムを追加する
-- sensors.is_active と同じパターン。非アクティブ化（休止）により物理削除なしでゾーンをダッシュボードから隠せる
ALTER TABLE zones ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
