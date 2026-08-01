-- Fix mínimo para instalaciones que ya tienen la tabla incomes.
-- Ejecutar en Supabase → SQL Editor. Seguro re-ejecutar (idempotente).
--
-- Usar ESTE archivo si migration_incomes.sql falló por policies duplicadas
-- o si ves el error incomes_unique_period_account_currency al registrar ingresos.
--
-- "0 rows" en el resultado es normal para ALTER TABLE.

ALTER TABLE public.incomes
  DROP CONSTRAINT IF EXISTS incomes_unique_period_account_currency;

ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS income_sources text[] NOT NULL DEFAULT '{}';
