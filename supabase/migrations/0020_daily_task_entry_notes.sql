-- =====================================================================
-- 0020_daily_task_entry_notes.sql
--
-- Adds a rich-text notes field to each day task entry. Stored as HTML
-- (same format as project notes). Optional; defaults to empty.
--
-- Idempotent. Run after 0019.
-- =====================================================================

alter table public.daily_task_entries
  add column if not exists notes text not null default '';
