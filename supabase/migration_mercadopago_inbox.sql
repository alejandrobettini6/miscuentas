-- Bandeja de avisos de Mercado Pago.
-- El teléfono deja el texto de la notificación. La app lo lee con el token.
-- Ejecutar en el SQL Editor de Supabase.

create table if not exists public.mp_ingest_tokens (
  token text primary key check (token ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.mp_inbox (
  id uuid primary key default gen_random_uuid(),
  token text not null references public.mp_ingest_tokens (token) on delete cascade,
  external_id text not null check (char_length(external_id) between 8 and 120),
  title text not null default '' check (char_length(title) <= 180),
  body text not null default '' check (char_length(body) <= 500),
  posted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (token, external_id)
);

alter table public.mp_ingest_tokens enable row level security;
alter table public.mp_inbox enable row level security;

create or replace function public.register_mp_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid token';
  end if;
  insert into public.mp_ingest_tokens (token)
  values (p_token)
  on conflict (token) do nothing;
end;
$$;

create or replace function public.ingest_mp_notification(
  p_token text,
  p_external_id text,
  p_title text,
  p_body text,
  p_posted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid token';
  end if;
  if p_external_id is null or char_length(p_external_id) < 8 or char_length(p_external_id) > 120 then
    raise exception 'invalid id';
  end if;
  if coalesce(char_length(p_title), 0) > 180 or coalesce(char_length(p_body), 0) > 500 then
    raise exception 'payload too large';
  end if;
  if not exists (select 1 from public.mp_ingest_tokens where token = p_token) then
    raise exception 'invalid token';
  end if;

  insert into public.mp_inbox (token, external_id, title, body, posted_at)
  values (
    p_token,
    p_external_id,
    left(coalesce(p_title, ''), 180),
    left(coalesce(p_body, ''), 500),
    coalesce(p_posted_at, now())
  )
  on conflict (token, external_id) do nothing;
end;
$$;

create or replace function public.list_mp_inbox(p_token text)
returns table (
  id uuid,
  external_id text,
  title text,
  body text,
  posted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid token';
  end if;
  return query
  select i.id, i.external_id, i.title, i.body, i.posted_at
  from public.mp_inbox i
  where i.token = p_token
    and i.status = 'pending'
  order by i.posted_at asc
  limit 30;
end;
$$;

create or replace function public.ack_mp_inbox(
  p_token text,
  p_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid token';
  end if;
  if p_status not in ('applied', 'dismissed') then
    raise exception 'invalid status';
  end if;
  update public.mp_inbox
  set status = p_status
  where id = p_id
    and token = p_token
    and status = 'pending';
end;
$$;

revoke all on function public.register_mp_token(text) from public;
revoke all on function public.ingest_mp_notification(text, text, text, text, timestamptz) from public;
revoke all on function public.list_mp_inbox(text) from public;
revoke all on function public.ack_mp_inbox(text, uuid, text) from public;

grant execute on function public.register_mp_token(text) to anon, authenticated;
grant execute on function public.ingest_mp_notification(text, text, text, text, timestamptz) to anon, authenticated;
grant execute on function public.list_mp_inbox(text) to anon, authenticated;
grant execute on function public.ack_mp_inbox(text, uuid, text) to anon, authenticated;
