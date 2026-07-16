-- Migración: períodos mensuales + preferencias de usuario + importación atómica.
-- Ejecutar una sola vez en Supabase → SQL Editor sobre un proyecto ya existente.
-- Instalaciones nuevas: usar supabase/schema.sql actualizado.

-- 1) Enums nuevos
DO $$ BEGIN
  CREATE TYPE public.period_status AS ENUM ('ACTIVE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.month_mode AS ENUM ('AUTOMATIC', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Períodos
CREATE TABLE IF NOT EXISTS public.periods (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text NOT NULL,
  year_month text NOT NULL,
  status public.period_status NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL,
  monthly_limit_snapshot numeric(18, 2) NULL,
  CONSTRAINT periods_year_month_format CHECK (year_month ~ '^\d{4}-\d{2}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS periods_one_active_per_user
  ON public.periods (user_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS periods_user_id_idx ON public.periods (user_id);
CREATE INDEX IF NOT EXISTS periods_user_year_month_idx
  ON public.periods (user_id, year_month DESC);

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periods_select_own" ON public.periods;
CREATE POLICY "periods_select_own"
  ON public.periods FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "periods_insert_own" ON public.periods;
CREATE POLICY "periods_insert_own"
  ON public.periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "periods_update_own" ON public.periods;
CREATE POLICY "periods_update_own"
  ON public.periods FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "periods_delete_own" ON public.periods;
CREATE POLICY "periods_delete_own"
  ON public.periods FOR DELETE
  USING (auth.uid() = user_id);

-- 3) Preferencias en settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS enabled_accounts text[] NOT NULL DEFAULT ARRAY['WHITE', 'CASH']::text[],
  ADD COLUMN IF NOT EXISTS enabled_currencies text[] NOT NULL DEFAULT ARRAY['USD', 'ARS']::text[],
  ADD COLUMN IF NOT EXISTS enabled_fixed_categories text[] NOT NULL DEFAULT ARRAY[
    'SUPER','DELIVERY','AUTO','SALUD','SERVICIOS','NINA','SALIDAS','PELO','GYM','LIMPIEZA','TAXES','REFUNDS'
  ]::text[],
  ADD COLUMN IF NOT EXISTS month_mode public.month_mode NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 4) Backfill: un período activo por usuario con gastos o settings
INSERT INTO public.periods (id, user_id, label, year_month, status, started_at, closed_at, monthly_limit_snapshot)
SELECT
  gen_random_uuid(),
  s.user_id,
  to_char(timezone('UTC', now()), 'TMMonth YYYY'),
  to_char(timezone('UTC', now()), 'YYYY-MM'),
  'ACTIVE',
  now(),
  NULL,
  s.monthly_limit
FROM public.settings s
WHERE NOT EXISTS (
  SELECT 1 FROM public.periods p WHERE p.user_id = s.user_id AND p.status = 'ACTIVE'
);

-- 5) period_id en expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS period_id uuid NULL REFERENCES public.periods (id) ON DELETE RESTRICT;

UPDATE public.expenses e
SET period_id = p.id
FROM public.periods p
WHERE e.user_id = p.user_id
  AND p.status = 'ACTIVE'
  AND e.period_id IS NULL;

-- Usuarios con gastos pero sin settings/período
INSERT INTO public.periods (id, user_id, label, year_month, status, started_at)
SELECT
  gen_random_uuid(),
  e.user_id,
  to_char(timezone('UTC', now()), 'TMMonth YYYY'),
  to_char(timezone('UTC', now()), 'YYYY-MM'),
  'ACTIVE',
  now()
FROM (
  SELECT DISTINCT user_id FROM public.expenses WHERE period_id IS NULL
) e
WHERE NOT EXISTS (
  SELECT 1 FROM public.periods p WHERE p.user_id = e.user_id AND p.status = 'ACTIVE'
);

UPDATE public.expenses e
SET period_id = p.id
FROM public.periods p
WHERE e.user_id = p.user_id
  AND p.status = 'ACTIVE'
  AND e.period_id IS NULL;

ALTER TABLE public.expenses
  ALTER COLUMN period_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS expenses_user_period_idx
  ON public.expenses (user_id, period_id);

-- 6) Importación atómica (reemplazo total del usuario autenticado)
CREATE OR REPLACE FUNCTION public.replace_user_accounts(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  settings_json jsonb;
  period_item jsonb;
  expense_item jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Payload inválido';
  END IF;

  settings_json := payload->'settings';
  IF settings_json IS NULL OR jsonb_typeof(settings_json) <> 'object' THEN
    RAISE EXCEPTION 'Settings inválidas';
  END IF;

  DELETE FROM public.expenses WHERE user_id = uid;
  DELETE FROM public.periods WHERE user_id = uid;

  INSERT INTO public.settings (
    user_id,
    usd_white,
    usd_cash,
    monthly_limit,
    custom_categories,
    enabled_accounts,
    enabled_currencies,
    enabled_fixed_categories,
    month_mode,
    onboarding_completed,
    updated_at
  ) VALUES (
    uid,
    COALESCE((settings_json->>'usdWhite')::numeric, 1),
    COALESCE((settings_json->>'usdCash')::numeric, 1),
    COALESCE((settings_json->>'monthlyLimit')::numeric, 1500),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(settings_json->'customCategories', '[]'::jsonb))),
      '{}'::text[]
    ),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(settings_json->'enabledAccounts', '["WHITE","CASH"]'::jsonb))),
      ARRAY['WHITE','CASH']::text[]
    ),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(settings_json->'enabledCurrencies', '["USD","ARS"]'::jsonb))),
      ARRAY['USD','ARS']::text[]
    ),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(settings_json->'enabledFixedCategories', '[]'::jsonb))),
      '{}'::text[]
    ),
    COALESCE((settings_json->>'monthMode')::public.month_mode, 'AUTOMATIC'),
    COALESCE((settings_json->>'onboardingCompleted')::boolean, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    usd_white = EXCLUDED.usd_white,
    usd_cash = EXCLUDED.usd_cash,
    monthly_limit = EXCLUDED.monthly_limit,
    custom_categories = EXCLUDED.custom_categories,
    enabled_accounts = EXCLUDED.enabled_accounts,
    enabled_currencies = EXCLUDED.enabled_currencies,
    enabled_fixed_categories = EXCLUDED.enabled_fixed_categories,
    month_mode = EXCLUDED.month_mode,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  FOR period_item IN
    SELECT * FROM jsonb_array_elements(COALESCE(payload->'periods', '[]'::jsonb))
  LOOP
    INSERT INTO public.periods (
      id, user_id, label, year_month, status, started_at, closed_at, monthly_limit_snapshot
    ) VALUES (
      (period_item->>'id')::uuid,
      uid,
      period_item->>'label',
      period_item->>'yearMonth',
      (period_item->>'status')::public.period_status,
      COALESCE((period_item->>'startedAt')::timestamptz, now()),
      CASE
        WHEN period_item->>'closedAt' IS NULL OR period_item->>'closedAt' = 'null'
          THEN NULL
        ELSE (period_item->>'closedAt')::timestamptz
      END,
      CASE
        WHEN period_item->>'monthlyLimitSnapshot' IS NULL OR period_item->>'monthlyLimitSnapshot' = 'null'
          THEN NULL
        ELSE (period_item->>'monthlyLimitSnapshot')::numeric
      END
    );
  END LOOP;

  FOR expense_item IN
    SELECT * FROM jsonb_array_elements(COALESCE(payload->'expenses', '[]'::jsonb))
  LOOP
    INSERT INTO public.expenses (
      id, user_id, period_id, account_type, category, description,
      original_currency, original_amount, exchange_rate, usd_amount, created_at, updated_at
    ) VALUES (
      (expense_item->>'id')::uuid,
      uid,
      (expense_item->>'periodId')::uuid,
      (expense_item->>'accountType')::public.account_type,
      (expense_item->>'category')::public.category_type,
      NULLIF(expense_item->>'description', 'null'),
      (expense_item->>'originalCurrency')::public.currency_type,
      (expense_item->>'originalAmount')::numeric,
      (expense_item->>'exchangeRate')::numeric,
      (expense_item->>'usdAmount')::numeric,
      COALESCE((expense_item->>'createdAt')::timestamptz, now()),
      COALESCE((expense_item->>'updatedAt')::timestamptz, now())
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_user_accounts(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_user_accounts(jsonb) TO authenticated;
