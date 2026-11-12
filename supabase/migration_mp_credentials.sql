-- El Access Token de Mercado Pago queda atado al usuario que lo guardó.
-- La app no puede leerlo de vuelta. Solo la función del servidor, con el id de la sesión.
-- Ejecutar en el SQL Editor de Supabase.

create table if not exists public.mp_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null check (char_length(access_token) between 40 and 200),
  updated_at timestamptz not null default now()
);

alter table public.mp_credentials enable row level security;

create or replace function public.save_mp_access_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned text := trim(coalesce(p_token, ''));
begin
  if uid is null then
    raise exception 'Tenés que estar logueado.';
  end if;
  if cleaned !~ '^APP_USR-[A-Za-z0-9-]{20,180}$' then
    raise exception 'El Access Token tiene que ser el de tu aplicación y empezar con APP_USR-.';
  end if;

  insert into public.mp_credentials (user_id, access_token)
  values (uid, cleaned)
  on conflict (user_id) do update
    set access_token = excluded.access_token,
        updated_at = now();
end;
$$;

create or replace function public.has_mp_access_token()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1 from public.mp_credentials where user_id = auth.uid()
  );
end;
$$;

create or replace function public.clear_mp_access_token()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tenés que estar logueado.';
  end if;
  delete from public.mp_credentials where user_id = auth.uid();
end;
$$;

revoke all on function public.save_mp_access_token(text) from public;
revoke all on function public.has_mp_access_token() from public;
revoke all on function public.clear_mp_access_token() from public;

grant execute on function public.save_mp_access_token(text) to authenticated;
grant execute on function public.has_mp_access_token() to authenticated;
grant execute on function public.clear_mp_access_token() to authenticated;
