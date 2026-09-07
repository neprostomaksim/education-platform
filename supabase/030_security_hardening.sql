-- Apply AFTER 029. Atomic and re-runnable; does not change existing user roles.
BEGIN;

-- Profile RLS: remove legacy broad SELECT policies, preserve admin UPDATE.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP EXECUTE format('DROP POLICY %I ON public.profiles', p.policyname); END LOOP;
END $$;
CREATE POLICY "Read own profile or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Same database role is used by students and admins. Grants narrow the columns;
-- the trigger separately protects role/approval from non-admin users.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles'
  LOOP EXECUTE format('REVOKE UPDATE (%I) ON public.profiles FROM anon, authenticated', c.column_name); END LOOP;
END $$;
GRANT UPDATE (full_name, avatar_url, role, is_approved) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.check_profile_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated') THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.telegram_id IS DISTINCT FROM OLD.telegram_id
       OR NEW.email IS DISTINCT FROM OLD.email OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Profile identity fields are server-managed' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_admin() AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_approved IS DISTINCT FROM OLD.is_approved) THEN
      RAISE EXCEPTION 'Only administrators may change access' USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
ALTER TABLE public.profiles ENABLE TRIGGER ensure_profile_security;

-- Existing grants on courses must still respect approval and publication.
DROP POLICY IF EXISTS "Students can view accessible courses" ON public.courses;
CREATE POLICY "Students can view accessible courses" ON public.courses FOR SELECT TO authenticated
USING (is_published AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_approved)
  AND EXISTS (SELECT 1 FROM public.user_courses uc WHERE uc.user_id=auth.uid() AND uc.course_id=courses.id));
DROP POLICY IF EXISTS "Students can view accessible topics" ON public.topics;
CREATE POLICY "Students can view accessible topics" ON public.topics FOR SELECT TO authenticated
USING (is_published AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id=topics.course_id));

