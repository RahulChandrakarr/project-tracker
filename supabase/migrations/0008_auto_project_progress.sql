-- 0008_auto_project_progress.sql
-- Makes projects.progress a derived value: the share of a project's tasks that
-- are done (0-100), recomputed by a trigger whenever tasks change. Replaces the
-- old manual progress entry.
--
-- progress = round(100 * done_tasks / total_tasks), or 0 when a project has no
-- tasks. Every task counts equally (subtasks included).
--
-- Idempotent: safe to re-run. Run after 0007.
-- =====================================================================

-- Recompute one project's progress from its tasks. SECURITY DEFINER so the
-- trigger can update projects even when the user changing a task isn't a
-- project admin (members/assignees can change task status).
create or replace function public.recalc_project_progress(p_project_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.projects p
  set
    progress = coalesce((
      select round(
        100.0 * count(*) filter (where t.status = 'done') / nullif(count(*), 0)
      )::int
      from public.tasks t
      where t.project_id = p_project_id
    ), 0),
    updated_at = now()
  where p.id = p_project_id;
$$;

-- Trigger glue: recompute the affected project(s) after a task is added,
-- removed, or has its status changed. (Reorders/assignee edits don't fire it.)
create or replace function public.tasks_sync_project_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recalc_project_progress(old.project_id);
    return old;
  end if;

  perform public.recalc_project_progress(new.project_id);
  -- A task moving to a different project (rare) needs both recomputed.
  if (tg_op = 'UPDATE' and new.project_id is distinct from old.project_id) then
    perform public.recalc_project_progress(old.project_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_sync_project_progress on public.tasks;
create trigger tasks_sync_project_progress
  after insert or delete or update of status on public.tasks
  for each row execute function public.tasks_sync_project_progress();

-- Backfill every project (including those with no tasks -> 0) so stored values
-- match the new derived rule immediately.
update public.projects p
set progress = coalesce((
  select round(
    100.0 * count(*) filter (where t.status = 'done') / nullif(count(*), 0)
  )::int
  from public.tasks t
  where t.project_id = p.id
), 0);
