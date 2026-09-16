-- Ret forældet audit-trigger (stripe_secret_key/webhook findes ikke længere)
create or replace function public._log_platform_settings_changes()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_changed text[] := array[]::text[];
begin
  if coalesce(old.stripe_publishable_key,'') is distinct from coalesce(new.stripe_publishable_key,'') then
    v_changed := array_append(v_changed, 'publishable_key');
  end if;

  if array_length(v_changed, 1) > 0 then
    perform public._admin_log(
      'update_stripe_keys',
      'platform_settings',
      'Stripe-nøgler',
      jsonb_build_object('changed_fields', to_jsonb(v_changed))
    );
  end if;

  return new;
end;
$function$;

-- Test-fase notice + venteliste
alter table public.platform_settings
  add column if not exists beta_notice_enabled boolean not null default false,
  add column if not exists beta_notice_title text,
  add column if not exists beta_notice_body text;

update public.platform_settings
set beta_notice_enabled = true,
    beta_notice_title = coalesce(beta_notice_title, 'Vi er i testfase — vi åbner snart'),
    beta_notice_body = coalesce(beta_notice_body, 'Serviceydere bliver bygget færdig lige nu. Du er velkommen til at kigge rundt, men vi tager hverken imod kunder eller virksomheder endnu. Skriv din e-mail, så siger vi til den dag vi åbner. Intet andet, ingen reklamer.')
where id = 1;

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role_interest text not null default 'kunde',
  source text,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

grant select, insert, update, delete on public.beta_signups to authenticated;
grant all on public.beta_signups to service_role;

alter table public.beta_signups enable row level security;

drop policy if exists "Admins manage beta signups" on public.beta_signups;
create policy "Admins manage beta signups"
on public.beta_signups for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.join_beta_waitlist(p_email text, p_role text default 'kunde')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  insert into public.beta_signups (email, role_interest, source)
  values (v_email, case when p_role in ('kunde', 'virksomhed') then p_role else 'kunde' end, 'site-notice')
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_beta_waitlist(text, text) from public;
grant execute on function public.join_beta_waitlist(text, text) to anon, authenticated;

create or replace function public.public_beta_notice()
returns table (enabled boolean, title text, body text)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(s.beta_notice_enabled, false), s.beta_notice_title, s.beta_notice_body
  from public.platform_settings s
  where s.id = 1
$$;

revoke all on function public.public_beta_notice() from public;
grant execute on function public.public_beta_notice() to anon, authenticated;