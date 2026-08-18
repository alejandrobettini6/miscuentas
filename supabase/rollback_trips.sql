-- Rollback: revierte migration_trips.sql.
-- Ejecutar en Supabase → SQL Editor si se necesita deshacer la migración.

DROP TABLE IF EXISTS public.trip_expenses;
DROP TABLE IF EXISTS public.trips;
ALTER TABLE public.settings DROP COLUMN IF EXISTS trips_module_enabled;
