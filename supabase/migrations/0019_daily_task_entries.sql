-- =====================================================================
-- 0019_daily_task_entries.sql
--
-- Structured per-day task entries for the Work Calendar. Replaces the
-- single free-text daily_work_logs body as the editable surface: a user
-- logs multiple tasks against a day, each with a status and an optional
-- project. Managers (app admins + project admins on shared projects) can
-- read; only the owner writes.
--
-- Idempotent. Run after 0018.
-- =====================================================================

create table if not exists public.daily_task_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  title text not null,
  status public.task_status not null default 'todo',
  project_id uuid references public.projects (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_task_entries_user_date_idx
  on public.daily_task_entries (user_id, entry_date);

drop trigger if exists daily_task_entries_set_updated_at on public.daily_task_entries;
create trigger daily_task_entries_set_updated_at
  before update on public.daily_task_entries
  for each row execute function public.set_updated_at();

alter table public.daily_task_entries enable row level security;

-- ----- RLS --------------------------------------------------------------
-- Reuses the can_view_user_calendar helper from 0017.

drop policy if exists "View daily task entries" on public.daily_task_entries;
create policy "View daily task entries"
  on public.daily_task_entries for select
  to authenticated
  using (public.can_view_user_calendar(auth.uid(), user_id));

drop policy if exists "Insert own daily task entries" on public.daily_task_entries;
create policy "Insert own daily task entries"
  on public.daily_task_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Update own daily task entries" on public.daily_task_entries;
create policy "Update own daily task entries"
  on public.daily_task_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Delete own daily task entries" on public.daily_task_entries;
create policy "Delete own daily task entries"
  on public.daily_task_entries for delete
  to authenticated
  using (auth.uid() = user_id);
