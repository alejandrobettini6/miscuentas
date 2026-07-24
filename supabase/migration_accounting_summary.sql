-- Migración: moneda contable preferida + modo de resumen (límite vs sumatoria).
-- Ejecutar una sola vez en Supabase → SQL Editor sobre un proyecto ya existente.
-- Instalaciones nuevas: usar supabase/schema.sql actualizado.

DO $$ BEGIN
  CREATE TYPE public.summary_display_mode AS ENUM ('LIMIT', 'TOTAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS accounting_currency public.currency_type NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS summary_display_mode public.summary_display_mode NOT NULL DEFAULT 'LIMIT';

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
    usd_white = EXCLUDED.usd_white,
    usd_cash = EXCLUDED.usd_cash,
    monthly_limit = EXCLUDED.monthly_limit,
    custom_categories = EXCLUDED.custom_categories,
    enabled_accounts = EXCLUDED.enabled_accounts,
    enabled_currencies = EXCLUDED.enabled_currencies,
    enabled_fixed_categories = EXCLUDED.enabled_fixed_categories,
    month_mode = EXCLUDED.month_mode,
    accounting_currency = EXCLUDED.accounting_currency,
    summary_display_mode = EXCLUDED.summary_display_mode,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

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
      original_currency, original_amount, exchange_rate, usd_amount,
      created_at, updated_at
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
      coalesce((expense_item->>'createdAt')::timestamptz, now()),
      coalesce((expense_item->>'updatedAt')::timestamptz, now())
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_user_accounts(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_user_accounts(jsonb) TO authenticated;
