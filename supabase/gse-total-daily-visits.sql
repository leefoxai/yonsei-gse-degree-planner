-- Applied after gse-visitor-stats-setup.sql. Existing records are all from 2026-10-01.
alter table gse_analytics.visitors add column visit_days bigint not null default 1 check (visit_days >= 1);
create or replace function public.gse_record_visit(p_visitor_hash text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare d date := (current_timestamp at time zone 'Asia/Seoul')::date;
begin
 if p_visitor_hash is not null then
  if p_visitor_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid visitor'; end if;
  insert into gse_analytics.visitors (visitor_hash,first_day,last_day,visit_days)
  values (p_visitor_hash,d,d,1)
  on conflict (visitor_hash) do update
  set last_day = excluded.last_day, visit_days = gse_analytics.visitors.visit_days + 1
  where gse_analytics.visitors.last_day < excluded.last_day;
 end if;
 return jsonb_build_object('total',jsonb_build_object('uv',(select coalesce(sum(visit_days),0) from gse_analytics.visitors)),
 'today',jsonb_build_object('uv',(select count(*) from gse_analytics.visitors where last_day=d)),
 'date',d,'timezone','Asia/Seoul');
end $$;
revoke all on function public.gse_record_visit(text) from public, anon, authenticated;
grant execute on function public.gse_record_visit(text) to service_role;

