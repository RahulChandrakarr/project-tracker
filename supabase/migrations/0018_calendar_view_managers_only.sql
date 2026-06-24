-- =====================================================================
-- 0018_calendar_view_managers_only.sql
--
-- Tighten calendar visibility: only the calendar owner or a project admin
-- on a shared project may read someone else's daily work log. Regular
-- project members (employees) cannot.
--
-- Workspace app admins are enforced at the application layer (access.ts)
-- with the service-role client; RLS here is project-admin scoped only.
--
-- Idempotent. Run after 0017.
-- =====================================================================

create or replace function public.can_view_user_calendar(viewer uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    viewer = target
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
