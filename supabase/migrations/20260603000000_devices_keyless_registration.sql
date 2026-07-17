-- ============================================================
-- devices: キーレス登録（案B / TOFU方式）への移行
-- 親issue #124（仕様書更新）/ 本issue #125（DATA_MODEL.md 最新版に準拠）
--
-- ローカル開発は `supabase db reset` 前提のため、このマイグレーション適用時点では
-- devices テーブルは常に空（seed.sql は全マイグレーション適用後に実行される）。
-- そのため NOT NULL カラムをデフォルト値なしで直接追加し、api_key_hash も即座に DROP してよい。
--
-- 本番環境（既にデータが存在し、旧 API キー方式のデバイスが稼働中の環境）へ適用する場合は、
-- このファイルをそのまま流用せず、以下のように api_key_hash と新方式を並行稼働させながら
-- 段階的に切り替えること（DROP は最後の最後に行う。api_key_hash を先に消すと旧ファームウェアが
-- 即座に認証不能になり、段階移行・ロールバックの余地がなくなるため）：
--   1. mac_address 等の新カラムを NULL 許容で追加する（api_key_hash はまだ残す）
--   2. 既存デバイスの MAC アドレスをバックフィルし、mac_address を NOT NULL に変更する
--   3. status/user_id/created_at・CHECK制約・状態遷移トリガー・新RLSを適用する
--      （この時点では新方式・旧方式のいずれでも認証可能な状態にしておく）
--   4. アプリケーション / Edge Function 側を新方式（MACベース認証）に完全に切り替え、
--      旧ファームウェア・旧クライアントが存在しないことを確認する
--   5. 切り替え確認後、最後の別マイグレーションとして api_key_hash 列を DROP する
-- ============================================================

-- devices.status の ENUM
CREATE TYPE device_status AS ENUM (
    'pending',   -- 未承認（enroll 済み・ユーザー / ゾーン未割り当て）
    'active',    -- 承認済み（ユーザー・ゾーンに割り当て済み・データ送信可）
    'revoked'    -- 無効化（ユーザーが手動で無効化）
);

