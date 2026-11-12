-- Un pago de Mercado Pago solo puede registrarse una vez por usuario,
-- aunque la app esté abierta en más de una ventana.
-- Ejecutar en el SQL Editor de Supabase.

create table if not exists public.mp_registered (
  user_id uuid not null references auth.users (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 8 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, external_id)
);

alter table public.mp_registered enable row level security;

create policy "mp_registered_select_own"
  on public.mp_registered for select
  using (auth.uid() = user_id);

create policy "mp_registered_insert_own"
  on public.mp_registered for insert
  with check (auth.uid() = user_id);

create policy "mp_registered_delete_own"
  on public.mp_registered for delete
  using (auth.uid() = user_id);
