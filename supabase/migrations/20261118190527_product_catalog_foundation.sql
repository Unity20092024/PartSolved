-- CANDIDATE ONLY. Owner approval is required before any shared Supabase application.
-- Adds catalog-prefixed objects only; reuses existing verified blog administrator membership.
-- Taxonomy is existing PartSolved navigation metadata, NOT supplier/product inventory.
begin;
create table public.catalog_manufacturers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100)
);
create table public.catalog_suppliers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
 website_url text not null default '' check(website_url='' or (website_url ~ '^https://[^/@[:space:]]+' and length(website_url)<=2048))
);
create table public.catalog_categories (id text primary key, name text not null);
create table public.catalog_families (id text primary key, category_id text not null references public.catalog_categories(id), name text not null);
create index catalog_families_category_idx on public.catalog_families(category_id);
create table public.catalog_sources (
 id uuid primary key default gen_random_uuid(), reference text not null check(length(btrim(reference)) between 1 and 500),
 evidence_url text not null default '' check(evidence_url='' or (evidence_url ~ '^https://[^/@[:space:]]+' and length(evidence_url)<=2048)),
 verified_at timestamptz check(verified_at<=now())
);
create table public.catalog_import_batches (
 id uuid primary key, payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 source_id uuid not null references public.catalog_sources(id), synthetic boolean not null default true,
 status text not null default 'running' check(status in ('running','committed','rolled_back')),
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), rolled_back_at timestamptz
);
create table public.catalog_products (
 id uuid primary key, manufacturer_id uuid references public.catalog_manufacturers(id), family_id text not null references public.catalog_families(id),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
 title text not null check(length(btrim(title)) between 1 and 200), description text not null default '' check(length(description)<=10000),
 source_id uuid references public.catalog_sources(id), verified_at timestamptz check(verified_at<=now()),
 status text not null default 'draft' check(status in ('draft','review','published','archived')),
 synthetic boolean not null default true, revision bigint not null default 1 check(revision>0),
 import_batch_id uuid references public.catalog_import_batches(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'published' or (not synthetic and manufacturer_id is not null and source_id is not null and verified_at is not null)),
 check(verified_at is null or source_id is not null)
);
create index catalog_products_family_idx on public.catalog_products(family_id);
create index catalog_products_manufacturer_idx on public.catalog_products(manufacturer_id);
create index catalog_products_source_idx on public.catalog_products(source_id);
create index catalog_products_batch_idx on public.catalog_products(import_batch_id);
create index catalog_products_public_idx on public.catalog_products(updated_at,id) where status='published' and not synthetic;
create table public.catalog_variants (
 id uuid primary key, product_id uuid not null references public.catalog_products(id) on delete cascade,
 key text not null check(length(btrim(key)) between 1 and 80), finish text not null default '' check(length(finish)<=80),
 color text not null default '' check(length(color)<=80), material text not null default '' check(length(material)<=80),
 handedness text not null default 'unknown' check(handedness in ('unknown','left','right','non-handed')),
 source_id uuid references public.catalog_sources(id), verified_at timestamptz check(verified_at<=now()),
 unique(product_id,key), check(verified_at is null or source_id is not null)
);
create index catalog_variants_source_idx on public.catalog_variants(source_id);
create table public.catalog_identifiers (
 id uuid primary key, variant_id uuid not null references public.catalog_variants(id) on delete cascade,
 manufacturer_id uuid not null references public.catalog_manufacturers(id), kind text not null check(kind in ('manufacturer','alternate')),
 value text not null check(value ~ '^[A-Za-z0-9 ._/#()+-]{1,80}$' and value ~ '[A-Za-z0-9]'),
 exact_number text generated always as (upper(btrim(value))) stored,
 normalized_number text generated always as (regexp_replace(upper(value),'[^A-Z0-9]','','g')) stored,
 source_id uuid references public.catalog_sources(id), verified_at timestamptz check(verified_at<=now()),
 unique(manufacturer_id,exact_number), check(verified_at is null or source_id is not null)
);
create index catalog_identifiers_variant_idx on public.catalog_identifiers(variant_id);
create index catalog_identifiers_normalized_idx on public.catalog_identifiers(normalized_number);
create index catalog_identifiers_exact_idx on public.catalog_identifiers(exact_number);
create index catalog_identifiers_source_idx on public.catalog_identifiers(source_id);
create table public.catalog_offers (
 id uuid primary key, variant_id uuid not null references public.catalog_variants(id) on delete cascade,
 supplier_id uuid not null references public.catalog_suppliers(id), sku text not null check(sku ~ '^[A-Za-z0-9 ._/#()+-]{1,80}$' and sku ~ '[A-Za-z0-9]'),
 exact_sku text generated always as (upper(btrim(sku))) stored,
 normalized_sku text generated always as (regexp_replace(upper(sku),'[^A-Z0-9]','','g')) stored,
 availability text not null default 'unknown' check(availability in ('unknown','available','unavailable','discontinued')),
 source_id uuid references public.catalog_sources(id), verified_at timestamptz check(verified_at<=now()),
 unique(id,supplier_id),unique(supplier_id,exact_sku),check(verified_at is null or source_id is not null)
);
create index catalog_offers_variant_idx on public.catalog_offers(variant_id);
create index catalog_offers_exact_idx on public.catalog_offers(exact_sku);
create index catalog_offers_normalized_idx on public.catalog_offers(normalized_sku);
create index catalog_offers_source_idx on public.catalog_offers(source_id);
create table public.catalog_dimensions (
 id uuid primary key, variant_id uuid not null references public.catalog_variants(id) on delete cascade,
 key text not null check(key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(key)<=80), label text not null check(length(btrim(label)) between 1 and 100),
 value numeric not null check(value>0 and value<=1000000), unit text not null check(unit in ('in','mm')),
 mm numeric generated always as (case when unit='in' then value*25.4 else value end) stored,
 source_id uuid references public.catalog_sources(id), verified_at timestamptz check(verified_at<=now()),
 unique(variant_id,key), check(verified_at is null or source_id is not null)
);
create index catalog_dimensions_filter_idx on public.catalog_dimensions(key,mm,variant_id) where verified_at is not null;
create index catalog_dimensions_source_idx on public.catalog_dimensions(source_id);
create table public.catalog_compatibility (
 id uuid primary key, variant_id uuid not null references public.catalog_variants(id) on delete cascade,
 target_variant_id uuid references public.catalog_variants(id) on delete restrict,
 statement text not null check(length(btrim(statement)) between 1 and 2000),
 source_id uuid references public.catalog_sources(id), verified_at timestamptz check(verified_at<=now()),
 check(verified_at is null or source_id is not null),check(target_variant_id is distinct from variant_id)
);
create index catalog_compatibility_variant_idx on public.catalog_compatibility(variant_id);
create index catalog_compatibility_target_idx on public.catalog_compatibility(target_variant_id);
create index catalog_compatibility_source_idx on public.catalog_compatibility(source_id);
create table public.catalog_media (
 id uuid primary key, product_id uuid not null references public.catalog_products(id) on delete cascade,
 variant_id uuid references public.catalog_variants(id) on delete restrict,
 kind text not null check(kind in ('photo','drawing')), path text not null unique check(path ~ '^[a-f0-9-]{36}\.webp$'),
 alt text not null check(length(btrim(alt)) between 1 and 300), attribution text not null default '' check(length(attribution)<=1000),
 rights_reference text not null check(length(btrim(rights_reference)) between 1 and 1000),
 permission text not null default 'pending' check(permission in ('pending','approved','revoked')),
 state text not null default 'uploading' check(state in ('uploading','ready','failed')),
 width integer not null check(width between 1 and 2000),height integer not null check(height between 1 and 2000),bytes integer not null check(bytes between 1 and 2097152),
 source_id uuid references public.catalog_sources(id),verified_at timestamptz check(verified_at<=now()),
 check(permission<>'approved' or (source_id is not null and verified_at is not null)),check(verified_at is null or source_id is not null)
);
create index catalog_media_product_idx on public.catalog_media(product_id);
create index catalog_media_variant_idx on public.catalog_media(variant_id);
create index catalog_media_source_idx on public.catalog_media(source_id);
create table public.catalog_purchase_arrangements (
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references public.catalog_suppliers(id),
 type text not null check(type in ('direct','affiliate')),status text not null default 'unconfirmed' check(status in ('unconfirmed','approved','revoked')),
 reference text not null check(length(btrim(reference)) between 1 and 1000), network text not null default '' check(length(network)<=100),
 source_id uuid references public.catalog_sources(id),verified_at timestamptz check(verified_at<=now()),
 unique(id,supplier_id),check(status<>'approved' or(source_id is not null and verified_at is not null))
);
create index catalog_arrangements_supplier_idx on public.catalog_purchase_arrangements(supplier_id);
create index catalog_arrangements_source_idx on public.catalog_purchase_arrangements(source_id);
create table public.catalog_purchase_links (
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references public.catalog_suppliers(id),offer_id uuid not null unique references public.catalog_offers(id) on delete cascade,
 arrangement_id uuid not null references public.catalog_purchase_arrangements(id),url text not null check(url ~ '^https://[^/@[:space:]]+' and length(url)<=2048 and url !~* '(test|sandbox|checkout|cart)'),
 approved boolean not null default false,tracking_reference text not null default '' check(length(tracking_reference)<=500),
 source_id uuid references public.catalog_sources(id),verified_at timestamptz check(verified_at<=now()),
 foreign key(offer_id,supplier_id) references public.catalog_offers(id,supplier_id),
 foreign key(arrangement_id,supplier_id) references public.catalog_purchase_arrangements(id,supplier_id),
 check(not approved or(source_id is not null and verified_at is not null))
);
create index catalog_purchase_links_supplier_idx on public.catalog_purchase_links(supplier_id);
create index catalog_purchase_links_arrangement_idx on public.catalog_purchase_links(arrangement_id);
create index catalog_purchase_links_source_idx on public.catalog_purchase_links(source_id);
-- Audit IDs deliberately survive safe rollback; do not cascade away import history.
create table public.catalog_import_items (
 batch_id uuid not null references public.catalog_import_batches(id),product_id uuid not null,expected_revision bigint not null,document_hash text not null,primary key(batch_id,product_id)
);
create index catalog_import_items_product_idx on public.catalog_import_items(product_id);

