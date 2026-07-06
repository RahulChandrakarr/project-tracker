-- =====================================================================
-- 0022_profile_notion_embed.sql
--
-- Per-user Notion embed. Each user can paste a shareable Notion link
-- (published page or Notion Calendar link) to embed on their profile.
-- Not a secret, just a URL, so it lives on the profile row.
--
-- Idempotent. Run after 0021.
-- =====================================================================

alter table public.profiles
  add column if not exists notion_embed_url text;
