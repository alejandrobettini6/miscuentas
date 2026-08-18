-- Migración: módulo de viajes (trips + trip_expenses).
-- Ejecutar en Supabase → SQL Editor (requerido antes de usar Viajes en producción).
--
-- Verificación post-ejecución:
--   SELECT trips_module_enabled FROM public.settings LIMIT 1;
--   SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('trips', 'trip_expenses');

-- 1. Agregar columna trips_module_enabled a settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS trips_module_enabled boolean NOT NULL DEFAULT true;

-- 2. Tabla trips
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Viaje',
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CLOSED')),
  budget_mode text NOT NULL DEFAULT 'TOTAL'
    CHECK (budget_mode IN ('LIMIT', 'TOTAL')),
  budget_limit numeric(12, 2) DEFAULT NULL,
  counts_against_monthly boolean NOT NULL DEFAULT false,
  enabled_accounts text[] NOT NULL DEFAULT '{WHITE,CASH}',
  enabled_currencies text[] NOT NULL DEFAULT '{USD,ARS}',
  enabled_categories text[] NOT NULL DEFAULT '{}',
  custom_categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz DEFAULT NULL,
  merged_at timestamptz DEFAULT NULL,
  merge_mode text DEFAULT NULL
    CHECK (merge_mode IN ('AS_TRIP', 'INDIVIDUAL')),
  merged_expense_ids uuid[] DEFAULT NULL,
  reopen_deadline timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS trips_user_id_idx ON public.trips (user_id);
CREATE INDEX IF NOT EXISTS trips_user_status_idx ON public.trips (user_id, status);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select_own" ON public.trips;
CREATE POLICY "trips_select_own"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
CREATE POLICY "trips_insert_own"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_update_own" ON public.trips;
CREATE POLICY "trips_update_own"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_delete_own" ON public.trips;
CREATE POLICY "trips_delete_own"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Tabla trip_expenses
CREATE TABLE IF NOT EXISTS public.trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE RESTRICT,
  account_type text NOT NULL CHECK (account_type IN ('WHITE', 'CASH')),
  category text NOT NULL,
  description text,
  original_currency text NOT NULL CHECK (original_currency IN ('USD', 'ARS')),
  original_amount numeric(12, 2) NOT NULL CHECK (original_amount <> 0),
  exchange_rate numeric(12, 6) NOT NULL DEFAULT 1,
  usd_amount numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_expenses_user_id_idx ON public.trip_expenses (user_id);
CREATE INDEX IF NOT EXISTS trip_expenses_trip_id_idx ON public.trip_expenses (trip_id);
CREATE INDEX IF NOT EXISTS trip_expenses_user_trip_idx ON public.trip_expenses (user_id, trip_id);

ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_expenses_select_own" ON public.trip_expenses;
CREATE POLICY "trip_expenses_select_own"
  ON public.trip_expenses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trip_expenses_insert_own" ON public.trip_expenses;
CREATE POLICY "trip_expenses_insert_own"
  ON public.trip_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trip_expenses_update_own" ON public.trip_expenses;
CREATE POLICY "trip_expenses_update_own"
  ON public.trip_expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trip_expenses_delete_own" ON public.trip_expenses;
CREATE POLICY "trip_expenses_delete_own"
  ON public.trip_expenses FOR DELETE
  USING (auth.uid() = user_id);