-- Security invoker helpers never elevate privileges or rely on user_metadata.
create function public.catalog_public_product(p_id uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.catalog_products where id=p_id and status='published' and not synthetic and source_id is not null and verified_at is not null);
$$;
create function public.catalog_public_variant(p_id uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.catalog_variants v where v.id=p_id and v.source_id is not null and v.verified_at is not null and public.catalog_public_product(v.product_id));
$$;
do $$ declare t text;begin
 foreach t in array array['catalog_manufacturers','catalog_suppliers','catalog_categories','catalog_families','catalog_sources','catalog_products','catalog_variants','catalog_identifiers','catalog_offers','catalog_dimensions','catalog_compatibility','catalog_media','catalog_purchase_arrangements','catalog_purchase_links','catalog_import_batches','catalog_import_items'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy catalog_administrator on public.%I for all to authenticated using ((select public.blog_is_admin())) with check ((select public.blog_is_admin()))',t);
 end loop;
end $$;
-- Taxonomy is presentation metadata. There are no manufacturer/supplier/product seeds.
create policy catalog_public on public.catalog_categories for select to anon,authenticated using(true);
create policy catalog_public on public.catalog_families for select to anon,authenticated using(true);
create policy catalog_public on public.catalog_products for select to anon,authenticated using(status='published' and not synthetic and verified_at is not null and source_id is not null);
create policy catalog_public on public.catalog_variants for select to anon,authenticated using(source_id is not null and verified_at is not null and public.catalog_public_product(product_id));
create policy catalog_public on public.catalog_identifiers for select to anon,authenticated using(source_id is not null and verified_at is not null and public.catalog_public_variant(variant_id));
create policy catalog_public on public.catalog_offers for select to anon,authenticated using(source_id is not null and verified_at is not null and public.catalog_public_variant(variant_id));
create policy catalog_public on public.catalog_dimensions for select to anon,authenticated using(source_id is not null and verified_at is not null and public.catalog_public_variant(variant_id));
create policy catalog_public on public.catalog_compatibility for select to anon,authenticated using(source_id is not null and verified_at is not null and public.catalog_public_variant(variant_id) and (target_variant_id is null or public.catalog_public_variant(target_variant_id)));
create policy catalog_public on public.catalog_media for select to anon,authenticated using(state='ready' and permission='approved' and source_id is not null and verified_at is not null and public.catalog_public_product(product_id) and (variant_id is null or public.catalog_public_variant(variant_id)));
create policy catalog_public on public.catalog_manufacturers for select to anon,authenticated using(exists(select 1 from public.catalog_products p where p.manufacturer_id=catalog_manufacturers.id and public.catalog_public_product(p.id)));
create policy catalog_public on public.catalog_suppliers for select to anon,authenticated using(exists(select 1 from public.catalog_offers o where o.supplier_id=catalog_suppliers.id and public.catalog_public_variant(o.variant_id) and o.verified_at is not null));
create policy catalog_public on public.catalog_sources for select to anon,authenticated using(
 exists(select 1 from public.catalog_products p where p.source_id=catalog_sources.id and public.catalog_public_product(p.id)) or
 exists(select 1 from public.catalog_variants v where v.source_id=catalog_sources.id and public.catalog_public_variant(v.id)) or
 exists(select 1 from public.catalog_dimensions d where d.source_id=catalog_sources.id and d.verified_at is not null and public.catalog_public_variant(d.variant_id)) or
 exists(select 1 from public.catalog_identifiers n where n.source_id=catalog_sources.id and n.verified_at is not null and public.catalog_public_variant(n.variant_id)) or
 exists(select 1 from public.catalog_compatibility c where c.source_id=catalog_sources.id and c.verified_at is not null and public.catalog_public_variant(c.variant_id)) or
 exists(select 1 from public.catalog_offers o where o.source_id=catalog_sources.id and o.verified_at is not null and public.catalog_public_variant(o.variant_id)) or
 exists(select 1 from public.catalog_media m where m.source_id=catalog_sources.id and m.permission='approved' and m.state='ready' and public.catalog_public_product(m.product_id))
);
grant select on public.catalog_categories,public.catalog_families,public.catalog_products,public.catalog_variants,public.catalog_identifiers,public.catalog_offers,public.catalog_dimensions,public.catalog_compatibility,public.catalog_media,public.catalog_manufacturers,public.catalog_suppliers,public.catalog_sources to anon;
-- Purchasing records remain private in this foundation. A future reviewed projection
-- may expose approved links. No checkout, invented links or unapproved public URL.

create function public.catalog_guard_product() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then new.revision:=greatest(new.revision,old.revision+1);new.updated_at:=now();end if;
 if TG_OP='UPDATE' and old.synthetic and not new.synthetic then raise exception 'Synthetic records cannot be relabeled as real';end if;
 if new.status='published' then
  if new.synthetic or new.manufacturer_id is null or new.source_id is null or new.verified_at is null then raise exception 'Publication requires real, sourced, verified product information';end if;
  if not exists(select 1 from public.catalog_variants v where v.product_id=new.id and v.source_id is not null and v.verified_at is not null and
   (exists(select 1 from public.catalog_identifiers n where n.variant_id=v.id and n.source_id is not null and n.verified_at is not null) or exists(select 1 from public.catalog_offers o where o.variant_id=v.id and o.source_id is not null and o.verified_at is not null))) then raise exception 'Verify at least one variant and recorded identifier before publication';end if;
 end if;return new;
end $$;
create trigger catalog_product_guard before insert or update on public.catalog_products for each row execute function public.catalog_guard_product();
create function public.catalog_guard_relationship() returns trigger language plpgsql security invoker set search_path='' as $$
declare parent_manufacturer uuid;parent_product uuid;
begin
 if TG_TABLE_NAME='catalog_identifiers' then
  select p.manufacturer_id into parent_manufacturer from public.catalog_variants v join public.catalog_products p on p.id=v.product_id where v.id=new.variant_id;
  if parent_manufacturer is distinct from new.manufacturer_id then raise exception 'Manufacturer number belongs to a different manufacturer';end if;
 elsif TG_TABLE_NAME='catalog_media' and new.variant_id is not null then
  select product_id into parent_product from public.catalog_variants where id=new.variant_id;
  if parent_product is distinct from new.product_id then raise exception 'Image variant belongs to a different product';end if;
 end if;return new;
end $$;
create trigger catalog_identifier_guard before insert or update on public.catalog_identifiers for each row execute function public.catalog_guard_relationship();
create trigger catalog_media_guard before insert or update on public.catalog_media for each row execute function public.catalog_guard_relationship();

create function public.catalog_guard_ownership() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_TABLE_NAME in ('catalog_variants','catalog_media') then
  if old.product_id is distinct from new.product_id then raise exception 'Catalog records cannot be moved between products; create a reviewed record instead';end if;
 else
  if old.variant_id is distinct from new.variant_id then raise exception 'Catalog records cannot be moved between variants; create a reviewed record instead';end if;
 end if;return new;
end $$;
revoke all on function public.catalog_guard_ownership() from public,anon;
do $$ declare t text;begin
 foreach t in array array['catalog_variants','catalog_identifiers','catalog_offers','catalog_dimensions','catalog_compatibility','catalog_media'] loop
  execute format('create trigger catalog_immutable_owner before update on public.%I for each row execute function public.catalog_guard_ownership()',t);
 end loop;
end $$;

create function public.catalog_touch_parent() returns trigger language plpgsql security invoker set search_path='' as $$
declare pid uuid;vid uuid;
begin
 if TG_TABLE_NAME in ('catalog_variants','catalog_media') then
  if TG_OP='DELETE' then pid:=old.product_id;else pid:=new.product_id;end if;
 else
  if TG_OP='DELETE' then vid:=old.variant_id;else vid:=new.variant_id;end if;
  select product_id into pid from public.catalog_variants where id=vid;
 end if;
 if pid is not null then update public.catalog_products set revision=revision+1,updated_at=now(),status='draft' where id=pid;end if;
 return null;
end $$;
revoke all on function public.catalog_touch_parent() from public,anon;
do $$ declare t text;begin
 foreach t in array array['catalog_variants','catalog_identifiers','catalog_offers','catalog_dimensions','catalog_compatibility','catalog_media'] loop
  execute format('create trigger catalog_graph_revision after insert or update or delete on public.%I for each row execute function public.catalog_touch_parent()',t);
 end loop;
end $$;

-- One atomic graph save. Changing a live record takes it back to draft before
-- any child changes. This avoids silently publishing unreviewed edits.
create function public.catalog_save_product(p_document jsonb,p_batch uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare p_id uuid:=(p_document->>'id')::uuid;existing public.catalog_products;v jsonb;n jsonb;vid uuid;oid uuid;seen uuid[]:='{}';offer_ids uuid[];
begin
 if not public.blog_is_admin() then raise insufficient_privilege;end if;
 if octet_length(p_document::text)>524288 or jsonb_typeof(p_document->'variants')<>'array' or jsonb_array_length(p_document->'variants') not between 1 and 20 then raise exception 'Invalid bounded product document';end if;
 if p_batch is not null and not exists(select 1 from public.catalog_import_batches where id=p_batch and status='running' and created_by=auth.uid() and synthetic=(p_document->>'synthetic')::boolean) then raise exception 'Invalid running import batch';end if;
 select * into existing from public.catalog_products where id=p_id for update;
 if found then
  if existing.revision<>(p_document->>'revision')::bigint or p_batch is not null then raise serialization_failure;end if;
  update public.catalog_products set manufacturer_id=nullif(p_document->>'manufacturer_id','')::uuid,family_id=p_document->>'family_id',title=p_document->>'title',slug=p_document->>'slug',description=coalesce(p_document->>'description',''),source_id=nullif(p_document->>'source_id','')::uuid,verified_at=nullif(p_document->>'verified_at','')::timestamptz,synthetic=(p_document->>'synthetic')::boolean,status='draft',revision=revision+1,updated_at=now() where id=p_id;
 else
  if (p_document->>'revision')::bigint<>0 then raise serialization_failure;end if;
  insert into public.catalog_products(id,manufacturer_id,family_id,title,slug,description,source_id,verified_at,synthetic,import_batch_id) values(p_id,nullif(p_document->>'manufacturer_id','')::uuid,p_document->>'family_id',p_document->>'title',p_document->>'slug',coalesce(p_document->>'description',''),nullif(p_document->>'source_id','')::uuid,nullif(p_document->>'verified_at','')::timestamptz,(p_document->>'synthetic')::boolean,p_batch);
 end if;
 delete from public.catalog_identifiers where variant_id in(select id from public.catalog_variants where product_id=p_id);
 delete from public.catalog_dimensions where variant_id in(select id from public.catalog_variants where product_id=p_id);
 delete from public.catalog_compatibility where variant_id in(select id from public.catalog_variants where product_id=p_id);
 for v in select value from jsonb_array_elements(p_document->'variants') loop
  vid:=(v->>'id')::uuid;seen:=array_append(seen,vid);
  if exists(select 1 from public.catalog_variants where id=vid and product_id<>p_id) then raise exception 'Variant belongs to another product';end if;
  insert into public.catalog_variants(id,product_id,key,finish,color,material,handedness,source_id,verified_at) values(vid,p_id,v->>'key',coalesce(v->>'finish',''),coalesce(v->>'color',''),coalesce(v->>'material',''),coalesce(v->>'handedness','unknown'),nullif(v->>'source_id','')::uuid,nullif(v->>'verified_at','')::timestamptz)
  on conflict(id) do update set key=excluded.key,finish=excluded.finish,color=excluded.color,material=excluded.material,handedness=excluded.handedness,source_id=excluded.source_id,verified_at=excluded.verified_at;
  for n in select value from jsonb_array_elements(coalesce(v->'numbers','[]')) loop
   insert into public.catalog_identifiers(id,variant_id,manufacturer_id,kind,value,source_id,verified_at) values((n->>'id')::uuid,vid,(p_document->>'manufacturer_id')::uuid,n->>'kind',n->>'value',nullif(n->>'source_id','')::uuid,nullif(n->>'verified_at','')::timestamptz);
  end loop;
  offer_ids:='{}';
  for n in select value from jsonb_array_elements(coalesce(v->'offers','[]')) loop
   oid:=(n->>'id')::uuid;offer_ids:=array_append(offer_ids,oid);
   if exists(select 1 from public.catalog_offers where id=oid and variant_id<>vid) then raise exception 'Offer belongs to another variant';end if;
   insert into public.catalog_offers(id,variant_id,supplier_id,sku,availability,source_id,verified_at) values(oid,vid,(n->>'supplier_id')::uuid,n->>'sku',coalesce(n->>'availability','unknown'),nullif(n->>'source_id','')::uuid,nullif(n->>'verified_at','')::timestamptz)
   on conflict(id) do update set supplier_id=excluded.supplier_id,sku=excluded.sku,availability=excluded.availability,source_id=excluded.source_id,verified_at=excluded.verified_at;
  end loop;
  delete from public.catalog_offers where variant_id=vid and not(id=any(offer_ids));
  for n in select value from jsonb_array_elements(coalesce(v->'dimensions','[]')) loop
   insert into public.catalog_dimensions(id,variant_id,key,label,value,unit,source_id,verified_at) values((n->>'id')::uuid,vid,n->>'key',n->>'label',(n->>'value')::numeric,n->>'unit',nullif(n->>'source_id','')::uuid,nullif(n->>'verified_at','')::timestamptz);
  end loop;
  for n in select value from jsonb_array_elements(coalesce(v->'compatibility','[]')) loop
   insert into public.catalog_compatibility(id,variant_id,target_variant_id,statement,source_id,verified_at) values((n->>'id')::uuid,vid,nullif(n->>'target_variant_id','')::uuid,n->>'statement',nullif(n->>'source_id','')::uuid,nullif(n->>'verified_at','')::timestamptz);
  end loop;
 end loop;
 delete from public.catalog_variants where product_id=p_id and not(id=any(seen));
 return p_id;
end $$;

create function public.catalog_transition(p_id uuid,p_revision bigint,p_status text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.blog_is_admin() then raise insufficient_privilege;end if;
 if p_status not in ('draft','review','published','archived') then raise exception 'Invalid publication state';end if;
 perform 1 from public.catalog_products where id=p_id and revision=p_revision for update;
 if not found then raise serialization_failure;end if;
 update public.catalog_products set status=p_status,revision=revision+1,updated_at=now() where id=p_id;
end $$;
create function public.catalog_import(p_id uuid,p_hash text,p_source uuid,p_synthetic boolean,p_documents jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare b public.catalog_import_batches;d jsonb;pid uuid;canonical_hash text:=encode(sha256(convert_to(jsonb_build_object('documents',p_documents,'source',p_source,'synthetic',p_synthetic)::text,'UTF8')),'hex');
begin
 if not public.blog_is_admin() then raise insufficient_privilege;end if;
 if jsonb_typeof(p_documents)<>'array' or jsonb_array_length(p_documents) not between 1 and 10 or octet_length(p_documents::text)>1048576 then raise exception 'Import 1-10 bounded products per batch';end if;
 -- Serialize retries with the same batch ID, including concurrent first requests.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into b from public.catalog_import_batches where id=p_id for update;
 if found then
  if b.payload_hash<>p_hash or b.content_hash<>canonical_hash or b.created_by is distinct from auth.uid() or b.status<>'committed' then raise exception 'Batch ID already used with different data or rolled back';end if;
  return p_id;
 end if;
 insert into public.catalog_import_batches(id,payload_hash,content_hash,source_id,synthetic) values(p_id,p_hash,canonical_hash,p_source,p_synthetic);
 for d in select value from jsonb_array_elements(p_documents) loop
  d:=jsonb_set(jsonb_set(d,'{synthetic}',to_jsonb(p_synthetic)),'{source_id}',to_jsonb(p_source::text));
  if (d->>'revision')::bigint<>0 then raise exception 'Imports create drafts only; existing products require manual review';end if;
  pid:=public.catalog_save_product(d,p_id);
  insert into public.catalog_import_items(batch_id,product_id,expected_revision,document_hash) select p_id,pid,revision,encode(sha256(convert_to(public.catalog_document(pid)::text,'UTF8')),'hex') from public.catalog_products where id=pid;
 end loop;
 update public.catalog_import_batches set status='committed' where id=p_id;
 return p_id;
end $$;
create function public.catalog_rollback_import(p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare b public.catalog_import_batches;r record;
begin
 if not public.blog_is_admin() then raise insufficient_privilege;end if;
 select * into b from public.catalog_import_batches where id=p_id for update;
 if not found then raise exception 'Batch not found';end if;
 if b.status='rolled_back' then return;end if;
 if b.status<>'committed' then raise exception 'Batch is not complete';end if;
 for r in select p.*,i.expected_revision,i.document_hash from public.catalog_products p join public.catalog_import_items i on i.product_id=p.id and i.batch_id=p_id order by p.id for update of p loop
  if r.import_batch_id is distinct from p_id or r.revision<>r.expected_revision or encode(sha256(convert_to(public.catalog_document(r.id)::text,'UTF8')),'hex')<>r.document_hash or r.status<>'draft' or exists(select 1 from public.catalog_media where product_id=r.id) then raise exception 'Unsafe rollback: an imported record was edited, published, or has attached media';end if;
 end loop;
 if (select count(*) from public.catalog_products where import_batch_id=p_id)<>(select count(*) from public.catalog_import_items where batch_id=p_id) then raise exception 'Unsafe rollback: imported records changed';end if;
 -- Restrict FKs block references from other products; the transaction rolls back as a whole.
 delete from public.catalog_products where import_batch_id=p_id;
 update public.catalog_import_batches set status='rolled_back',rolled_back_at=now() where id=p_id;
end $$;
revoke all on function public.catalog_save_product(jsonb,uuid),public.catalog_transition(uuid,bigint,text),public.catalog_import(uuid,text,uuid,boolean,jsonb),public.catalog_rollback_import(uuid),public.catalog_guard_product(),public.catalog_guard_relationship() from public,anon;
grant execute on function public.catalog_save_product(jsonb,uuid),public.catalog_transition(uuid,bigint,text),public.catalog_import(uuid,text,uuid,boolean,jsonb),public.catalog_rollback_import(uuid) to authenticated;

insert into public.catalog_categories(id,name) values ('window-hardware','Window Hardware'),('window-parts','Window Parts'),('door-hardware','Door Hardware'),('door-parts','Door Parts');
insert into public.catalog_families(id,category_id,name) values
 ('balances','window-parts','Window balances'),('window-locks','window-hardware','Window locks'),('operators','window-hardware','Casement crank operators'),('rollers','door-parts','Patio door rollers'),('patio-locks','door-hardware','Patio door locks'),('handles','door-hardware','Door handles'),('closers','door-parts','Storm door closers'),('hinges','door-parts','Hinges'),('screen-latches','door-hardware','Screen door latches'),('track-fin-locks','window-hardware','Sliding window track/fin locks');

-- New, private, catalog-only storage. Existing blog bucket/policies are unchanged.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalog-media','catalog-media',false,2097152,array['image/webp']);
create policy catalog_storage_read on storage.objects for select to authenticated using(bucket_id='catalog-media' and (select public.blog_is_admin()));
create policy catalog_storage_insert on storage.objects for insert to authenticated with check(bucket_id='catalog-media' and (select public.blog_is_admin()) and exists(select 1 from public.catalog_media m where m.path=name and m.state='uploading'));
create policy catalog_storage_delete on storage.objects for delete to authenticated using(bucket_id='catalog-media' and (select public.blog_is_admin()));

create function public.catalog_document(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'manufacturer_id',p.manufacturer_id,'manufacturer_name',(select name from public.catalog_manufacturers where id=p.manufacturer_id),'family_id',p.family_id,'slug',p.slug,'title',p.title,'description',p.description,'source_id',p.source_id,'verified_at',p.verified_at,'status',p.status,'synthetic',p.synthetic,'revision',p.revision,'created_at',p.created_at,'updated_at',p.updated_at,'import_batch_id',p.import_batch_id,
 'media',coalesce((select jsonb_agg(to_jsonb(m) order by m.kind,m.id) from public.catalog_media m where m.product_id=p.id),'[]'),
 'variants',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'key',v.key,'finish',v.finish,'color',v.color,'material',v.material,'handedness',v.handedness,'source_id',v.source_id,'verified_at',v.verified_at,
 'numbers',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'value',n.value,'source_id',n.source_id,'verified_at',n.verified_at) order by n.kind,n.value) from public.catalog_identifiers n where n.variant_id=v.id),'[]'),
 'offers',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'supplier_id',o.supplier_id,'supplier_name',(select name from public.catalog_suppliers where id=o.supplier_id),'sku',o.sku,'availability',o.availability,'source_id',o.source_id,'verified_at',o.verified_at) order by o.id) from public.catalog_offers o where o.variant_id=v.id),'[]'),
 'dimensions',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'key',d.key,'label',d.label,'value',d.value,'unit',d.unit,'source_id',d.source_id,'verified_at',d.verified_at) order by d.key) from public.catalog_dimensions d where d.variant_id=v.id),'[]'),
 'compatibility',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'statement',c.statement,'target_variant_id',c.target_variant_id,'source_id',c.source_id,'verified_at',c.verified_at) order by c.id) from public.catalog_compatibility c where c.variant_id=v.id),'[]')) order by v.key) from public.catalog_variants v where v.product_id=p.id),'[]'))
 from public.catalog_products p where p.id=p_id;
