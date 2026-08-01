-- Migración: tabla incomes (ingresos por período y cuenta).
-- Ejecutar en Supabase → SQL Editor.
--
-- IMPORTANTE — si ya tenés la tabla incomes y falló una corrida anterior:
--   1. Ejecutá PRIMERO supabase/migration_incomes_fix.sql (solo ALTER, sin policies).
--   2. Luego podés correr este archivo completo si necesitás la función replace_user_accounts.
--
-- Si migration_incomes.sql falla a mitad (ej. policy duplicada), PostgreSQL revierte
-- TODO el script incluyendo DROP CONSTRAINT. Por eso el fix mínimo va en archivo aparte.

-- Fixes críticos primero (múltiples ingresos + columna description)
ALTER TABLE public.incomes
  DROP CONSTRAINT IF EXISTS incomes_unique_period_account_currency;

ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS income_sources text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods (id) ON DELETE CASCADE,
  account_type public.account_type NOT NULL,
  description text NOT NULL DEFAULT '',
  original_currency public.currency_type NOT NULL,
  original_amount numeric(18, 2) NOT NULL CHECK (original_amount > 0),
  exchange_rate numeric(18, 6) NOT NULL CHECK (exchange_rate > 0),
  usd_amount numeric(18, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incomes_user_id_idx ON public.incomes (user_id);
CREATE INDEX IF NOT EXISTS incomes_user_period_idx ON public.incomes (user_id, period_id);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incomes_select_own" ON public.incomes;
CREATE POLICY "incomes_select_own"
  ON public.incomes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "incomes_insert_own" ON public.incomes;
CREATE POLICY "incomes_insert_own"
  ON public.incomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "incomes_update_own" ON public.incomes;
CREATE POLICY "incomes_update_own"
  ON public.incomes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "incomes_delete_own" ON public.incomes;
CREATE POLICY "incomes_delete_own"
  ON public.incomes FOR DELETE
  USING (auth.uid() = user_id);

-- Actualizar replace_user_accounts para incluir incomes
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
  income_item jsonb;
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

  DELETE FROM public.incomes WHERE user_id = uid;
  DELETE FROM public.expenses WHERE user_id = uid;
  DELETE FROM public.periods WHERE user_id = uid;

  INSERT INTO public.settings (
    user_id,
    usd_white,
    usd_cash,
    monthly_limit,
    custom_categories,
    income_sources,
    enabled_accounts,
    enabled_currencies,
    enabled_fixed_categories,
    month_mode,
    accounting_currency,
    summary_display_mode,
    onboarding_completed,
    updated_at
  ) VALUES (
    uid,
    coalesce((settings_json->>'usdWhite')::numeric, 1),
    coalesce((settings_json->>'usdCash')::numeric, 1),
    coalesce((settings_json->>'monthlyLimit')::numeric, 1500),
    coalesce(
      array(SELECT jsonb_array_elements_text(coalesce(settings_json->'customCategories', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce(
      array(SELECT jsonb_array_elements_text(coalesce(settings_json->'incomeSources', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce(
      array(SELECT jsonb_array_elements_text(coalesce(settings_json->'enabledAccounts', '["WHITE","CASH"]'::jsonb))),
      array['WHITE','CASH']::text[]
    ),
    coalesce(
      array(SELECT jsonb_array_elements_text(coalesce(settings_json->'enabledCurrencies', '["USD","ARS"]'::jsonb))),
      array['USD','ARS']::text[]
    ),
    coalesce(
      array(SELECT jsonb_array_elements_text(coalesce(settings_json->'enabledFixedCategories', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce((settings_json->>'monthMode')::public.month_mode, 'AUTOMATIC'),
    coalesce((settings_json->>'accountingCurrency')::public.currency_type, 'USD'),
    coalesce((settings_json->>'summaryDisplayMode')::public.summary_display_mode, 'LIMIT'),
    coalesce((settings_json->>'onboardingCompleted')::boolean, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    usd_white = excluded.usd_white,
    usd_cash = excluded.usd_cash,
    monthly_limit = excluded.monthly_limit,
    custom_categories = excluded.custom_categories,
    income_sources = excluded.income_sources,
    enabled_accounts = excluded.enabled_accounts,
    enabled_currencies = excluded.enabled_currencies,
    enabled_fixed_categories = excluded.enabled_fixed_categories,
    month_mode = excluded.month_mode,
    accounting_currency = excluded.accounting_currency,
    summary_display_mode = excluded.summary_display_mode,
    onboarding_completed = excluded.onboarding_completed,
    updated_at = excluded.updated_at;

  FOR period_item IN
    SELECT * FROM jsonb_array_elements(coalesce(payload->'periods', '[]'::jsonb))
  LOOP
    INSERT INTO public.periods (
      id, user_id, label, year_month, status, started_at, closed_at, monthly_limit_snapshot
    ) VALUES (
      (period_item->>'id')::uuid,
      uid,
      period_item->>'label',
      period_item->>'yearMonth',
      (period_item->>'status')::public.period_status,
      coalesce((period_item->>'startedAt')::timestamptz, now()),
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
    SELECT * FROM jsonb_array_elements(coalesce(payload->'expenses', '[]'::jsonb))
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
      nullif(expense_item->>'description', 'null'),
      (expense_item->>'originalCurrency')::public.currency_type,
      (expense_item->>'originalAmount')::numeric,
      (expense_item->>'exchangeRate')::numeric,
      (expense_item->>'usdAmount')::numeric,
      coalesce((expense_item->>'createdAt')::timestamptz, now()),
      coalesce((expense_item->>'updatedAt')::timestamptz, now())
    );
  END LOOP;

  FOR income_item IN
    SELECT * FROM jsonb_array_elements(coalesce(payload->'incomes', '[]'::jsonb))
  LOOP
    INSERT INTO public.incomes (
      id, user_id, period_id, account_type, description,
      original_currency, original_amount, exchange_rate, usd_amount,
      created_at, updated_at
    ) VALUES (
      (income_item->>'id')::uuid,
      uid,
      (income_item->>'periodId')::uuid,
      (income_item->>'accountType')::public.account_type,
      coalesce(nullif(income_item->>'description', 'null'), ''),
      (income_item->>'originalCurrency')::public.currency_type,
      (income_item->>'originalAmount')::numeric,
      (income_item->>'exchangeRate')::numeric,
      (income_item->>'usdAmount')::numeric,
      coalesce((income_item->>'createdAt')::timestamptz, now()),
      coalesce((income_item->>'updatedAt')::timestamptz, now())
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_user_accounts(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_user_accounts(jsonb) TO authenticated;