-- キーレス登録に必要なカラムを追加
ALTER TABLE devices
    ADD COLUMN mac_address VARCHAR(17) NOT NULL UNIQUE
        CHECK (mac_address ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'),      -- 例: "AA:BB:CC:DD:EE:FF"（コロン区切り大文字）
    ADD COLUMN status device_status NOT NULL DEFAULT 'pending',
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = 未承認（pending）
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();          -- 初回 enroll 日時

-- 個体ごとの API キー方式を廃止（新カラムの追加後に DROP することで、上記の本番向け段階移行手順との
-- 順序を一致させている。ローカル開発では devices が空のため実害はないが、本番でこのファイルを
-- そのまま参考にする場合に誤った順序を連想させないための配慮）
ALTER TABLE devices
    DROP COLUMN api_key_hash;

-- zone_id を NULL 許容化し、FK を ON DELETE RESTRICT → ON DELETE SET NULL に変更
-- （ゾーン削除時に devices を pending へ戻せるようにするため。trg_enforce_device_state_machine が status を追従させる。
--  この FK カスケードだけが active → pending の「システムによる自動遷移」の唯一の経路であり、
--  トリガー側は pg_trigger_depth() でこの経路以外からの zone_id クリアを拒否する。詳細は後述のトリガー定義を参照）
ALTER TABLE devices
    ALTER COLUMN zone_id DROP NOT NULL;

ALTER TABLE devices
    DROP CONSTRAINT devices_zone_id_fkey,
    ADD CONSTRAINT devices_zone_id_fkey
        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;

-- status × zone_id × user_id の不変条件をDBレベルで固定する（`active` なのに未割り当て、等の矛盾を作成不可にする）。
-- pending は「公開 pending」（user_id IS NULL・enroll直後）と「所有者持ち pending」
-- （user_id IS NOT NULL・ゾーン削除で active から巻き戻った状態）の2種類があるため、
-- pending 側では user_id の NULL 制約は課さない。
-- 一方 active は「承認済み・ユーザー / ゾーンに割り当て済み」を意味するため、zone_id に加えて
-- user_id も NOT NULL であることをここで固定する（pending → active 遷移時に user_id が NULL の
-- ままになる不正状態をDBレベルで作成不可にする）。
ALTER TABLE devices
    ADD CONSTRAINT chk_device_status_invariants CHECK (
        (status = 'pending' AND zone_id IS NULL) OR
        (status = 'active'  AND zone_id IS NOT NULL AND user_id IS NOT NULL) OR
        (status = 'revoked')
    );

-- devices の状態機械を1つのトリガーで一元管理する（ゾーン解除の自動遷移 + ユーザー削除時の安全な遷移 + 不正な手動遷移の拒否）。
-- 許可される状態遷移は以下の4つのみ：
--   1. pending → active   （承認。user_id・zone_id を同時に確定させる。CHECK制約 chk_device_status_invariants
--                            により user_id IS NOT NULL も同時に保証される）
--   2. active  → revoked  （無効化。所有者による手動操作のみ）
--   3. active  → pending  （システムによる自動遷移のみ。ゾーン削除で zone_id が NULL に戻ったとき。
--                            所有者が UPDATE で直接 zone_id を NULL にする経路は下記 (a) で明示的に拒否する）
--   4. active / revoked / pending（所有者持ち） → revoked
--      （システムによる自動遷移のみ。所有ユーザー削除で user_id が NULL に戻ったとき。
--       pending〈所有者持ち〉を対象から外すと、ユーザー削除後に「公開 pending」化してしまうため対象に含める）
-- それ以外（revoked → active の再有効化、pending → revoked の手動操作、所有者による active デバイスの
-- zone_id 直接クリア等）はすべて拒否する。
CREATE OR REPLACE FUNCTION enforce_device_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    -- (a) ゾーン削除により zone_id が NULL に戻った active デバイスは pending に戻す。
    --     user_id は保持する（元の所有者が再度ゾーンを割り当てるだけで復旧できるようにするため）。
    --     結果として「pending だが user_id が残っている」状態になるが、これは chk_device_status_invariants で許容している意図的な状態。
    --     この状態を公開 pending（誰でも承認可）と区別するため、RLS 側は user_id ではなく status = 'pending' AND user_id IS NULL を
    --     公開条件にすること（後述の RLS ポリシー設計を参照）。
    --
    --     この遷移は「システムによる自動遷移のみ」（ゾーン削除時の FK ON DELETE SET NULL カスケード経由）に
    --     限定する。RLS の WITH CHECK は所有者による zone_id IS NULL への更新自体は妨げないため（後述の
    --     「approve or manage own devices」ポリシー参照）、区別を RLS だけに委ねると、所有者が通常の
    --     UPDATE で zone_id を直接 NULL にするだけでも同じ遷移を発生させられてしまう。
    --     これを防ぐため pg_trigger_depth() を利用する：FK の ON DELETE SET NULL カスケードは、
    --     zones の DELETE によって発生する内部トリガー実行の「入れ子」の中で devices の UPDATE を
    --     実行するため、このトリガーが呼ばれた時点で pg_trigger_depth() は 2 以上になる。一方、
    --     クライアントが `UPDATE devices SET zone_id = NULL ...` を直接発行した場合は、このトリガー自体が
    --     最初のトリガー呼び出しとなるため pg_trigger_depth() は 1 のままである。この差を利用して、
    --     トリガーの外（＝クライアントの直接操作）からの zone_id クリアだけを拒否する。
    IF NEW.zone_id IS NULL AND OLD.zone_id IS NOT NULL AND OLD.status = 'active' THEN
        IF pg_trigger_depth() <= 1 THEN
            RAISE EXCEPTION 'devices.zone_id を直接 NULL にすることはできません。ゾーンが削除された場合にのみシステムが自動的に解除します'
                USING ERRCODE = '42501';
        END IF;
        NEW.status := 'pending';
        RETURN NEW;
    END IF;

    -- (b) auth.users 側の削除（ON DELETE SET NULL）で user_id が NULL に落ちてきた場合は、
    --     元の status を問わず（active / revoked に加え、ゾーン削除で巻き戻った「所有者持ち pending」も含む）、
    --     所有者を失ったデバイスを安全側（無効化）に倒し、再取得・再承認の対象にしない。
    --     「所有者持ち pending」（status='pending' AND user_id IS NOT NULL）をここで除外すると、
    --     ユーザー削除後に status='pending' AND user_id IS NULL となり、RLS 上「公開 pending」として
    --     全認証ユーザーに公開・再取得されてしまうため、status によらず一律に revoked へ倒す。
    --     revoked は user_id の NULL/NOT NULL を問わないため chk_device_status_invariants には抵触しない。
    IF NEW.user_id IS NULL AND OLD.user_id IS NOT NULL THEN
        NEW.status := 'revoked';
        RETURN NEW;
    END IF;

    IF OLD.status = NEW.status THEN
        RETURN NEW;  -- 状態を変えない更新（名前編集・ゾーン再割当等）はここでは検査しない
    END IF;

    IF (OLD.status = 'pending' AND NEW.status = 'active')
       OR (OLD.status = 'active' AND NEW.status = 'revoked') THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'invalid device status transition: % -> %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_device_state_machine
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION enforce_device_state_machine();

-- ============================================================
-- RLS: devices の既存ポリシー（zones への所有権チェーン、FOR ALL）を置き換える
-- `FOR ALL` は使わず、コマンド別（SELECT / UPDATE）にポリシーを分割する
-- （#114 で確立した方式。FOR ALL + WITH CHECK は OR 結合でバイパスされるリスクがあるため）
--
-- INSERT / DELETE は定義しない（デフォルト拒否）。
-- devices の新規作成は enroll エンドポイントが Service Role Key で行うため、
-- 認証済みクライアントからの直接 INSERT / DELETE は不要かつ許可しない。
-- ※ issue #125 本文では DELETE ポリシー（pending の掃除許可）を提案していたが、
--   docs/specs/DATA_MODEL.md 最新版（#124 レビュー後）で「INSERT / DELETE は定義しない」
--   と明記されているため、仕様書を正として DELETE ポリシーも定義しない。
-- ============================================================

DROP POLICY "owner only" ON devices;

-- SELECT: 「公開 pending」（status = 'pending' AND user_id IS NULL）は認証済み全員が閲覧可能。
-- それ以外（所有者持ち pending・active・revoked）は所有者のみ閲覧可能。
CREATE POLICY "select pending or own devices" ON devices
    FOR SELECT USING (
        (status = 'pending' AND user_id IS NULL) OR user_id = auth.uid()
    );

-- UPDATE: 承認（pending → active）・名前編集・revoke・ゾーン再割当を1本のポリシーでカバーする。
-- USING で「公開 pending または自分の所有物」のみ更新対象にできることを保証し、
-- WITH CHECK で「更新後は自分の所有物になっていること」「割当先ゾーンが自分のものであること」を保証する。
-- 遷移そのものの妥当性（revoked → active の再有効化拒否等）は trg_enforce_device_state_machine が保証するため、
-- ここでは「誰が」「どのゾーンに対して」更新できるかのみを扱う。
-- 下記 WITH CHECK は zone_id IS NULL への更新自体は許可している（所有者持ち pending 状態を維持したまま
-- 名前編集する場合などに必要）が、active なデバイスの zone_id を NULL にする更新は
-- trg_enforce_device_state_machine 側（pg_trigger_depth() によるシステム経路限定）で拒否されるため、
-- ここで重ねて制限する必要はない。
CREATE POLICY "approve or manage own devices" ON devices
    FOR UPDATE USING (
        (status = 'pending' AND user_id IS NULL) OR user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
        AND (
            zone_id IS NULL OR EXISTS (
                SELECT 1 FROM zones
                WHERE zones.id = devices.zone_id
                  AND zones.user_id = auth.uid()
            )
        )
    );
