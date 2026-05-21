-- =====================================================================
-- 0006_member_profiles.sql
-- Richer member profiles + the data needed for a per-member progress
-- report.
--
--   1. Extra profile detail columns (title, phone, location, bio).
--      avatar_url already exists from 0001.
--   2. tasks.completed_at, so weekly productivity can be measured by when
--      work was actually finished (backfilled from updated_at for existing
--      done tasks; kept current by the updateTaskStatus action).
--   3. An "avatars" Storage bucket + policies so members can upload a
--      profile image (their own folder), and admins can manage any.
--
-- Idempotent: safe to re-run. Run after 0005_member_task_contributions.sql.
-- =====================================================================

-- ----- profile detail columns -------------------------------------------

alter table public.profiles
  add column if not exists title text,
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists bio text;

-- ----- task completion timestamp ----------------------------------------

alter table public.tasks
  add column if not exists completed_at timestamptz;

update public.tasks
  set completed_at = updated_at
  where status = 'done' and completed_at is null;

-- ----- avatars storage bucket -------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read avatars (public bucket; used for <img> src).
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Path convention: "<user_id>/<filename>". Users manage their own folder;
-- app admins manage anyone's.
drop policy if exists "Users manage their own avatar" on storage.objects;
create policy "Users manage their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_app_admin(auth.uid())
    )
  );

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_app_admin(auth.uid())
    )
  );

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_app_admin(auth.uid())
    )
  );
