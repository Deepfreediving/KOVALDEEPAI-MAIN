-- =========================================
-- Extensions
-- =========================================
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- =========================================
-- Enums
-- =========================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'ai_job_status') then
    create type ai_job_status as enum ('queued','processing','succeeded','failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_role') then
    create type message_role as enum ('system','user','assistant','tool');
  end if;
end $$;

-- =========================================
-- Helpers
-- =========================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =========================================
-- Optional profile mirror (linked to auth.users)
-- =========================================
create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  photo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_app_user_updated_at on app_user;
create trigger trg_app_user_updated_at
before update on app_user
for each row execute function set_updated_at();

alter table app_user enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_user' and policyname='app_user_select_own'
  ) then
    create policy app_user_select_own on app_user
      for select using (auth.uid() = auth_user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_user' and policyname='app_user_upsert_own'
  ) then
    create policy app_user_upsert_own on app_user
      for insert with check (auth.uid() = auth_user_id);
    create policy app_user_update_own on app_user
      for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);
  end if;
end $$;

-- =========================================
-- Dive logs (owner only + your fields)
-- =========================================
create table if not exists dive_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null,                -- will be converted to DATE below
  discipline text,                          -- e.g. CWT, FIM, CNF, STA
  reached_depth numeric(6,2),
  bottom_time_seconds integer,
  total_time_seconds integer,
  location text,
  lat numeric(9,6),
  lng numeric(9,6),
  tags text[] default '{}',
  notes text,
  ai_summary text,
  ai_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Switch to DATE for your UI (YYYY-MM-DD)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name='dive_log' and column_name='date'
      and (udt_name='timestamptz' or data_type='timestamp with time zone'
           or data_type='timestamp without time zone')
  ) then
    execute 'alter table dive_log alter column date type date using date::date';
  end if;
end $$;

-- Add your extra/simple+advanced fields (idempotent)
alter table dive_log
  add column if not exists discipline_type text,           -- "depth" | "pool" ...
  add column if not exists target_depth numeric(6,2),
  add column if not exists mouthfill_depth numeric(6,2),
  add column if not exists issue_depth numeric(6,2),
  add column if not exists issue_comment text,
  add column if not exists squeeze boolean,
  add column if not exists exit_status text,               -- "clean", "LMC", "BO", etc.
  add column if not exists duration_seconds integer,
  add column if not exists distance_m numeric(7,2),
  add column if not exists attempt_type text,              -- "training","PB","warmup"
  add column if not exists surface_protocol text,
  -- physio flags
  add column if not exists ear_squeeze boolean,
  add column if not exists lung_squeeze boolean,
  add column if not exists narcosis_level smallint check (narcosis_level between 0 and 5),
  add column if not exists recovery_quality smallint check (recovery_quality between 0 and 5),
  -- gear as flexible JSON
  add column if not exists gear jsonb not null default '{}'::jsonb;

drop trigger if exists trg_dive_log_updated_at on dive_log;
create trigger trg_dive_log_updated_at
before update on dive_log
for each row execute function set_updated_at();

create index if not exists dive_log_user_date_idx on dive_log (user_id, date desc);
create index if not exists dive_log_user_date_simple_idx on dive_log (user_id, date desc);

alter table dive_log enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='dive_log' and policyname='dive_log_read_own') then
    create policy dive_log_read_own   on dive_log for select using (auth.uid() = user_id);
    create policy dive_log_write_own  on dive_log for insert with check (auth.uid() = user_id);
    create policy dive_log_update_own on dive_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy dive_log_delete_own on dive_log for delete using (auth.uid() = user_id);
  end if;
end $$;

-- =========================================
-- Journal (free-form, optional embedding)
-- =========================================
create table if not exists journal_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dive_log_id uuid references dive_log(id) on delete cascade,
  content text not null,
  mood smallint,
  tags text[] default '{}',
  ai_summary text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists journal_user_idx on journal_entry (user_id, created_at desc);

alter table journal_entry enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='journal_entry' and policyname='journal_read_own') then
    create policy journal_read_own   on journal_entry for select using (auth.uid() = user_id);
    create policy journal_write_own  on journal_entry for insert with check (auth.uid() = user_id);
    create policy journal_update_own on journal_entry for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy journal_delete_own on journal_entry for delete using (auth.uid() = user_id);
  end if;
