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
create type public.period_status as enum ('ACTIVE', 'CLOSED');
create type public.month_mode as enum ('AUTOMATIC', 'MANUAL');

-- Settings (una fila por usuario)
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  usd_white numeric(18, 6) not null default 1 check (usd_white > 0),
  usd_cash numeric(18, 6) not null default 1 check (usd_cash > 0),
  monthly_limit numeric(18, 2) not null default 1500 check (monthly_limit >= 0),
  custom_categories text[] not null default '{}',
  enabled_accounts text[] not null default array['WHITE', 'CASH']::text[],
  enabled_currencies text[] not null default array['USD', 'ARS']::text[],
  enabled_fixed_categories text[] not null default array[
    'SUPER','DELIVERY','AUTO','SALUD','SERVICIOS','NINA','SALIDAS','PELO','GYM','LIMPIEZA','TAXES','REFUNDS'
  ]::text[],
  month_mode public.month_mode not null default 'AUTOMATIC',
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Períodos mensuales
create table public.periods (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  year_month text not null,
  status public.period_status not null default 'ACTIVE',
  started_at timestamptz not null default now(),
  closed_at timestamptz null,
  monthly_limit_snapshot numeric(18, 2) null,
  constraint periods_year_month_format check (year_month ~ '^\d{4}-\d{2}$')
);

create unique index periods_one_active_per_user
  on public.periods (user_id)
  where status = 'ACTIVE';

create index periods_user_id_idx on public.periods (user_id);
create index periods_user_year_month_idx on public.periods (user_id, year_month desc);

-- Expenses (movimientos individuales; los acumulados se calculan en el cliente)
create table public.expenses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete restrict,
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
create index expenses_user_period_idx on public.expenses (user_id, period_id);
create index expenses_created_at_idx on public.expenses (user_id, created_at desc);

-- RLS
alter table public.settings enable row level security;
alter table public.periods enable row level security;
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

create policy "periods_select_own"
  on public.periods for select
  using (auth.uid() = user_id);

create policy "periods_insert_own"
  on public.periods for insert
  with check (auth.uid() = user_id);

create policy "periods_update_own"
  on public.periods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "periods_delete_own"
  on public.periods for delete
  using (auth.uid() = user_id);

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

-- Settings + período activo al crear usuario
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

  insert into public.periods (id, user_id, label, year_month, status, started_at)
  values (
    gen_random_uuid(),
    new.id,
    to_char(timezone('UTC', now()), 'TMMonth YYYY'),
    to_char(timezone('UTC', now()), 'YYYY-MM'),
    'ACTIVE',
    now()
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Importación atómica (reemplazo total)
create or replace function public.replace_user_accounts(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  settings_json jsonb;
  period_item jsonb;
  expense_item jsonb;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload inválido';
  end if;

  settings_json := payload->'settings';
  if settings_json is null or jsonb_typeof(settings_json) <> 'object' then
    raise exception 'Settings inválidas';
  end if;

  delete from public.expenses where user_id = uid;
  delete from public.periods where user_id = uid;

  insert into public.settings (
    user_id,
    usd_white,
    usd_cash,
    monthly_limit,
    custom_categories,
    enabled_accounts,
    enabled_currencies,
    enabled_fixed_categories,
    month_mode,
    onboarding_completed,
    updated_at
  ) values (
    uid,
    coalesce((settings_json->>'usdWhite')::numeric, 1),
    coalesce((settings_json->>'usdCash')::numeric, 1),
    coalesce((settings_json->>'monthlyLimit')::numeric, 1500),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(settings_json->'customCategories', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(settings_json->'enabledAccounts', '["WHITE","CASH"]'::jsonb))),
      array['WHITE','CASH']::text[]
    ),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(settings_json->'enabledCurrencies', '["USD","ARS"]'::jsonb))),
      array['USD','ARS']::text[]
    ),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(settings_json->'enabledFixedCategories', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce((settings_json->>'monthMode')::public.month_mode, 'AUTOMATIC'),
    coalesce((settings_json->>'onboardingCompleted')::boolean, true),
    now()
  )
  on conflict (user_id) do update set
    usd_white = excluded.usd_white,
    usd_cash = excluded.usd_cash,
    monthly_limit = excluded.monthly_limit,
    custom_categories = excluded.custom_categories,
    enabled_accounts = excluded.enabled_accounts,
    enabled_currencies = excluded.enabled_currencies,
    enabled_fixed_categories = excluded.enabled_fixed_categories,
    month_mode = excluded.month_mode,
    onboarding_completed = excluded.onboarding_completed,
    updated_at = excluded.updated_at;

  for period_item in
    select * from jsonb_array_elements(coalesce(payload->'periods', '[]'::jsonb))
  loop
    insert into public.periods (
      id, user_id, label, year_month, status, started_at, closed_at, monthly_limit_snapshot
    ) values (
      (period_item->>'id')::uuid,
      uid,
      period_item->>'label',
      period_item->>'yearMonth',
      (period_item->>'status')::public.period_status,
      coalesce((period_item->>'startedAt')::timestamptz, now()),
      case
        when period_item->>'closedAt' is null or period_item->>'closedAt' = 'null'
          then null
        else (period_item->>'closedAt')::timestamptz
      end,
      case
        when period_item->>'monthlyLimitSnapshot' is null or period_item->>'monthlyLimitSnapshot' = 'null'
          then null
        else (period_item->>'monthlyLimitSnapshot')::numeric
      end
    );
  end loop;

  for expense_item in
    select * from jsonb_array_elements(coalesce(payload->'expenses', '[]'::jsonb))
  loop
    insert into public.expenses (
      id, user_id, period_id, account_type, category, description,
      original_currency, original_amount, exchange_rate, usd_amount, created_at, updated_at
    ) values (
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
  end loop;
end;
$$;

revoke all on function public.replace_user_accounts(jsonb) from public;
grant execute on function public.replace_user_accounts(jsonb) to authenticated;
