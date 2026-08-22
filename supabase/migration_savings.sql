-- Migración: módulo de ahorros (cajitas en settings + idempotencia en periods).
-- Ejecutar en Supabase → SQL Editor antes de usar Ahorros en producción.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS savings_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS savings_balances jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.periods
  ADD COLUMN IF NOT EXISTS savings_applied_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS savings_applied_amount numeric(18, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS savings_applied_location text DEFAULT NULL;