$$;
-- Bounded public search: exact identifiers and normalized/partial candidates are
-- different ranks. No confidence score and no compatibility inference.
create function public.catalog_hit(p_variant uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(hit) from (
 select p.id as product_id,v.id as variant_id,p.slug,p.title,p.description,p.manufacturer_id,m.name as manufacturer_name,p.family_id,f.category_id as category,v.finish,v.verified_at,p.synthetic,
 coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'value',n.value,'source_id',n.source_id,'verified_at',n.verified_at)) from public.catalog_identifiers n where n.variant_id=v.id and n.verified_at is not null),'[]') as numbers,
 coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'supplier_id',o.supplier_id,'supplier_name',(select name from public.catalog_suppliers where id=o.supplier_id),'sku',o.sku,'availability',o.availability,'source_id',o.source_id,'verified_at',o.verified_at)) from public.catalog_offers o where o.variant_id=v.id and o.verified_at is not null),'[]') as offers,
 coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'key',d.key,'label',d.label,'value',d.value,'unit',d.unit,'source_id',d.source_id,'verified_at',d.verified_at)) from public.catalog_dimensions d where d.variant_id=v.id and d.verified_at is not null),'[]') as dimensions,
 coalesce((select jsonb_agg(to_jsonb(a)) from public.catalog_media a where a.product_id=p.id and a.kind='photo' and a.permission='approved' and a.state='ready' and (a.variant_id is null or a.variant_id=v.id)),'[]') as media from public.catalog_products p join public.catalog_variants v on v.product_id=p.id join public.catalog_families f on f.id=p.family_id join public.catalog_manufacturers m on m.id=p.manufacturer_id
 where p.status='published' and not p.synthetic and p.verified_at is not null and p.source_id is not null and v.source_id is not null and v.verified_at is not null
 and v.id=p_variant
 ) hit;
