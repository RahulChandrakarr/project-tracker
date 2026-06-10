-- =====================================================================
-- 0014_task_priority_and_attachments.sql
-- 1. Replaces the optional task "effort" estimate with a "priority" level.
--    The old effort scale (quick/medium/large) maps to priority
--    (low/medium/high). Always optional, so still nullable.
-- 2. Lets a document/file row hang off a single task (task_id), so files
--    can be attached per task. Null task_id means a project-level document.
-- Idempotent: safe to re-run. Run after 0013_task_effort.sql.
-- =====================================================================

-- ---- effort -> priority --------------------------------------------
-- Rename the column and remap its values only if the old column is still
-- present, so a re-run is a no-op.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'effort'
  ) then
    alter table public.tasks drop constraint if exists tasks_effort_check;
    alter table public.tasks rename column effort to priority;
    update public.tasks
      set priority = case priority
        when 'quick' then 'low'
        when 'large' then 'high'
        else priority
      end
      where priority in ('quick', 'large');
  end if;
end $$;

-- Ensure the column exists (fresh installs that somehow skipped 0013) and
-- carries the new check constraint.
alter table public.tasks
  add column if not exists priority text;

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks
  add constraint tasks_priority_check
    check (priority is null or priority in ('low', 'medium', 'high'));

-- ---- per-task file attachments -------------------------------------
-- A document row can belong to one task. Deleting the task removes its
-- attachment rows (the storage object cleanup is best-effort elsewhere).
alter table public.project_documents
  add column if not exists task_id uuid references public.tasks(id) on delete cascade;

create index if not exists project_documents_task_id_idx
  on public.project_documents(task_id);
