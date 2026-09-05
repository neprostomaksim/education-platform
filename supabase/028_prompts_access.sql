-- =========================================================================
-- Migration 028: Платный доступ к «Библиотеке промптов» (воронка через бот)
-- =========================================================================
-- Модель: разовая покупка → доступ навсегда. Оплата проходит в Telegram-боте
-- через Prodamus; покупка фиксируется до регистрации и привязывается к аккаунту
-- одноразовым claim-токеном.
--
-- Доступ к промптам — ОТДЕЛЬНОЕ право (entitlement), не связанное с ручным
-- одобрением для курсов (profiles.is_approved) и с user_courses. Покупатель
-- промптов НЕ попадает на /pending.
--
-- Миграция чисто аддитивная и идемпотентная (IF NOT EXISTS / DROP+CREATE
-- политик) — безопасна для повторного запуска. Применять в Supabase SQL Editor.
-- =========================================================================

-- 1. Привязка аккаунта к Telegram (для повторной выдачи ссылки и рассылок бота)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

-- Один Telegram — не более чем один аккаунт (среди заполненных значений).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_id_key
    ON public.profiles (telegram_id)
    WHERE telegram_id IS NOT NULL;

-- =========================================================================
-- 2. Покупки — источник истины об оплате (пишет только сервер по webhook)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.purchases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id         BIGINT NOT NULL,
    telegram_username   TEXT,
    provider            TEXT NOT NULL DEFAULT 'prodamus',
    -- Идемпотентность webhook: один платёж провайдера = одна строка.
    provider_order_id   TEXT UNIQUE,
    product             TEXT NOT NULL DEFAULT 'prompts',
    amount              INTEGER,
    currency            TEXT DEFAULT 'RUB',
    status              TEXT NOT NULL DEFAULT 'paid'
                        CHECK (status IN ('paid', 'refunded')),
    -- Одноразовый ключ активации, живёт claim_expires_at.
    claim_token         UUID NOT NULL DEFAULT gen_random_uuid(),
    claim_expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    claimed_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    claimed_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS purchases_claim_token_key
    ON public.purchases (claim_token);
CREATE INDEX IF NOT EXISTS purchases_telegram_id_idx
    ON public.purchases (telegram_id);

-- =========================================================================
-- 3. Entitlements — что открыто конкретному пользователю
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.entitlements (
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product     TEXT NOT NULL DEFAULT 'prompts',
    source      TEXT,                 -- напр. 'purchase:<id>' или 'admin'
    expires_at  TIMESTAMPTZ,          -- NULL = бессрочно (разовая покупка)
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product)
);

CREATE INDEX IF NOT EXISTS entitlements_user_idx
    ON public.entitlements (user_id);

-- =========================================================================
-- 4. RLS
-- =========================================================================
ALTER TABLE public.purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- Purchases: обычные записи/чтение — только через сервис-роль (webhook, claim),
-- которая обходит RLS. Пользователь видит лишь свою уже привязанную покупку;
-- админ — всё.
DROP POLICY IF EXISTS "Users can view own claimed purchases" ON public.purchases;
CREATE POLICY "Users can view own claimed purchases"
    ON public.purchases FOR SELECT
    USING (auth.uid() = claimed_by);

DROP POLICY IF EXISTS "Admins manage purchases" ON public.purchases;
CREATE POLICY "Admins manage purchases"
    ON public.purchases FOR ALL
    USING (public.is_admin());

-- Entitlements: пользователь видит свои; пишет только сервис-роль/админ.
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.entitlements;
CREATE POLICY "Users can view own entitlements"
    ON public.entitlements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage entitlements" ON public.entitlements;
CREATE POLICY "Admins manage entitlements"
    ON public.entitlements FOR ALL
    USING (public.is_admin());

-- =========================================================================
-- 5. Активация покупки (вызывается сервером сервис-ролью из /api/claim)
-- =========================================================================
-- Атомарно: проверяет токен (не погашен, не истёк, оплачен), привязывает
-- покупку к пользователю, выдаёт entitlement. Возвращает статус результата.
-- SECURITY DEFINER, но доступ снаружи не выдаём — вызывает только сервер.
CREATE OR REPLACE FUNCTION public.claim_prompts_purchase(
    p_token UUID,
    p_user_id UUID,
    p_telegram_link BOOLEAN DEFAULT true
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase public.purchases%ROWTYPE;
BEGIN
    SELECT * INTO v_purchase
        FROM public.purchases
        WHERE claim_token = p_token
        FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 'not_found';
    END IF;

    IF v_purchase.status <> 'paid' THEN
        RETURN 'not_paid';
    END IF;

    -- Уже привязана: этим же пользователем → успех (идемпотентно);
    -- другим → чужая ссылка.
    IF v_purchase.claimed_by IS NOT NULL THEN
        IF v_purchase.claimed_by = p_user_id THEN
            RETURN 'already_claimed';
        END IF;
        RETURN 'claimed_by_other';
    END IF;

    IF v_purchase.claim_expires_at < NOW() THEN
        RETURN 'expired';
    END IF;

    UPDATE public.purchases
        SET claimed_by = p_user_id, claimed_at = NOW()
        WHERE id = v_purchase.id;

    INSERT INTO public.entitlements (user_id, product, source, expires_at)
        VALUES (p_user_id, v_purchase.product, 'purchase:' || v_purchase.id, NULL)
        ON CONFLICT (user_id, product)
        DO UPDATE SET source = EXCLUDED.source, granted_at = NOW(), expires_at = NULL;

    -- Запомнить Telegram у профиля (для «Мой доступ» и рассылок бота).
    IF p_telegram_link THEN
        UPDATE public.profiles
            SET telegram_id = v_purchase.telegram_id
            WHERE id = p_user_id
              AND (telegram_id IS NULL OR telegram_id = v_purchase.telegram_id);
    END IF;

    RETURN 'claimed';
END;
$$;

-- Функцию вызывает только сервер сервис-ролью; публичного доступа не даём.
REVOKE ALL ON FUNCTION public.claim_prompts_purchase(UUID, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_prompts_purchase(UUID, UUID, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.claim_prompts_purchase(UUID, UUID, BOOLEAN) FROM authenticated;
