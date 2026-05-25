
-- ─────────────────────────────────────────────────────────
-- L4: Idempotency claims + duplicate-detection (Rutekalender 2.0)
-- ─────────────────────────────────────────────────────────

create table if not exists public.route_mutation_claims (
  key text primary key,
  kind text not null,
  business_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_route_mutation_claims_created
  on public.route_mutation_claims (created_at);

alter table public.route_mutation_claims enable row level security;

-- Klienten må aldrig læse/skrive direkte — vi går altid gennem RPC'en.
-- Vi giver kun adgang via security-definer-funktioner.
create policy "no direct access claims"
  on public.route_mutation_claims for select using (false);

-- ── Try-claim: insert with on-conflict-do-nothing returning the inserted key
create or replace function public.try_claim_route_mutation(_key text, _kind text, _business_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
begin
  if _key is null or length(_key) < 8 then
    return true; -- fail-open ved ugyldige nøgler — ingen lås
  end if;
  insert into public.route_mutation_claims (key, kind, business_id)
  values (_key, _kind, _business_id)
  on conflict (key) do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end;
$$;

grant execute on function public.try_claim_route_mutation(text, text, uuid) to authenticated;

-- ── Periodisk oprydning ──
create or replace function public.cleanup_route_mutation_claims()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  delete from public.route_mutation_claims
   where created_at < now() - interval '24 hours';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- ── Daglig dublet-scanner ──
-- Finder stops på samme dag for samme business hvor en (customer, address)
-- eller en (order_id) optræder mere end én gang. Logger en advarsel i
-- route_audit_log så ejeren/admin kan rydde op.
create or replace function public.detect_route_duplicates()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int := 0;
begin
  -- Order-id dubletter (samme ordre planlagt to gange samme dag)
  with dups as (
    select r.business_id, r.route_date, s.order_id,
           array_agg(s.id) as stop_ids, count(*) as cnt
      from public.route_stops s
      join public.routes r on r.id = s.route_id
     where s.order_id is not null
       and r.route_date >= current_date - interval '30 days'
     group by r.business_id, r.route_date, s.order_id
    having count(*) > 1
  ), ins as (
    insert into public.route_audit_log
      (business_id, action, scope, affected_count, after_data)
    select d.business_id,
           'duplicate_detected',
           'order_same_day',
           d.cnt,
           jsonb_build_object(
             'route_date', d.route_date,
             'order_id', d.order_id,
             'stop_ids', d.stop_ids,
             'severity', 'warning'
           )
      from dups d
      -- undgå at logge samme fund flere gange på samme dag
      where not exists (
        select 1 from public.route_audit_log a
         where a.business_id = d.business_id
           and a.action = 'duplicate_detected'
           and a.created_at::date = current_date
           and a.after_data->>'order_id' = d.order_id::text
           and (a.after_data->>'route_date') = d.route_date::text
      )
    returning 1
  )
  select count(*) into inserted from ins;
  return inserted;
end;
$$;

grant execute on function public.detect_route_duplicates() to authenticated;
