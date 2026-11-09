-- Candidate only: apply to the SAME Supabase project/history as AI Photo Assist.
-- No sample posts, accounts, external project, public bucket or cron job is created.
begin;
create schema if not exists blog_private;
revoke all on schema blog_private from public;
grant usage on schema blog_private to authenticated, service_role;
create table blog_private.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table blog_private.administrators enable row level security;
revoke all on blog_private.administrators from public, anon, authenticated;

-- The private definer lookup is necessary to avoid granting membership/session-table
-- reads to users. No parameters, no user_metadata, fixed search path, explicit uid.
create function blog_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists(select 1 from blog_private.administrators a where a.user_id = auth.uid())
    and exists(select 1 from auth.sessions s where s.id::text = (auth.jwt()->>'session_id') and s.user_id = auth.uid() and (s.not_after is null or s.not_after > now()));
$$;
revoke all on function blog_private.is_admin() from public, anon;
grant execute on function blog_private.is_admin() to authenticated, service_role;
create function public.blog_is_admin() returns boolean language sql security invoker set search_path = '' as $$ select blog_private.is_admin(); $$;
revoke all on function public.blog_is_admin() from public, anon;
grant execute on function public.blog_is_admin() to authenticated;

create table public.blog_categories (
  id uuid primary key,
  name text not null check(length(btrim(name)) between 1 and 100),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  description text not null default '' check(length(description) <= 500)
);
create table public.blog_media (
  id uuid primary key,
  path text not null unique check(path ~ '^[a-f0-9-]{36}\.webp$'),
  alt text not null check(length(btrim(alt)) between 1 and 300),
  width integer not null check(width between 1 and 2000),
  height integer not null check(height between 1 and 2000),
  bytes integer not null check(bytes between 1 and 2097152),
  state text not null default 'uploading' check(state in ('uploading','ready','deleting')),
  created_at timestamptz not null default now()
);
create table public.blog_posts (
  id uuid primary key,
  document jsonb not null check(jsonb_typeof(document) = 'object' and octet_length(document::text) <= 1048576),
  slug text generated always as (document->>'slug') stored not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100 and slug not in ('admin','api','category','media','preview','login','new')),
  category_id uuid generated always as (nullif(document->>'category_id','')::uuid) stored references public.blog_categories(id) on delete restrict,
  status text not null default 'draft' check(status in ('draft','published','scheduled')),
  version bigint not null default 1 check(version > 0),
  media_ids uuid[] not null default '{}',
  scheduled_document jsonb,
  scheduled_media_ids uuid[] not null default '{}',
  scheduled_at timestamptz,
  job_error text,
  job_retry_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check ((status = 'scheduled') = (scheduled_at is not null and scheduled_document is not null))
);
create table public.blog_publications (
  post_id uuid primary key references public.blog_posts(id) on delete cascade,
  document jsonb not null,
  slug text generated always as (document->>'slug') stored not null unique,
  category_id uuid generated always as (nullif(document->>'category_id','')::uuid) stored references public.blog_categories(id) on delete restrict,
  media_ids uuid[] not null default '{}',
  published_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create table public.blog_slug_history (
  slug text primary key,
  post_id uuid not null references public.blog_posts(id) on delete cascade
);
create index blog_publications_category on public.blog_publications(category_id, published_at desc);
create index blog_publications_date on public.blog_publications(published_at desc);
create index blog_publications_media on public.blog_publications using gin(media_ids);
create index blog_posts_media on public.blog_posts using gin(media_ids);
create index blog_posts_scheduled_media on public.blog_posts using gin(scheduled_media_ids);
create index blog_posts_category on public.blog_posts(category_id);
create index blog_posts_creator on public.blog_posts(created_by);
create index blog_posts_updated on public.blog_posts(updated_at desc);
create index blog_history_post on public.blog_slug_history(post_id);
create index blog_posts_schedule on public.blog_posts(scheduled_at) where status = 'scheduled';
alter table public.blog_categories enable row level security;
alter table public.blog_media enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_publications enable row level security;
alter table public.blog_slug_history enable row level security;
revoke all on public.blog_categories,public.blog_media,public.blog_posts,public.blog_publications,public.blog_slug_history from public,anon,authenticated;
grant select on public.blog_categories,public.blog_media,public.blog_publications,public.blog_slug_history to anon;
grant select,insert,update,delete on public.blog_categories,public.blog_media,public.blog_posts,public.blog_publications,public.blog_slug_history to authenticated;
grant all on public.blog_categories,public.blog_media,public.blog_posts,public.blog_publications,public.blog_slug_history to service_role;
create policy blog_posts_admin on public.blog_posts to authenticated using ((select blog_private.is_admin())) with check ((select blog_private.is_admin()));
create policy blog_publications_admin on public.blog_publications to authenticated using ((select blog_private.is_admin())) with check ((select blog_private.is_admin()));
create policy blog_publications_read on public.blog_publications for select to anon,authenticated using(published_at <= now());
create policy blog_categories_admin on public.blog_categories to authenticated using ((select blog_private.is_admin())) with check ((select blog_private.is_admin()));
create policy blog_categories_read on public.blog_categories for select to anon,authenticated using(exists(select 1 from public.blog_publications p where p.category_id = blog_categories.id and p.published_at <= now()));
create policy blog_media_admin on public.blog_media to authenticated using ((select blog_private.is_admin())) with check ((select blog_private.is_admin()));
create policy blog_media_read on public.blog_media for select to anon,authenticated using(state='ready' and exists(select 1 from public.blog_publications p where p.media_ids @> array[blog_media.id] and p.published_at <= now()));
create policy blog_history_admin on public.blog_slug_history to authenticated using ((select blog_private.is_admin())) with check ((select blog_private.is_admin()));
create policy blog_history_read on public.blog_slug_history for select to anon,authenticated using(exists(select 1 from public.blog_publications p where p.post_id = blog_slug_history.post_id and p.published_at <= now()));

create function blog_private.document_media(d jsonb) returns uuid[] language sql immutable security invoker set search_path = '' as $$
  select coalesce(array_agg(distinct id) filter(where id is not null), '{}') from (
    select nullif(d->>'featured_image_id','')::uuid as id
    union all select nullif(d->>'social_image_id','')::uuid
    union all select nullif(n#>>'{attrs,mediaId}','')::uuid from jsonb_path_query(d, '$.body.** ? (@.type == "image")') n
  ) refs;
$$;
create function blog_private.check_document(d jsonb, publishing boolean) returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare ids uuid[]; canonical text;
begin
  if jsonb_typeof(d) <> 'object' or octet_length(d::text) > 1048576 or jsonb_typeof(d->'body') <> 'object' or d#>>'{body,type}' <> 'doc' then raise exception 'Invalid document'; end if;
  canonical := coalesce(d->>'canonical_url','');
  if canonical <> '' and canonical !~ '^https://www\.partsolved\.com/[^?#]*$' then raise exception 'Use the canonical www origin'; end if;
  if publishing and (length(btrim(coalesce(d->>'title',''))) = 0 or length(btrim(coalesce(d->>'author',''))) = 0 or length(btrim(coalesce(d->>'excerpt',''))) = 0
    or not jsonb_path_exists(d, '$.body.** ? (@.type == "text" && @.text != "")')) then raise exception 'Title, real author, excerpt and text are required'; end if;
  if publishing and ((d->>'featured_image_id' is not null and length(btrim(coalesce(d->>'featured_alt',''))) = 0) or (d->>'social_image_id' is not null and length(btrim(coalesce(d->>'social_alt',''))) = 0)
    or jsonb_path_exists(d, '$.body.** ? (@.type == "image" && (@.attrs.alt == "" || !exists(@.attrs.alt)))')) then raise exception 'Descriptive alt text is required'; end if;
  ids := blog_private.document_media(d);
  perform 1 from public.blog_media where id = any(ids) for share;
  if (select count(*) from public.blog_media where id = any(ids) and state='ready') <> cardinality(ids) then raise exception 'An image is missing or being deleted'; end if;
  return ids;
end $$;

create function public.blog_save_post(p_id uuid, p_version bigint, p_document jsonb) returns public.blog_posts language plpgsql security invoker set search_path = '' as $$
declare item public.blog_posts; ids uuid[];
begin
  if not blog_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select * into item from public.blog_posts where id=p_id for update;
  if not found or item.version <> p_version then raise exception 'The article changed. Reload before saving.' using errcode='40001'; end if;
  ids := blog_private.check_document(p_document, false);
  update public.blog_posts set document=p_document, media_ids=ids, version=version+1, updated_at=now() where id=p_id returning * into item;
  return item;
end $$;
create function blog_private.publish_document(p_id uuid, d jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare ids uuid[]; first_date timestamptz; target_slug text;
begin
  ids := blog_private.check_document(d, true); target_slug := d->>'slug';
  -- Also reserve historical slugs, so old links cannot silently point to another post.
  perform pg_advisory_xact_lock(19194101);
  if exists(select 1 from public.blog_slug_history where slug=target_slug and post_id<>p_id) then raise exception 'That URL belongs to another article'; end if;
  insert into public.blog_slug_history(slug,post_id) values(target_slug,p_id) on conflict(slug) do nothing;
  select coalesce(published_at,now()) into first_date from public.blog_posts where id=p_id;
  insert into public.blog_publications(post_id,document,media_ids,published_at,updated_at) values(p_id,d,ids,first_date,now())
    on conflict(post_id) do update set document=excluded.document,media_ids=excluded.media_ids,updated_at=excluded.updated_at;
  update public.blog_posts set status='published', published_at=first_date, scheduled_at=null,scheduled_document=null,scheduled_media_ids='{}',job_error=null,job_retry_at=null,version=version+1,updated_at=now() where id=p_id;
end $$;
create function public.blog_transition(p_id uuid,p_version bigint,p_action text,p_at timestamptz default null) returns public.blog_posts language plpgsql security invoker set search_path = '' as $$
declare item public.blog_posts; ids uuid[];
begin
  if not blog_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select * into item from public.blog_posts where id=p_id for update;
  if not found or item.version<>p_version then raise exception 'The article changed. Reload before continuing.' using errcode='40001'; end if;
  if p_action='publish' then perform blog_private.publish_document(p_id,item.document);
  elsif p_action='unpublish' then
    delete from public.blog_publications where post_id=p_id;
    update public.blog_posts set status='draft',scheduled_at=null,scheduled_document=null,scheduled_media_ids='{}',job_error=null,job_retry_at=null,version=version+1,updated_at=now() where id=p_id;
  elsif p_action='schedule' then
    if p_at is null or p_at<=now() then raise exception 'Choose a future publication time'; end if;
    ids := blog_private.check_document(item.document,true);
    update public.blog_posts set status='scheduled',scheduled_at=p_at,scheduled_document=document,scheduled_media_ids=ids,job_error=null,job_retry_at=null,version=version+1,updated_at=now() where id=p_id;
  else raise exception 'Unsupported publication action'; end if;
  select * into item from public.blog_posts where id=p_id; return item;
end $$;
-- Only the database operator/service role may run the idempotent publication job.
create function public.blog_publish_due() returns integer language plpgsql security invoker set search_path = '' as $$
declare item public.blog_posts; total integer := 0;
begin
  for item in select * from public.blog_posts where status='scheduled' and scheduled_at<=now() and (job_retry_at is null or job_retry_at<=now()) order by scheduled_at limit 50 for update skip locked loop
    begin
      perform blog_private.publish_document(item.id,item.scheduled_document); total := total+1;
    exception when others then update public.blog_posts set job_error=left(sqlerrm,500),job_retry_at=now()+interval '5 minutes' where id=item.id;
    end;
  end loop;
  return total;
end $$;
create function public.blog_mark_media_deleting(p_id uuid) returns public.blog_media language plpgsql security invoker set search_path = '' as $$
declare item public.blog_media;
begin
  if not blog_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select * into item from public.blog_media where id=p_id for update;
  if not found then raise exception 'Image not found'; end if;
  if exists(select 1 from public.blog_posts where media_ids @> array[p_id] or scheduled_media_ids @> array[p_id]) or exists(select 1 from public.blog_publications where media_ids @> array[p_id]) then raise exception 'Image is still used by an article' using errcode='23503'; end if;
  update public.blog_media set state='deleting' where id=p_id returning * into item; return item;
end $$;

revoke all on all functions in schema blog_private from public,anon;
grant execute on function blog_private.document_media(jsonb),blog_private.check_document(jsonb,boolean),blog_private.publish_document(uuid,jsonb) to authenticated,service_role;
revoke all on function public.blog_save_post(uuid,bigint,jsonb),public.blog_transition(uuid,bigint,text,timestamptz),public.blog_publish_due(),public.blog_mark_media_deleting(uuid) from public,anon,authenticated;
grant execute on function public.blog_save_post(uuid,bigint,jsonb),public.blog_transition(uuid,bigint,text,timestamptz),public.blog_mark_media_deleting(uuid) to authenticated;
grant execute on function public.blog_publish_due() to service_role;

-- Private bucket: images become public only through /blog/media/[id] after a
-- publication-reference check. No anonymous listing or raw draft URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('blog-media','blog-media',false,2097152,array['image/webp']) on conflict(id) do nothing;
do $$ begin
  if exists(select 1 from storage.buckets where id='blog-media' and (public or file_size_limit is distinct from 2097152::bigint or allowed_mime_types is distinct from array['image/webp'])) then
    raise exception 'Existing blog-media bucket settings require owner review; private WebP-only storage is required';
  end if;
end $$;
create policy blog_storage_read on storage.objects for select to authenticated using(bucket_id='blog-media' and (select blog_private.is_admin()));
create policy blog_storage_insert on storage.objects for insert to authenticated with check(bucket_id='blog-media' and (select blog_private.is_admin()) and exists(select 1 from public.blog_media m where m.path=name and m.state='uploading'));
create policy blog_storage_delete on storage.objects for delete to authenticated using(bucket_id='blog-media' and (select blog_private.is_admin()) and exists(select 1 from public.blog_media m where m.path=name and m.state='deleting'));
commit;
