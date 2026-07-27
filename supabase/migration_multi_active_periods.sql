-- Migración: permitir avanzar meses hacia adelante sin cerrar el mes actual.
-- Ejecutar una sola vez en Supabase → SQL Editor.
--
-- Motivo: para poder "adelantar" un mes (crear el período siguiente y
-- registrar gastos ahí) sin cerrar el período activo actual, tiene que
-- poder existir más de un período con status ACTIVE al mismo tiempo por
-- usuario: el período "real" en curso + el/los período/s adelantado/s.
--
-- El aislamiento de datos sigue garantizado porque cada gasto (`expenses`)
-- tiene su propio `period_id`, y la app siempre filtra por el período
-- seleccionado: los gastos cargados por adelantado en un mes futuro nunca
-- se mezclan con los de meses anteriores.
--
-- El período "real" (el que se muestra por defecto al abrir la app) sigue
-- siendo siempre el ACTIVE con el `year_month` más antiguo.

DROP INDEX IF EXISTS public.periods_one_active_per_user;
