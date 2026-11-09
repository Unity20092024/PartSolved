-- Stage 1, unapplied. Reuse the blog's Supabase project and migration history.
-- No auth/blog tables, storage buckets, extensions, cron jobs or customer photos.
begin;
create schema if not exists ai_private;
revoke all on schema ai_private from public, anon, authenticated;
grant usage on schema ai_private to service_role;

create table ai_private.controls (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  daily_cap bigint not null default 1000000 check (daily_cap between 0 and 1000000),
  monthly_cap bigint not null default 10000000 check (monthly_cap between 0 and 10000000)
);
insert into ai_private.controls default values;
create table ai_private.attempts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  session_hash text not null,
  ip_hash text not null,
  images smallint not null check (images between 1 and 3),
  model text not null check (model = 'gpt-5.4-mini-2026-03-17'),
  reserved_cost bigint not null check (reserved_cost = 30000),
  actual_cost bigint check (actual_cost >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'unusable', 'overrun'))
);
create index ai_attempts_time on ai_private.attempts(created_at);
create index ai_attempts_session on ai_private.attempts(session_hash);
create table ai_private.rate_events (
  ip_hash text not null,
  action text not null check (action in ('login', 'analyze')),
  created_at timestamptz not null default now()
);
create index ai_rate_events_lookup on ai_private.rate_events(ip_hash, action, created_at);
alter table ai_private.controls enable row level security;
alter table ai_private.attempts enable row level security;
alter table ai_private.rate_events enable row level security;
revoke all on all tables in schema ai_private from public, anon, authenticated;
grant select, update on ai_private.controls to service_role;
grant select, insert, update on ai_private.attempts to service_role;
grant select, insert on ai_private.rate_events to service_role;

