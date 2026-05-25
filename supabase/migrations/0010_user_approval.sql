-- =====================================================================
-- 0010_user_approval.sql
--
-- Admin approval gate. Self-registered users (via /signup) land as
-- approved = false and stay out of the workspace until an app admin accepts
-- them. Admin-created and admin-invited users are approved by the action that
-- creates them. App admins are never gated.
--
-- Existing users are grandfathered in as approved so nobody currently using
-- the app gets locked out.
--
-- Idempotent: the column is added nullable, existing NULLs are backfilled to
-- true (a no-op on re-run once NOT NULL is set), then the default flips to
-- false for all future sign-ups. Run after 0009.
-- =====================================================================

alter table public.profiles
  add column if not exists approved boolean;

-- Grandfather everyone who already exists (only touches un-set rows).
update public.profiles set approved = true where approved is null;

alter table public.profiles alter column approved set default false;
alter table public.profiles alter column approved set not null;
