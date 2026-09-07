-- Only for a disposable local PostgreSQL cluster. Never run against production.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}');
CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
\ir ../../supabase/migrations/001_initial_schema.sql
\ir ../../supabase/002_fix_rls.sql
\ir ../../supabase/004_admin_and_courses.sql
\ir ../../supabase/005_fix_recursion.sql
\ir ../../supabase/006_fix_profiles_recursion.sql
\ir ../../supabase/007_fix_admin_update.sql
\ir ../../supabase/009_add_email_to_profiles.sql
ALTER TABLE public.topics ADD COLUMN block_name TEXT;
ALTER TABLE public.lessons ADD COLUMN block_name TEXT;
\ir ../../supabase/015_neurocontent_course.sql
\ir ../../supabase/017_lesson_images_storage.sql
\ir ../../supabase/028_prompts_access.sql
\ir ../../supabase/029_grandfather_prompts_access.sql
\ir ../../supabase/030_security_hardening.sql
-- Idempotence verification.
\ir ../../supabase/030_security_hardening.sql