$$;
create function public.catalog_search(p_query text default '',p_filters jsonb default '{}',p_limit integer default 12,p_offset integer default 0) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;normalized text:=regexp_replace(upper(p_query),'[^A-Z0-9]','','g');mode text:=coalesce(nullif(p_filters->>'mode',''),'all');
begin
 if (mode='partial' and length(normalized)<3) or length(p_query)>80 or p_limit not between 1 and 24 or p_offset not between 0 and 12000 or mode not in ('all','exact','normalized','partial') or octet_length(p_filters::text)>4096 then raise exception 'Invalid bounded search';end if;
 with number_matches as (
 select variant_id,min(rank) as rank from (
  select variant_id,0 as rank from public.catalog_identifiers where p_query<>'' and exact_number=upper(btrim(p_query)) and verified_at is not null
  union all select variant_id,0 from public.catalog_offers where p_query<>'' and exact_sku=upper(btrim(p_query)) and verified_at is not null
  union all select variant_id,1 from public.catalog_identifiers where normalized<>'' and mode in ('all','normalized') and normalized_number=normalized and verified_at is not null
  union all select variant_id,1 from public.catalog_offers where normalized<>'' and mode in ('all','normalized') and normalized_sku=normalized and verified_at is not null
  union all select variant_id,2 from public.catalog_identifiers where length(normalized)>=3 and mode in ('all','partial') and position(normalized in normalized_number)>0 and verified_at is not null
  union all select variant_id,2 from public.catalog_offers where length(normalized)>=3 and mode in ('all','partial') and position(normalized in normalized_sku)>0 and verified_at is not null
 ) matches group by variant_id
 ), candidates as (
 select p.id as product_id,v.id as variant_id,p.title,
 case when p_query='' then 3 else coalesce(nm.rank,case when mode='all' and length(normalized)>=3 and position(lower(p_query) in lower(p.title))>0 then 2 else 4 end) end as rank
 from public.catalog_products p join public.catalog_variants v on v.product_id=p.id join public.catalog_families f on f.id=p.family_id join public.catalog_manufacturers m on m.id=p.manufacturer_id left join number_matches nm on nm.variant_id=v.id
 where p.status='published' and not p.synthetic and p.verified_at is not null and p.source_id is not null and v.source_id is not null and v.verified_at is not null
 and(coalesce(p_filters->>'category','')='' or f.category_id=p_filters->>'category')
 and(coalesce(p_filters->>'family','')='' or p.family_id=p_filters->>'family')
 and(coalesce(p_filters->>'manufacturer','')='' or p.manufacturer_id::text=p_filters->>'manufacturer')
 and(coalesce(p_filters->>'supplier','')='' or exists(select 1 from public.catalog_offers o where o.variant_id=v.id and o.supplier_id::text=p_filters->>'supplier' and o.verified_at is not null))
 and(coalesce(p_filters->>'finish','')='' or lower(v.finish)=lower(p_filters->>'finish'))
 and(coalesce(p_filters->>'measurement','')='' or exists(select 1 from public.catalog_dimensions d where d.variant_id=v.id and d.key=p_filters->>'measurement' and d.verified_at is not null and d.source_id is not null
 and(coalesce(p_filters->>'min_mm','')='' or d.mm>=(p_filters->>'min_mm')::numeric-0.000001)
 and(coalesce(p_filters->>'max_mm','')='' or d.mm<=(p_filters->>'max_mm')::numeric+0.000001)))
 ),filtered as(select * from candidates where rank<4 and (p_query='' or mode='all' or mode='exact' and rank=0 or mode='normalized' and rank<=1 or mode='partial' and rank<=2))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(public.catalog_hit(page.variant_id) order by page.rank,page.title,page.variant_id) from(select * from filtered order by rank,title,variant_id limit p_limit offset p_offset) page),'[]')) into result;
 return result;
end $$;
revoke all on function public.catalog_hit(uuid),public.catalog_document(uuid),public.catalog_search(text,jsonb,integer,integer),public.catalog_public_product(uuid),public.catalog_public_variant(uuid) from public;
grant execute on function public.catalog_hit(uuid),public.catalog_document(uuid),public.catalog_search(text,jsonb,integer,integer),public.catalog_public_product(uuid),public.catalog_public_variant(uuid) to anon,authenticated;
commit;
