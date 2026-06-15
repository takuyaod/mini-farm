-- ============================================================
-- enrollment_keys インデックス追加・設計コメント補足
-- issue #114 レビュー指摘対応
-- ============================================================

-- RLS ポリシー（user_id = auth.uid()）の評価コストを下げるため
-- idx_devices_user_id と同様にインデックスを追加する
CREATE INDEX idx_enrollment_keys_user_id ON enrollment_keys (user_id);

-- ============================================================
-- 設計補足コメント（ポリシー変更なし）
-- ============================================================
--
-- [enrollment_keys INSERT ポリシーについて]
-- 現在の "owner only" FOR ALL ポリシーは、認証済みユーザーが
-- 自身の enrollment_key をクライアントから直接 INSERT できる設計である。
-- これは「ユーザー自身がデバイス登録キーを発行・管理する」フローを想定した意図的な仕様。
-- 将来的に管理者発行のみに制限する場合は、INSERT ポリシーを削除し
-- SECURITY DEFINER 関数または service_role 経由の発行に切り替えること。
--
-- [devices.user_id ON DELETE RESTRICT について]
-- enrollment_keys.user_id は ON DELETE CASCADE（ユーザー削除時に自動削除）だが、
-- devices.user_id は ON DELETE RESTRICT としている。
-- これは「デバイスが紐付いているユーザーを誤って削除しないよう保護する」意図的な仕様。
-- ユーザー削除を行う場合は、先に devices を別ユーザーへ移管するか削除してから
-- ユーザーアカウントを削除する運用フローが必要。
