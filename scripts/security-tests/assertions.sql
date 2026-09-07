\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('10000000-0000-4000-8000-000000000001','student-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','student-b@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','admin@example.invalid');
UPDATE public.profiles SET role='admin',is_approved=true WHERE id='10000000-0000-4000-8000-000000000003';
UPDATE public.profiles SET is_approved=true WHERE id='10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles) <> 1 THEN RAISE EXCEPTION 'Student can read other profiles'; END IF;
 IF has_column_privilege('authenticated','public.profiles','telegram_id','UPDATE') THEN RAISE EXCEPTION 'Telegram column writable'; END IF;
 IF has_column_privilege('authenticated','public.profiles','created_at','UPDATE') THEN RAISE EXCEPTION 'Creation date writable'; END IF;
 BEGIN
   UPDATE public.profiles SET role='admin' WHERE id=auth.uid();
   RAISE EXCEPTION 'Student promoted self';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   UPDATE public.profiles SET telegram_id=999 WHERE id=auth.uid();
   RAISE EXCEPTION 'Student changed Telegram';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.profiles SET full_name='Allowed name' WHERE id=auth.uid();
 IF has_function_privilege('authenticated','public.claim_prompts_purchase(uuid,uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Claim RPC public'; END IF;
 IF has_function_privilege('anon','public.record_prodamus_purchase(text,text,bigint,integer)','EXECUTE') THEN RAISE EXCEPTION 'Payment RPC public'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles) <> 3 THEN RAISE EXCEPTION 'Admin cannot read profiles'; END IF;
 UPDATE public.profiles SET is_approved=true WHERE id='10000000-0000-4000-8000-000000000002';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.role','service_role',true);
