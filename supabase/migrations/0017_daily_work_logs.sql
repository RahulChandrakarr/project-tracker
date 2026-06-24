-- =====================================================================
-- 0017_daily_work_logs.sql
--
-- Per-user daily work logs for the Work Calendar. Managers (app admins
-- and project admins on shared projects) can read; only the owner writes.
--
-- Idempotent. Run after 0016.
-- =====================================================================

-- ----- daily_work_logs --------------------------------------------------

create table if not exists public.daily_work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists daily_work_logs_user_id_log_date_idx
  on public.daily_work_logs (user_id, log_date);

drop trigger if exists daily_work_logs_set_updated_at on public.daily_work_logs;
create trigger daily_work_logs_set_updated_at
  before update on public.daily_work_logs
  for each row execute function public.set_updated_at();

alter table public.daily_work_logs enable row level security;

-- ----- visibility helper ------------------------------------------------

create or replace function public.can_view_user_calendar(viewer uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    viewer = target
    or public.is_app_admin(viewer)
    or exists (
      select 1
      from public.project_members pm_viewer
      join public.project_members pm_target
        on pm_target.project_id = pm_viewer.project_id
       and pm_target.user_id = target
      where pm_viewer.user_id = viewer
        and pm_viewer.role = 'admin'
    );
$$;

-- ----- RLS --------------------------------------------------------------

drop policy if exists "View daily work logs" on public.daily_work_logs;
create policy "View daily work logs"
  on public.daily_work_logs for select
  to authenticated
  using (public.can_view_user_calendar(auth.uid(), user_id));

drop policy if exists "Insert own daily work logs" on public.daily_work_logs;
create policy "Insert own daily work logs"
  on public.daily_work_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Update own daily work logs" on public.daily_work_logs;
create policy "Update own daily work logs"
  on public.daily_work_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Delete own daily work logs" on public.daily_work_logs;
create policy "Delete own daily work logs"
  on public.daily_work_logs for delete
  to authenticated
  using (auth.uid() = user_id);
