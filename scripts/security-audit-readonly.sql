-- Read-only verification in the Supabase SQL Editor.
-- No personal records, tokens, or secrets are selected.
BEGIN TRANSACTION READ ONLY;

SELECT role, is_approved, count(*) AS profile_count
FROM public.profiles GROUP BY role, is_approved ORDER BY role, is_approved;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'courses', 'topics', 'lessons', 'progress',
                    'user_courses', 'user_lesson_access', 'purchases', 'entitlements')
ORDER BY tablename, policyname;

SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

SELECT r.role_name, c.column_name,
       has_column_privilege(r.role_name, 'public.profiles', c.column_name, 'SELECT') AS can_select,
       has_column_privilege(r.role_name, 'public.profiles', c.column_name, 'UPDATE') AS can_update
FROM (VALUES ('anon'), ('authenticated'), ('service_role')) r(role_name)
CROSS JOIN information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'profiles'
ORDER BY r.role_name, c.ordinal_position;

SELECT p.oid::regprocedure AS function_signature, p.prosecdef, p.proconfig, p.proacl,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_execute,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'handle_new_user', 'check_profile_update', 'claim_prompts_purchase');

SELECT t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'lesson-images';

ROLLBACK;