SELECT set_config('request.jwt.claim.sub','',true);
DO $$
DECLARE first_id UUID; second_id UUID; t UUID; t2 UUID; result TEXT; d JSONB; lease UUID;
BEGIN
 d := public.record_prodamus_purchase('prompts_123_fixture','tx-1',123,49000); first_id := (d->>'id')::uuid;
 d := public.record_prodamus_purchase('prompts_123_fixture','tx-1',123,49000);
 IF (d->>'id')::uuid <> first_id THEN RAISE EXCEPTION 'Duplicate payment'; END IF;
 SELECT claim_token INTO t FROM public.purchases WHERE id=first_id;
 BEGIN
  PERFORM public.record_prodamus_purchase('prompts_123_fixture','different-tx',123,49000);
  RAISE EXCEPTION 'Transaction mismatch accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Transaction mismatch accepted' THEN RAISE; END IF; END;
 d:=public.lease_purchase_delivery(first_id); lease := (d->>'lease')::uuid;
 IF d->>'status' <> 'leased' THEN RAISE EXCEPTION 'Delivery not leased'; END IF;
 IF public.lease_purchase_delivery(first_id)->>'status' <> 'busy' THEN RAISE EXCEPTION 'Concurrent delivery allowed'; END IF;
 PERFORM public.finish_purchase_delivery(first_id,lease,false);
 d:=public.lease_purchase_delivery(first_id); lease := (d->>'lease')::uuid;
 PERFORM public.finish_purchase_delivery(first_id,lease,true);
 IF public.lease_purchase_delivery(first_id)->>'status' <> 'done' THEN RAISE EXCEPTION 'Sent delivery repeated'; END IF;
 UPDATE public.purchases SET claim_expires_at=now()-interval '1 day' WHERE id=first_id;
 d:=public.lease_purchase_delivery(first_id);
 IF d->>'status' <> 'leased' OR (d->>'claim_token')::uuid=t THEN RAISE EXCEPTION 'Expired sent link not renewed'; END IF;
 t:=(d->>'claim_token')::uuid;
 PERFORM public.finish_purchase_delivery(first_id,(d->>'lease')::uuid,true);
 result:=public.claim_prompts_purchase(t,'10000000-0000-4000-8000-000000000001');
 IF result <> 'claimed' THEN RAISE EXCEPTION 'Claim failed: %',result; END IF;
 IF public.claim_prompts_purchase(t,'10000000-0000-4000-8000-000000000001') <> 'already_claimed' THEN RAISE EXCEPTION 'Claim not idempotent'; END IF;
 IF public.claim_prompts_purchase(t,'10000000-0000-4000-8000-000000000002') <> 'claimed_by_other' THEN RAISE EXCEPTION 'Other user reclaimed'; END IF;
 d:=public.record_prodamus_purchase('prompts_123_second','tx-2',123,49000); second_id:=(d->>'id')::uuid;
 SELECT claim_token INTO t2 FROM public.purchases WHERE id=second_id;
 IF public.claim_prompts_purchase(t2,'10000000-0000-4000-8000-000000000002') <> 'telegram_conflict' THEN RAISE EXCEPTION 'Telegram collision unhandled'; END IF;
 IF EXISTS(SELECT 1 FROM public.entitlements WHERE user_id='10000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Failed claim granted access'; END IF;
 IF public.claim_prompts_purchase(t2,'10000000-0000-4000-8000-000000000001') <> 'claimed' THEN RAISE EXCEPTION 'Second valid purchase failed'; END IF;
 UPDATE public.purchases SET status='refunded' WHERE id=first_id;
 IF NOT EXISTS(SELECT 1 FROM public.entitlements WHERE user_id='10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Refund removed another valid purchase'; END IF;
 UPDATE public.purchases SET status='refunded' WHERE id=second_id;
 IF EXISTS(SELECT 1 FROM public.entitlements WHERE user_id='10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Refund left paid access'; END IF;
 d:=public.record_prodamus_purchase('prompts_123_fixture','tx-1',123,49000);
 IF d->>'status' <> 'refunded' THEN RAISE EXCEPTION 'Replay resurrected refund'; END IF;
 IF public.claim_prompts_purchase(t,'10000000-0000-4000-8000-000000000001') <> 'not_paid' THEN RAISE EXCEPTION 'Refunded token reusable'; END IF;
 IF NOT public.consume_request_limit('test',1,60) OR public.consume_request_limit('test',1,60) THEN RAISE EXCEPTION 'Rate limit ineffective'; END IF;
 IF (SELECT public FROM storage.buckets WHERE id='lesson-images') THEN RAISE EXCEPTION 'Images public'; END IF;
END $$;
-- Real RLS checks for course publication, grants, sequential lessons and revocation.
INSERT INTO public.courses(id,title,is_published,sequential_access) VALUES
 ('20000000-0000-4000-8000-000000000001','visible fixture',true,true),
 ('20000000-0000-4000-8000-000000000002','unpublished fixture',false,false),
 ('20000000-0000-4000-8000-000000000003','ungranted fixture',true,false);
INSERT INTO public.topics(id,course_id,title,is_published)
 SELECT id,id,title,true FROM public.courses WHERE id::text LIKE '20000000-%';
INSERT INTO public.lessons(id,topic_id,title,content,is_published,sort_order)
 SELECT id,id,title,'private fixture',true,1 FROM public.topics WHERE id::text LIKE '20000000-%';
INSERT INTO public.lessons(id,topic_id,title,content,is_published,sort_order) VALUES
 ('20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','locked sequential fixture','private fixture',true,2);
INSERT INTO public.user_courses(user_id,course_id) VALUES
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.courses WHERE id::text LIKE '20000000-%') <> 1 THEN RAISE EXCEPTION 'Course publication/grant bypass'; END IF;
 IF (SELECT count(*) FROM public.topics WHERE id::text LIKE '20000000-%') <> 1 THEN RAISE EXCEPTION 'Topic publication/grant bypass'; END IF;
 IF (SELECT count(*) FROM public.lessons WHERE id::text LIKE '20000000-%') <> 1 THEN RAISE EXCEPTION 'Lesson grant/sequential bypass'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.role','service_role',true);
INSERT INTO public.user_lesson_access(user_id,lesson_id) VALUES
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.lessons WHERE id::text LIKE '20000000-%') <> 2 THEN RAISE EXCEPTION 'Explicit sequential grant ineffective'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.role','service_role',true);
UPDATE public.profiles SET is_approved=false WHERE id='10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.courses WHERE id::text LIKE '20000000-%') OR EXISTS(SELECT 1 FROM public.lessons WHERE id::text LIKE '20000000-%') THEN RAISE EXCEPTION 'Approval revocation ineffective'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'Security SQL assertions passed' AS result;
