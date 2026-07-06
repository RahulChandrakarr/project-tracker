-- =====================================================================
-- 0021_daily_attendance.sql
--
-- Per-user daily attendance for the Work Calendar. A user sets their own
-- attendance; app admins can set anyone's. No row for a working day means
-- the user is treated as absent (the implicit default).
--
-- Read visibility matches the rest of the calendar (owner + app admins +
-- project admins on shared projects) via can_view_user_calendar (0017).
--
-- Idempotent. Run after 0020.
-- =====================================================================

do $$
begin
  create type public.attendance_status as enum (
    'present',
    'absent',
    'half_day',
    'paid_leave',
    'sick_leave',
    'work_from_home',
    'holiday'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.daily_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, attendance_date)
);

create index if not exists daily_attendance_user_date_idx
  on public.daily_attendance (user_id, attendance_date);

drop trigger if exists daily_attendance_set_updated_at on public.daily_attendance;
create trigger daily_attendance_set_updated_at
  before update on public.daily_attendance
  for each row execute function public.set_updated_at();

alter table public.daily_attendance enable row level security;

-- ----- RLS --------------------------------------------------------------
-- View: same audience as the rest of the calendar.
-- Write: the owner, or any app admin (for anyone).

drop policy if exists "View daily attendance" on public.daily_attendance;
create policy "View daily attendance"
  on public.daily_attendance for select
  to authenticated
  using (public.can_view_user_calendar(auth.uid(), user_id));

drop policy if exists "Insert daily attendance" on public.daily_attendance;
create policy "Insert daily attendance"
  on public.daily_attendance for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Update daily attendance" on public.daily_attendance;
create policy "Update daily attendance"
  on public.daily_attendance for update
  to authenticated
  using (auth.uid() = user_id or public.is_app_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_app_admin(auth.uid()));

drop policy if exists "Delete daily attendance" on public.daily_attendance;
create policy "Delete daily attendance"
  on public.daily_attendance for delete
  to authenticated
  using (auth.uid() = user_id or public.is_app_admin(auth.uid()));
