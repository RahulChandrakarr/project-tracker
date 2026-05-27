-- =====================================================================
-- 0012_note_title.sql
--
-- Adds an optional title to each note and removes the 4000 character cap
-- on the body. Notes can now be any length; only the non-empty rule stays.
--
-- Idempotent. Run after 0011.
-- =====================================================================

alter table public.notes
  add column if not exists title text;

-- Drop the original `char_length(body) between 1 and 4000` check
-- (auto-named notes_body_check) and replace it with a non-empty rule only.
alter table public.notes
  drop constraint if exists notes_body_check;

alter table public.notes
  add constraint notes_body_check check (char_length(body) >= 1);
