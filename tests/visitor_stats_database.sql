-- Transaction rolls back all synthetic visits.
begin;
set local role service_role;
do $$
declare a jsonb; b jsonb; c jsonb; d date := (current_timestamp at time zone 'Asia/Seoul')::date;
 h text := repeat('d',64);
begin
 if exists(select 1 from gse_analytics.visitors where visitor_hash=h) then raise exception 'test hash already exists'; end if;
 a:=public.gse_record_visit(null);
 b:=public.gse_record_visit(h);
 if (b#>>'{total,uv}')::bigint <> (a#>>'{total,uv}')::bigint+1 then raise exception 'first visit total'; end if;
 if (b#>>'{today,uv}')::bigint <> (a#>>'{today,uv}')::bigint+1 then raise exception 'first visit today'; end if;
 c:=public.gse_record_visit(h);
 if b <> c then raise exception 'same-day duplicate'; end if;
 -- Model this browser having visited yesterday, while keeping its accumulated total.
 update gse_analytics.visitors set first_day=d-1,last_day=d-1 where visitor_hash=h;
 a:=public.gse_record_visit(null);
 b:=public.gse_record_visit(h);
 if (b#>>'{total,uv}')::bigint <> (a#>>'{total,uv}')::bigint+1 then raise exception 'returning next-day total'; end if;
 if (b#>>'{today,uv}')::bigint <> (a#>>'{today,uv}')::bigint+1 then raise exception 'returning next-day today'; end if;
 c:=public.gse_record_visit(h);
 if b <> c then raise exception 'next-day retry duplicate'; end if;
end $$;
rollback;
select public.gse_record_visit(null) as preserved_counts,
 has_function_privilege('anon','public.gse_record_visit(text)','EXECUTE') as anon_execute;