-- SECURITY INVOKER: only service_role has EXECUTE and private-table access.
create function public.ai_take_rate_slot(p_ip text, p_action text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare total integer;
begin
  if p_ip !~ '^[a-f0-9]{64}$' or p_action not in ('login', 'analyze') then return false; end if;
  perform 1 from ai_private.controls where singleton for update;
  select count(*) into total from ai_private.rate_events
    where ip_hash = p_ip and action = p_action and created_at > now() - interval '1 minute';
  if total >= 5 then return false; end if;
  insert into ai_private.rate_events(ip_hash, action) values (p_ip, p_action);
  return true;
end $$;

create function public.ai_reserve_analysis(
  p_id uuid, p_session text, p_ip text, p_images integer, p_model text,
  p_reserve bigint, p_daily_cap bigint, p_monthly_cap bigint
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare settings ai_private.controls%rowtype; day_start timestamptz; month_start timestamptz;
  day_cost bigint; month_cost bigint;
begin
  -- Global row lock serializes ALL instances, budgets, replay checks and rate slots.
  select * into settings from ai_private.controls where singleton for update;
  if not found or not settings.enabled then return jsonb_build_object('allowed', false, 'reason', 'disabled'); end if;
  if p_session is null or length(p_session) > 100 or p_ip !~ '^[a-f0-9]{64}$'
    or p_images not between 1 and 3 or p_reserve <> 30000
    or p_model <> 'gpt-5.4-mini-2026-03-17' or p_daily_cap <= 0 or p_monthly_cap <= 0
    then return jsonb_build_object('allowed', false, 'reason', 'invalid'); end if;
  if exists(select 1 from ai_private.attempts where id = p_id) then
    return jsonb_build_object('allowed', false, 'reason', 'duplicate'); end if;
  day_start := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  month_start := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  select coalesce(sum(coalesce(actual_cost, reserved_cost)), 0),
    coalesce(sum(coalesce(actual_cost, reserved_cost)) filter (where created_at >= day_start or status = 'reserved'), 0)
    into month_cost, day_cost from ai_private.attempts where created_at >= month_start or status = 'reserved';
  -- Uncertain calls keep their reservation even across UTC day/month rollover.
  if day_cost + p_reserve > least(settings.daily_cap, p_daily_cap)
    or month_cost + p_reserve > least(settings.monthly_cap, p_monthly_cap) then
    return jsonb_build_object('allowed', false, 'reason', 'budget'); end if;
  if (select count(*) from ai_private.attempts where session_hash = p_session) >= 3
    or exists(select 1 from ai_private.attempts where session_hash = p_session and status = 'reserved' and created_at > now() - interval '1 minute')
    or (select count(*) from ai_private.attempts where ip_hash = p_ip and created_at >= day_start) >= 10
    or (select count(*) from ai_private.attempts where status = 'reserved' and created_at > now() - interval '1 minute') >= 4 then
    return jsonb_build_object('allowed', false, 'reason', 'rate'); end if;
  insert into ai_private.attempts(id, session_hash, ip_hash, images, model, reserved_cost)
    values (p_id, p_session, p_ip, p_images, p_model, p_reserve);
  return jsonb_build_object('allowed', true, 'reason', 'reserved');
end $$;

create function public.ai_settle_analysis(p_id uuid, p_input integer, p_output integer, p_cost bigint, p_status text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempt ai_private.attempts%rowtype; expected bigint;
begin
  perform 1 from ai_private.controls where singleton for update;
  select * into attempt from ai_private.attempts where id = p_id for update;
  if not found then return false; end if;
  if attempt.status <> 'reserved' then return attempt.actual_cost = p_cost; end if;
  if p_input is null or p_output is null or p_cost is null or p_input < 0 or p_output < 0
    or p_status not in ('completed', 'unusable') then return false; end if;
  -- Independently calculate at the pinned first-party standard prices, in microdollars.
  expected := ceil(p_input * 0.75 + p_output * 4.5);
  if p_cost <> expected then return false; end if;
  if p_cost > attempt.reserved_cost or p_input > 16295 or p_output > 1800 then
    update ai_private.controls set enabled = false;
    update ai_private.attempts set actual_cost = greatest(p_cost, reserved_cost), input_tokens = p_input,
      output_tokens = p_output, status = 'overrun' where id = p_id;
    return false;
  end if;
  update ai_private.attempts set actual_cost = p_cost, input_tokens = p_input, output_tokens = p_output,
    status = p_status where id = p_id;
  return true;
end $$;

revoke all on function public.ai_take_rate_slot(text,text) from public, anon, authenticated;
revoke all on function public.ai_reserve_analysis(uuid,text,text,integer,text,bigint,bigint,bigint) from public, anon, authenticated;
revoke all on function public.ai_settle_analysis(uuid,integer,integer,bigint,text) from public, anon, authenticated;
grant execute on function public.ai_take_rate_slot(text,text) to service_role;
grant execute on function public.ai_reserve_analysis(uuid,text,text,integer,text,bigint,bigint,bigint) to service_role;
grant execute on function public.ai_settle_analysis(uuid,integer,integer,bigint,text) to service_role;

create function public.ai_usage_summary() returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'enabled', c.enabled, 'dailyCapMicros', c.daily_cap, 'monthlyCapMicros', c.monthly_cap,
    'dayMicros', coalesce(sum(coalesce(a.actual_cost, a.reserved_cost)) filter (where a.created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' or a.status = 'reserved'), 0),
    'monthMicros', coalesce(sum(coalesce(a.actual_cost, a.reserved_cost)), 0),
    'monthRequests', count(a.id) filter (where a.created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'),
    'unreconciledRequests', count(a.id) filter (where a.status = 'reserved'),
    'overruns', count(a.id) filter (where a.status = 'overrun')
  ) from ai_private.controls c left join ai_private.attempts a
    on a.created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC' or a.status = 'reserved'
    where c.singleton group by c.enabled, c.daily_cap, c.monthly_cap;
$$;
revoke all on function public.ai_usage_summary() from public, anon, authenticated;
grant execute on function public.ai_usage_summary() to service_role;
commit;