end $$;

-- =========================================
-- Images from dive computers (raw + compressed) + OCR/AI
-- =========================================
create table if not exists dive_log_image (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dive_log_id uuid references dive_log(id) on delete set null,
  bucket text not null default 'dive-images',
  path_original text not null,        -- '<uid>/<uuid>.jpg'
  path_compressed text,
  mime_type text,
  bytes bigint,
  width int,
  height int,
  sha256 text unique,
  ocr_text text,
  ai_summary text,
  ai_analysis jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists image_user_idx on dive_log_image (user_id, created_at desc);
create index if not exists image_log_idx  on dive_log_image (dive_log_id);

alter table dive_log_image enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='dive_log_image' and policyname='image_read_own') then
    create policy image_read_own   on dive_log_image for select using (auth.uid() = user_id);
    create policy image_write_own  on dive_log_image for insert with check (auth.uid() = user_id);
    create policy image_update_own on dive_log_image for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy image_delete_own on dive_log_image for delete using (auth.uid() = user_id);
  end if;
end $$;

-- =========================================
-- Assistant memory (long-term facts/preferences/goals)
-- =========================================
create table if not exists assistant_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('fact','preference','goal','warning','profile')),
  content text not null,
  source text,
  importance smallint default 1,
  last_used_at timestamptz,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists memory_user_idx on assistant_memory (user_id, created_at desc);

alter table assistant_memory enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='assistant_memory' and policyname='memory_read_own') then
    create policy memory_read_own   on assistant_memory for select using (auth.uid() = user_id);
    create policy memory_write_own  on assistant_memory for insert with check (auth.uid() = user_id);
    create policy memory_update_own on assistant_memory for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy memory_delete_own on assistant_memory for delete using (auth.uid() = user_id);
  end if;
end $$;

-- =========================================
-- Chat threads & messages
-- =========================================
create table if not exists chat_thread (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_chat_thread_updated_at on chat_thread;
create trigger trg_chat_thread_updated_at
before update on chat_thread
for each row execute function set_updated_at();

alter table chat_thread enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='chat_thread' and policyname='thread_read_own') then
    create policy thread_read_own   on chat_thread for select using (auth.uid() = user_id);
    create policy thread_write_own  on chat_thread for insert with check (auth.uid() = user_id);
    create policy thread_update_own on chat_thread for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy thread_delete_own on chat_thread for delete using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists chat_message (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_thread(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role message_role not null,
  content text not null,
  model text,
  tokens int,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_msg_thread_idx on chat_message (thread_id, created_at);

alter table chat_message enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='chat_message' and policyname='chat_msg_by_owner') then
    create policy chat_msg_by_owner
      on chat_message
      for all
      using (exists (select 1 from chat_thread t where t.id = thread_id and t.user_id = auth.uid()))
      with check (exists (select 1 from chat_thread t where t.id = thread_id and t.user_id = auth.uid()));
  end if;
end $$;

-- =========================================
-- Background jobs (OCR, compression, analysis)
-- =========================================
create table if not exists ai_job (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_id uuid references dive_log_image(id) on delete cascade,
  kind text not null,                       -- 'ocr' | 'compress' | 'analyze' | 'embed'
  status ai_job_status not null default 'queued',
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists job_user_status_idx on ai_job (user_id, status, created_at desc);

alter table ai_job enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='ai_job' and policyname='job_read_own') then
    create policy job_read_own   on ai_job for select using (auth.uid() = user_id);
    create policy job_write_own  on ai_job for insert with check (auth.uid() = user_id);
    create policy job_update_own on ai_job for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy job_delete_own on ai_job for delete using (auth.uid() = user_id);
  end if;
end $$;

-- =========================================
-- OPTIONAL: Training metrics
-- =========================================
create table if not exists training_metric (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dive_log_id uuid references dive_log(id) on delete set null,
  pb_static_seconds integer,
  pb_dynamic_m numeric(6,2),
  co2_table jsonb,
  o2_table jsonb,
  hrv_rmssd numeric(6,2),
  hr_rest smallint,
  notes text,
  created_at timestamptz default now()
);

alter table training_metric enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='training_metric' and policyname='tm_read_own') then
    create policy tm_read_own   on training_metric for select using (auth.uid() = user_id);
    create policy tm_write_own  on training_metric for insert with check (auth.uid() = user_id);
    create policy tm_update_own on training_metric for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy tm_delete_own on training_metric for delete using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists tm_user_created_idx on training_metric (user_id, created_at desc);

