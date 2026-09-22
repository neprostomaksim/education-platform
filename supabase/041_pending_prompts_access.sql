-- =========================================================================
-- Migration 041: пред-выдача доступа к библиотеке по email
-- =========================================================================
-- Для людей, которые ОПЛАТИЛИ, но ещё НЕ зарегистрировались: заносим их email
-- в список pending_prompts_access, и как только они регистрируются под этой
-- почтой — доступ (entitlement 'prompts') выдаётся автоматически триггером.
-- Никаких ручных действий после.
--
-- Идемпотентна. Применять после 040.
-- =========================================================================

-- 1. Список заранее одобренных email (нижним регистром)
CREATE TABLE IF NOT EXISTS public.pending_prompts_access (
    email      TEXT PRIMARY KEY,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.pending_prompts_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pending_prompts_access FROM anon, authenticated;
GRANT ALL ON public.pending_prompts_access TO service_role;

-- 2. Триггер: при создании пользователя, если его email в списке —
--    выдать entitlement и убрать email из списка. Имя триггера 'zz_...'
--    сортируется ПОСЛЕ on_auth_user_created, поэтому профиль уже создан.
CREATE OR REPLACE FUNCTION public.grant_pending_prompts_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
    IF NEW.email IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.pending_prompts_access WHERE email = lower(NEW.email)) THEN
        INSERT INTO public.entitlements (user_id, product, source, expires_at)
            VALUES (NEW.id, 'prompts', 'preapproved', NULL)
            ON CONFLICT (user_id, product) DO NOTHING;
        DELETE FROM public.pending_prompts_access WHERE email = lower(NEW.email);
    END IF;
    RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.grant_pending_prompts_access() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_grant_pending_prompts ON auth.users;
CREATE TRIGGER zz_grant_pending_prompts
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.grant_pending_prompts_access();

-- 3. Если аккаунт уже существует под таким email — выдать доступ сразу.
INSERT INTO public.entitlements (user_id, product, source, expires_at)
SELECT p.id, 'prompts', 'preapproved', NULL
FROM public.profiles p
WHERE lower(p.email) IN ('valentinlavrov99@gmail.com', 'bisneslevel@gmail.com')
ON CONFLICT (user_id, product) DO NOTHING;

-- 4. Занести оплативших, у кого аккаунта ещё нет.
INSERT INTO public.pending_prompts_access (email, note) VALUES
    ('valentinlavrov99@gmail.com', 'оплатил, до регистрации')
ON CONFLICT (email) DO NOTHING;
