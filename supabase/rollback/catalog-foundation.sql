-- MANUAL, REVIEWED DOWN MIGRATION. Never run automatically or with CASCADE.
-- Aborts if any catalog data or stored catalog images remain. Export first.
begin;
do $$ begin
 if exists(select 1 from public.catalog_products) or exists(select 1 from public.catalog_manufacturers) or exists(select 1 from public.catalog_suppliers) or exists(select 1 from public.catalog_sources) or exists(select 1 from public.catalog_import_batches) or exists(select 1 from storage.objects where bucket_id='catalog-media') then raise exception 'Rollback refused: catalog records/files exist. Preserve/export them and review a separate archival plan.';end if;
 if (select jsonb_object_agg(id,name) from public.catalog_categories) is distinct from '{"window-hardware": "Window Hardware", "window-parts": "Window Parts", "door-hardware": "Door Hardware", "door-parts": "Door Parts"}'::jsonb or (select jsonb_object_agg(id,jsonb_build_array(category_id,name)) from public.catalog_families) is distinct from '{"balances": ["window-parts", "Window balances"], "window-locks": ["window-hardware", "Window locks"], "operators": ["window-hardware", "Casement crank operators"], "rollers": ["door-parts", "Patio door rollers"], "patio-locks": ["door-hardware", "Patio door locks"], "handles": ["door-hardware", "Door handles"], "closers": ["door-parts", "Storm door closers"], "hinges": ["door-parts", "Hinges"], "screen-latches": ["door-hardware", "Screen door latches"], "track-fin-locks": ["window-hardware", "Sliding window track/fin locks"]}'::jsonb then raise exception 'Rollback refused: catalog taxonomy changed';end if;
end $$;
do $$ declare t text;pol record;begin
 foreach t in array array['catalog_manufacturers','catalog_suppliers','catalog_categories','catalog_families','catalog_sources','catalog_products','catalog_variants','catalog_identifiers','catalog_offers','catalog_dimensions','catalog_compatibility','catalog_media','catalog_purchase_arrangements','catalog_purchase_links','catalog_import_batches','catalog_import_items'] loop
  for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',pol.policyname,t);end loop;
 end loop;
end $$;
drop policy catalog_storage_read on storage.objects;
drop policy catalog_storage_insert on storage.objects;
drop policy catalog_storage_delete on storage.objects;
delete from storage.buckets where id='catalog-media';
drop function public.catalog_search(text,jsonb,integer,integer),public.catalog_document(uuid),public.catalog_hit(uuid),public.catalog_rollback_import(uuid),public.catalog_import(uuid,text,uuid,boolean,jsonb),public.catalog_transition(uuid,bigint,text),public.catalog_save_product(jsonb,uuid);
drop table public.catalog_import_items,public.catalog_purchase_links,public.catalog_purchase_arrangements,public.catalog_media,public.catalog_compatibility,public.catalog_dimensions,public.catalog_offers,public.catalog_identifiers;
drop table public.catalog_variants;
drop table public.catalog_products;
drop table public.catalog_import_batches;
drop table public.catalog_sources;
drop table public.catalog_families;
drop table public.catalog_categories;
drop table public.catalog_manufacturers;
drop table public.catalog_suppliers;
drop function public.catalog_guard_ownership(),public.catalog_touch_parent(),public.catalog_guard_product(),public.catalog_guard_relationship(),public.catalog_public_variant(uuid),public.catalog_public_product(uuid);
commit;