-- =========================================
-- OPTIONAL: Goals
-- =========================================
create table if not exists goal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  discipline text,
  target_depth numeric(6,2),
  target_date date,
  status text default 'planned' check (status in ('planned','in_progress','achieved','abandoned')),
  progress_percent smallint default 0 check (progress_percent between 0 and 100),
  plan jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_goal_updated_at on goal;
create trigger trg_goal_updated_at
before update on goal
for each row execute function set_updated_at();

alter table goal enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='goal' and policyname='goal_read_own') then
    create policy goal_read_own   on goal for select using (auth.uid() = user_id);
    create policy goal_write_own  on goal for insert with check (auth.uid() = user_id);
    create policy goal_update_own on goal for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy goal_delete_own on goal for delete using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists goal_user_date_idx on goal (user_id, target_date);

-- =========================================
-- OPTIONAL: Location catalog (personal + public entries)
-- =========================================
create table if not exists location_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- NULL = global/public
  name text not null,
  country_code text check (char_length(country_code) in (2,3)),
  lat numeric(9,6),
  lng numeric(9,6),
  difficulty smallint check (difficulty between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

alter table location_catalog enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='location_catalog' and policyname='lc_read_own_or_public') then
    create policy lc_read_own_or_public on location_catalog
      for select using (user_id is null or auth.uid() = user_id);
    create policy lc_write_own on location_catalog
      for insert with check (auth.uid() = user_id);
    create policy lc_update_own on location_catalog
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy lc_delete_own on location_catalog
      for delete using (auth.uid() = user_id);
  end if;
end $$;

create unique index if not exists lc_unique_user_name_idx
  on location_catalog (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), name, lat, lng);

-- =========================================
-- OPTIONAL: Coaching scaffolding (owner-only for now)
-- =========================================
create table if not exists coach_assignment (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  status text default 'active' check (status in ('active','paused','ended')),
  created_at timestamptz default now()
);

alter table coach_assignment enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='coach_assignment' and policyname='ca_read_own') then
    create policy ca_read_own   on coach_assignment for select using (auth.uid() = athlete_user_id or auth.uid() = coach_user_id);
    create policy ca_write_own  on coach_assignment for insert with check (auth.uid() = athlete_user_id or auth.uid() = coach_user_id);
    create policy ca_update_own on coach_assignment for update using (auth.uid() = athlete_user_id or auth.uid() = coach_user_id)
                                                       with check (auth.uid() = athlete_user_id or auth.uid() = coach_user_id);
  end if;
end $$;

create table if not exists dive_log_comment (
  id uuid primary key default gen_random_uuid(),
  dive_log_id uuid not null references dive_log(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table dive_log_comment enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='dive_log_comment' and policyname='dlc_read_owner_or_author') then
    create policy dlc_read_owner_or_author on dive_log_comment
      for select using (
        author_user_id = auth.uid()
        or exists (select 1 from dive_log dl where dl.id = dive_log_id and dl.user_id = auth.uid())
      );
    create policy dlc_write_author on dive_log_comment
      for insert with check (author_user_id = auth.uid());
    create policy dlc_delete_owner_or_author on dive_log_comment
      for delete using (
        author_user_id = auth.uid()
        or exists (select 1 from dive_log dl where dl.id = dive_log_id and dl.user_id = auth.uid())
      );
  end if;
end $$;
create index if not exists dlc_log_idx on dive_log_comment (dive_log_id, created_at);

-- =========================================
-- NOTE: Storage buckets setup moved to separate file
-- =========================================
-- Storage buckets and RLS policies are handled in:
-- - 2025-08-17_02_storage_buckets_and_policies.sql (commented out due to permission issues)
-- - Or manually through Supabase Dashboard -> Storage
-- - Or programmatically in application code using supabase.storage.createBucket()
--
-- Required buckets: 'dive-images', 'dive-images-compressed', 'user-docs'