-- Telegram links represent a verified purchase, not an editable profile field.
-- No changes to current links/roles are made here: review existing values separately.
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS amount_minor INTEGER;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS delivery_sent_at TIMESTAMPTZ;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS delivery_lease UUID;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS delivery_lease_until TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_provider_transaction_unique
  ON public.purchases(provider, provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_prodamus_purchase(
  p_merchant_id TEXT, p_transaction_id TEXT, p_telegram_id BIGINT, p_amount_minor INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.purchases%ROWTYPE;
BEGIN
  IF p_merchant_id !~ '^prompts_[1-9][0-9]{0,14}_[A-Za-z0-9-]{1,100}$'
     OR p_transaction_id !~ '^[A-Za-z0-9-]{1,100}$' OR p_telegram_id <= 0 OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Invalid purchase';
  END IF;
  INSERT INTO public.purchases(provider, provider_order_id, provider_transaction_id, telegram_id, product, amount, amount_minor, currency, status)
  VALUES ('prodamus', p_merchant_id, p_transaction_id, p_telegram_id, 'prompts', p_amount_minor/100, p_amount_minor, 'RUB', 'paid')
  ON CONFLICT (provider_order_id) DO NOTHING;
  SELECT * INTO STRICT v FROM public.purchases WHERE provider_order_id=p_merchant_id FOR UPDATE;
  IF v.provider <> 'prodamus' OR v.telegram_id <> p_telegram_id OR v.product <> 'prompts'
     OR v.currency <> 'RUB' OR (v.amount_minor IS NOT NULL AND v.amount_minor <> p_amount_minor)
     OR (v.provider_transaction_id IS NOT NULL AND v.provider_transaction_id <> p_transaction_id) THEN
    RAISE EXCEPTION 'Purchase identity mismatch';
  END IF;
  -- Preserve legacy claim tokens and terminal refund state on repeated notifications.
  UPDATE public.purchases SET provider_transaction_id=p_transaction_id, amount_minor=p_amount_minor WHERE id=v.id;
  RETURN jsonb_build_object('id', v.id, 'status', v.status);
END $$;

CREATE OR REPLACE FUNCTION public.lease_purchase_delivery(p_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.purchases%ROWTYPE; lease_id UUID := gen_random_uuid();
BEGIN
  SELECT * INTO v FROM public.purchases WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'missing'); END IF;
  IF v.status <> 'paid' OR v.claimed_by IS NOT NULL OR (v.delivery_sent_at IS NOT NULL AND v.claim_expires_at > now()) THEN
    RETURN jsonb_build_object('status', 'done');
  END IF;
  IF v.delivery_lease_until > now() THEN RETURN jsonb_build_object('status', 'busy'); END IF;
  IF v.claim_expires_at <= now() THEN
    UPDATE public.purchases SET claim_token=gen_random_uuid(), claim_expires_at=now()+interval '30 days', delivery_sent_at=NULL WHERE id=p_id RETURNING * INTO v;
  END IF;
  UPDATE public.purchases SET delivery_lease=lease_id, delivery_lease_until=now()+interval '1 minute' WHERE id=p_id;
  RETURN jsonb_build_object('status','leased','lease',lease_id,'telegram_id',v.telegram_id,'claim_token',v.claim_token);
END $$;
CREATE OR REPLACE FUNCTION public.finish_purchase_delivery(p_id UUID, p_lease UUID, p_sent BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.purchases SET delivery_sent_at=CASE WHEN p_sent THEN now() ELSE delivery_sent_at END,
    delivery_lease=NULL, delivery_lease_until=NULL WHERE id=p_id AND delivery_lease=p_lease;
END $$;

-- Monotone refunds: an old success event cannot make a refunded purchase paid.
CREATE OR REPLACE FUNCTION public.guard_purchase_refund() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.status='refunded' AND NEW.status <> 'refunded' THEN RAISE EXCEPTION 'Refund is terminal'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_purchase_refund ON public.purchases;
CREATE TRIGGER guard_purchase_refund BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.guard_purchase_refund();

CREATE OR REPLACE FUNCTION public.sync_refunded_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE replacement UUID;
BEGIN
  IF NEW.status='refunded' AND NEW.claimed_by IS NOT NULL THEN
    -- Serialize entitlement updates for this user/product.
    PERFORM 1 FROM public.entitlements WHERE user_id=NEW.claimed_by AND product=NEW.product FOR UPDATE;
    SELECT id INTO replacement FROM public.purchases WHERE claimed_by=NEW.claimed_by AND product=NEW.product AND status='paid' ORDER BY created_at DESC LIMIT 1;
    IF replacement IS NULL THEN
      DELETE FROM public.entitlements WHERE user_id=NEW.claimed_by AND product=NEW.product AND source LIKE 'purchase:%';
    ELSE
      UPDATE public.entitlements SET source='purchase:'||replacement WHERE user_id=NEW.claimed_by AND product=NEW.product AND source LIKE 'purchase:%';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_refunded_access ON public.purchases;
CREATE TRIGGER sync_refunded_access AFTER UPDATE OF status ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.sync_refunded_access();

CREATE OR REPLACE FUNCTION public.claim_prompts_purchase(p_token UUID, p_user_id UUID, p_telegram_link BOOLEAN DEFAULT true)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.purchases%ROWTYPE; current_telegram BIGINT;
BEGIN
  -- A purchase token grants the product, never administrative approval.
  SELECT telegram_id INTO current_telegram FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  SELECT * INTO v FROM public.purchases WHERE claim_token=p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v.status <> 'paid' THEN RETURN 'not_paid'; END IF;
  IF v.claimed_by IS NOT NULL THEN
    IF v.claimed_by=p_user_id THEN RETURN 'already_claimed'; END IF;
    RETURN 'claimed_by_other';
  END IF;
  IF v.claim_expires_at <= now() THEN RETURN 'expired'; END IF;
  IF p_telegram_link THEN
    IF current_telegram IS NOT NULL AND current_telegram <> v.telegram_id THEN RETURN 'telegram_conflict'; END IF;
    BEGIN
      UPDATE public.profiles SET telegram_id=v.telegram_id WHERE id=p_user_id;
    EXCEPTION WHEN unique_violation THEN RETURN 'telegram_conflict'; END;
  END IF;
  UPDATE public.purchases SET claimed_by=p_user_id, claimed_at=now() WHERE id=v.id;
  INSERT INTO public.entitlements(user_id, product, source, expires_at)
    VALUES(p_user_id,v.product,'purchase:'||v.id,NULL)
    ON CONFLICT(user_id,product) DO UPDATE SET
      source=CASE WHEN public.entitlements.source IS NOT NULL AND public.entitlements.source NOT LIKE 'purchase:%' AND public.entitlements.expires_at IS NULL
        THEN public.entitlements.source ELSE EXCLUDED.source END,
      granted_at=now(), expires_at=NULL;
  RETURN 'claimed';
END $$;

-- Explicit ACLs for all new server-only RPCs; do not rely on project defaults.
REVOKE ALL ON FUNCTION public.record_prodamus_purchase(TEXT,TEXT,BIGINT,INTEGER), public.lease_purchase_delivery(UUID),
  public.finish_purchase_delivery(UUID,UUID,BOOLEAN), public.claim_prompts_purchase(UUID,UUID,BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_prodamus_purchase(TEXT,TEXT,BIGINT,INTEGER), public.lease_purchase_delivery(UUID),
  public.finish_purchase_delivery(UUID,UUID,BOOLEAN), public.claim_prompts_purchase(UUID,UUID,BOOLEAN) TO service_role;
REVOKE ALL ON FUNCTION public.guard_purchase_refund(), public.sync_refunded_access(), public.check_profile_update() FROM PUBLIC, anon, authenticated;

-- Existing images are private. Content URLs are rewritten at render time by the app.
UPDATE storage.buckets SET public=false, file_size_limit=10485760,
  allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp','image/gif'] WHERE id='lesson-images';
CREATE TABLE IF NOT EXISTS public.request_limits (
  key TEXT PRIMARY KEY, window_started TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL
);
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_limits FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.consume_request_limit(p_key TEXT, p_limit INTEGER, p_seconds INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n INTEGER;
BEGIN
  IF length(p_key)>200 OR p_limit<1 OR p_seconds<1 OR p_seconds>3600 THEN RETURN false; END IF;
  INSERT INTO public.request_limits(key,window_started,attempts) VALUES(p_key,now(),1)
  ON CONFLICT(key) DO UPDATE SET
    attempts=CASE WHEN public.request_limits.window_started < now()-make_interval(secs=>p_seconds) THEN 1 ELSE public.request_limits.attempts+1 END,
    window_started=CASE WHEN public.request_limits.window_started < now()-make_interval(secs=>p_seconds) THEN now() ELSE public.request_limits.window_started END
  RETURNING attempts INTO n;
  RETURN n<=p_limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_request_limit(TEXT,INTEGER,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_request_limit(TEXT,INTEGER,INTEGER) TO service_role;
COMMIT;
