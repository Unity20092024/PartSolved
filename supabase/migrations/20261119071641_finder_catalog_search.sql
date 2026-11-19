-- Depends on PR #14's catalog foundation. Read-only, security invoker, no policy/data changes.
begin;
create function public.catalog_find(p_number text default '',p_brand text default '',p_families text[] default '{}',p_words text[] default '{}',p_measurements jsonb default '[]',p_limit integer default 3,p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='5s' as $$
declare result jsonb;m jsonb;lookup_number text:=regexp_replace(upper(p_number),'[^A-Z0-9]','','g');
begin
 if p_number is null or p_brand is null or p_families is null or p_words is null or p_measurements is null or p_limit is null or p_offset is null or length(p_number)>80 or length(p_brand)>120 or cardinality(p_families)>10 or cardinality(p_words)>8 or p_limit not between 1 and 12 or p_offset not between 0 and 600 or jsonb_typeof(p_measurements)<>'array' or octet_length(p_measurements::text)>4000 then raise exception 'Invalid bounded Finder search';end if;
 if jsonb_array_length(p_measurements)>20 or exists(select 1 from unnest(p_words) w where w is null or w !~ '^[a-z]{3,30}$') or exists(select 1 from unnest(p_families) f where f is null or length(f)>50) then raise exception 'Invalid search evidence';end if;
 for m in select value from jsonb_array_elements(p_measurements) loop
  if jsonb_typeof(m)<>'object' or coalesce(m->>'key','') !~ '^[a-z0-9-]{1,60}$' or coalesce(m->>'unit','') not in ('in','mm') or jsonb_typeof(m->'value') is distinct from 'number' or (m->>'value')::numeric<=0 or (m->>'value')::numeric>1000000 then raise exception 'Invalid measurement';end if;
 end loop;
 with evidence as (
  select p.id product_id,v.id variant_id,p.title,
   exists(select 1 from public.catalog_identifiers n where n.variant_id=v.id and n.kind='manufacturer' and n.source_id is not null and n.verified_at is not null and p_number<>'' and n.exact_number=upper(btrim(p_number))) exact_mpn,
   exists(select 1 from public.catalog_offers o where o.variant_id=v.id and o.source_id is not null and o.verified_at is not null and p_number<>'' and o.exact_sku=upper(btrim(p_number))) exact_sku,
   exists(select 1 from public.catalog_identifiers n where n.variant_id=v.id and n.kind='alternate' and n.source_id is not null and n.verified_at is not null and p_number<>'' and n.exact_number=upper(btrim(p_number))) alternate,
   (exists(select 1 from public.catalog_identifiers n where n.variant_id=v.id and n.source_id is not null and n.verified_at is not null and lookup_number<>'' and n.normalized_number=lookup_number) or exists(select 1 from public.catalog_offers o where o.variant_id=v.id and o.source_id is not null and o.verified_at is not null and lookup_number<>'' and o.normalized_sku=lookup_number)) normalized,
   (p_brand<>'' and lower(btrim(mf.name))=lower(btrim(p_brand))) brand_match,
   (p.family_id=any(p_families)) family_match,
   array(select w from unnest(p_words) w where position(w in lower(p.title||' '||p.description))>0) word_matches,
   (select count(*) from public.catalog_dimensions d join jsonb_array_elements(p_measurements) q on d.key=q->>'key' where d.variant_id=v.id and d.source_id is not null and d.verified_at is not null and abs(d.mm-(q->>'value')::numeric*(case when q->>'unit'='in' then 25.4 else 1 end))<=0.000001) measurement_agreements
  from public.catalog_products p join public.catalog_variants v on v.product_id=p.id join public.catalog_manufacturers mf on mf.id=p.manufacturer_id
  where p.status='published' and not p.synthetic and p.source_id is not null and p.verified_at is not null and v.source_id is not null and v.verified_at is not null
 ), scored as (
  select *,case when exact_mpn then 0 when exact_sku then 1 when brand_match and family_match then 2 else 3 end tier,
   case when normalized then 0 when alternate then 1 when family_match then 2 when brand_match then 3 else 4 end secondary
  from evidence where exact_mpn or exact_sku or normalized or alternate or family_match or (cardinality(p_families)=0 and (brand_match or cardinality(word_matches)>0))
 ),deduplicated as (
  select *,row_number() over(partition by product_id order by tier,secondary,brand_match desc,family_match desc,measurement_agreements desc,variant_id) rn from scored
 ),chosen as (select * from deduplicated where rn=1),page as (
  select * from chosen order by tier,secondary,brand_match desc,family_match desc,measurement_agreements desc,cardinality(word_matches) desc,title,product_id limit p_limit offset p_offset
 )
 select jsonb_build_object('total',(select count(*) from chosen),'rows',coalesce((select jsonb_agg(jsonb_build_object('hit',public.catalog_hit(variant_id),'tier',tier,'normalized',normalized,'alternate',alternate,'brand_match',brand_match,'family_match',family_match,'word_matches',word_matches) order by tier,secondary,brand_match desc,family_match desc,measurement_agreements desc,cardinality(word_matches) desc,title,product_id) from page),'[]')) into result;
 return result;
end $$;
revoke all on function public.catalog_find(text,text,text[],text[],jsonb,integer,integer) from public,anon,authenticated;
grant execute on function public.catalog_find(text,text,text[],text[],jsonb,integer,integer) to anon,authenticated;
commit;
