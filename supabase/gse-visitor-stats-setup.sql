create schema gse_analytics;
revoke all on schema gse_analytics from public, anon, authenticated;
grant usage on schema gse_analytics to service_role;
create table gse_analytics.visitors (
 visitor_hash text primary key check (visitor_hash ~ '^[0-9a-f]{64}$'),
 first_day date not null,
 last_day date not null
);
create index visitors_last_day_idx on gse_analytics.visitors(last_day);
alter table gse_analytics.visitors enable row level security;
revoke all on gse_analytics.visitors from public, anon, authenticated;
grant select, insert, update on gse_analytics.visitors to service_role;
create function public.gse_record_visit(p_visitor_hash text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare d date := (current_timestamp at time zone 'Asia/Seoul')::date;
begin
 if p_visitor_hash is not null then
  if p_visitor_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid visitor'; end if;
  insert into gse_analytics.visitors values (p_visitor_hash,d,d)
  on conflict (visitor_hash) do update set last_day = greatest(gse_analytics.visitors.last_day, excluded.last_day)
  where gse_analytics.visitors.last_day < excluded.last_day;
 end if;
 return jsonb_build_object('total',jsonb_build_object('uv',(select count(*) from gse_analytics.visitors)),
 'today',jsonb_build_object('uv',(select count(*) from gse_analytics.visitors where last_day=d)),
 'date',d,'timezone','Asia/Seoul');
end $$;
revoke all on function public.gse_record_visit(text) from public, anon, authenticated;
grant execute on function public.gse_record_visit(text) to service_role;
