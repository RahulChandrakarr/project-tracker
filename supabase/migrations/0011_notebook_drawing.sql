-- =====================================================================
-- 0011_notebook_drawing.sql
--
-- Adds a freehand drawing layer to each notebook page: pencil / pen / marker
-- / highlighter / eraser strokes stored as JSON ({ "strokes": [...] }).
-- Private via the existing owner-only notebook_pages RLS (no new policy).
--
-- Idempotent. Run after 0010.
-- =====================================================================

alter table public.notebook_pages
  add column if not exists drawing jsonb not null default '{"strokes":[]}'::jsonb;
