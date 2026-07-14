-- Migración: Impuestos (TAXES), Devoluciones (REFUNDS) y montos negativos.
-- Ejecutar una sola vez en Supabase → SQL Editor sobre un proyecto ya existente.
-- Instalaciones nuevas: usar supabase/schema.sql (ya incluye estos cambios).

-- 1) Nuevas categorías del enum
ALTER TYPE public.category_type ADD VALUE IF NOT EXISTS 'TAXES';
ALTER TYPE public.category_type ADD VALUE IF NOT EXISTS 'REFUNDS';

-- 2) Permitir montos negativos (Devoluciones)
-- Si el nombre del constraint difiere:
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'public.expenses'::regclass AND contype = 'c';
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_original_amount_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_original_amount_check
  CHECK (original_amount <> 0);

-- Verificación (opcional):
-- SELECT enumlabel FROM pg_enum e
-- JOIN pg_type t ON t.oid = e.enumtypid
-- WHERE t.typname = 'category_type'
-- ORDER BY e.enumsortorder;
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.expenses'::regclass
--   AND conname = 'expenses_original_amount_check';
