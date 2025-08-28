-- =========================================
-- Storage RLS Policies (Cloud Setup)
-- =========================================
-- Run this in Supabase Studio → SQL Editor AFTER creating buckets manually
-- 
-- Required buckets (create these manually in Studio → Storage):
-- 1. dive-images (private)
-- 2. dive-images-compressed (private) 
-- 3. user-docs (private)
--
-- This script only creates the RLS policies for the buckets

-- Policies for dive-images bucket
drop policy if exists "Users can upload own images" on storage.objects;
create policy "Users can upload own images"
  on storage.objects for insert
  with check (bucket_id = 'dive-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can view own images" on storage.objects;
create policy "Users can view own images"
  on storage.objects for select
  using (bucket_id = 'dive-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own images" on storage.objects;
create policy "Users can update own images"
  on storage.objects for update
  using (bucket_id = 'dive-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own images" on storage.objects;
create policy "Users can delete own images"
  on storage.objects for delete
  using (bucket_id = 'dive-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for dive-images-compressed bucket
drop policy if exists "Users can upload own compressed images" on storage.objects;
create policy "Users can upload own compressed images"
  on storage.objects for insert
  with check (bucket_id = 'dive-images-compressed' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can view own compressed images" on storage.objects;
create policy "Users can view own compressed images"
  on storage.objects for select
  using (bucket_id = 'dive-images-compressed' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own compressed images" on storage.objects;
create policy "Users can update own compressed images"
  on storage.objects for update
  using (bucket_id = 'dive-images-compressed' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own compressed images" on storage.objects;
create policy "Users can delete own compressed images"
  on storage.objects for delete
  using (bucket_id = 'dive-images-compressed' and auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for user-docs bucket
drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (bucket_id = 'user-docs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can view own documents" on storage.objects;
create policy "Users can view own documents"
  on storage.objects for select
  using (bucket_id = 'user-docs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own documents" on storage.objects;
create policy "Users can update own documents"
  on storage.objects for update
  using (bucket_id = 'user-docs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own documents" on storage.objects;
create policy "Users can delete own documents"
  on storage.objects for delete
  using (bucket_id = 'user-docs' and auth.uid()::text = (storage.foldername(name))[1]);
