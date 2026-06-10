-- =====================================================================
-- 0013_task_effort.sql
-- Optional effort/time estimate on a task: how time-consuming it is.
-- Set when creating or assigning a task and editable later; feeds the
-- per-member profile effort breakdown. Always optional, so nullable.
-- Idempotent: safe to re-run. Run after 0012_note_title.sql.
-- =====================================================================

alter table public.tasks
  add column if not exists effort text
    check (effort is null or effort in ('quick', 'medium', 'large'));
