-- Cotización personalizada opcional por movimiento (gastos mensuales y de viaje).

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS custom_exchange_rate numeric(18, 6) NULL
  CHECK (custom_exchange_rate IS NULL OR custom_exchange_rate > 0);

ALTER TABLE public.trip_expenses
  ADD COLUMN IF NOT EXISTS custom_exchange_rate numeric(18, 6) NULL
  CHECK (custom_exchange_rate IS NULL OR custom_exchange_rate > 0);
