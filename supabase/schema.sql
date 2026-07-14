-- MisCuentas — Schema inicial + RLS
-- Ejecutar en Supabase SQL Editor cuando configures el backend desde cero.

-- Enums
create type public.account_type as enum ('WHITE', 'CASH');
create type public.currency_type as enum ('USD', 'ARS');
create type public.category_type as enum (
  'SUPER',
  'DELIVERY',
  'AUTO',
  'SALUD',
  'SERVICIOS',
  'NINA',
  'SALIDAS',
  'PELO',
  'GYM',
  'LIMPIEZA',
  'TAXES',
  'REFUNDS',
  'OTHER'
);

-- Settings (una fila por usuario)
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  usd_white numeric(18, 6) not null default 1 check (usd_white > 0),
  usd_cash numeric(18, 6) not null default 1 check (usd_cash > 0),
  monthly_limit numeric(18, 2) not null default 1500 check (monthly_limit >= 0),
  updated_at timestamptz not null default now()
);

-- Expenses (movimientos individuales; los acumulados se calculan en el cliente)
create table public.expenses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_type public.account_type not null,
  category public.category_type not null,
  description text null,
  original_currency public.currency_type not null,
  original_amount numeric(18, 2) not null check (original_amount <> 0),
  exchange_rate numeric(18, 6) not null check (exchange_rate > 0),
  usd_amount numeric(18, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_id_idx on public.expenses (user_id);
create index expenses_user_account_idx on public.expenses (user_id, account_type);
create index expenses_created_at_idx on public.expenses (user_id, created_at desc);

-- RLS
alter table public.settings enable row level security;
alter table public.expenses enable row level security;

create policy "settings_select_own"
  on public.settings for select
  using (auth.uid() = user_id);

create policy "settings_insert_own"
  on public.settings for insert
  with check (auth.uid() = user_id);

create policy "settings_update_own"
  on public.settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses_select_own"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "expenses_insert_own"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "expenses_update_own"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses_delete_own"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- Settings por defecto al crear usuario (opcional)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
