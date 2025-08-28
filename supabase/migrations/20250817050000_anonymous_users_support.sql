-- Temporary fix for anonymous users - allow text user_id
-- Run this in Supabase Studio → SQL Editor

-- Add a temporary text field for anonymous users
alter table dive_log add column if not exists anonymous_user_id text;

-- Create index for faster queries
create index if not exists dive_log_anonymous_user_idx on dive_log (anonymous_user_id, date desc);

-- Update RLS policies to handle anonymous users
drop policy if exists "dive_log_read_own_anonymous" on dive_log;
create policy "dive_log_read_own_anonymous" on dive_log
  for select using (
    (auth.uid() = user_id) OR 
    (auth.uid() is null and anonymous_user_id is not null)
  );

drop policy if exists "dive_log_write_own_anonymous" on dive_log;
create policy "dive_log_write_own_anonymous" on dive_log
  for insert with check (
    (auth.uid() = user_id) OR 
    (auth.uid() is null and anonymous_user_id is not null)
  );

drop policy if exists "dive_log_update_own_anonymous" on dive_log;
create policy "dive_log_update_own_anonymous" on dive_log
  for update using (
    (auth.uid() = user_id) OR 
    (auth.uid() is null and anonymous_user_id is not null)
  ) with check (
    (auth.uid() = user_id) OR 
    (auth.uid() is null and anonymous_user_id is not null)
  );

drop policy if exists "dive_log_delete_own_anonymous" on dive_log;
create policy "dive_log_delete_own_anonymous" on dive_log
  for delete using (
    (auth.uid() = user_id) OR 
    (auth.uid() is null and anonymous_user_id is not null)
  );
