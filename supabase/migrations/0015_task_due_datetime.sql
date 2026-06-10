-- =====================================================================
-- 0015_task_due_datetime.sql
-- A task's due date now carries a time of day, not just a date, so
-- deadlines can be scheduled to the minute. Widens tasks.due_date from
-- `date` to `timestamptz`. Existing date-only values cast to midnight.
-- Idempotent: the cast is a no-op once the column is already timestamptz.
-- Run after 0014_task_priority_and_attachments.sql.
-- =====================================================================

alter table public.tasks
  alter column due_date type timestamptz
    using due_date::timestamptz;
