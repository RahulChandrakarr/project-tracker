-- =====================================================================
-- 0005_member_task_contributions.sql
-- Let any project member (not just project/app admins or assignees)
-- create tasks and update tasks (e.g. change status).
--
-- Deleting tasks and reassigning members stays admin-only (those policies
-- are unchanged). Idempotent: safe to re-run. Run after 0004_notes.sql.
-- =====================================================================

-- ----- tasks: any member can create -------------------------------------

drop policy if exists "Project admins and app admins can create tasks"
  on public.tasks;
drop policy if exists "Members and admins can create tasks" on public.tasks;
create policy "Members and admins can create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  );

-- ----- tasks: any member can update (status, etc.) ----------------------

drop policy if exists "Project admins, app admins, and assignees can update tasks"
  on public.tasks;
drop policy if exists "Members and admins can update tasks" on public.tasks;
create policy "Members and admins can update tasks"
  on public.tasks for update
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  )
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  );
