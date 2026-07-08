-- =====================================================================
-- 0023_notion_oauth.sql
--
-- Per-user Notion OAuth connection for the real API integration (reading
-- and writing Notion data). Distinct from notion_embed_url (0022), which is
-- just an iframe link. Both features coexist.
--
-- SECURITY: holds the OAuth access token (a secret). RLS is enabled with NO
-- policies, so it is unreachable from the client. All access goes through
-- server code using the service-role client, gated by the signed-in user.
-- Never select access_token into client-facing props.
--
-- Idempotent. Run after 0022.
-- =====================================================================

create table if not exists public.notion_oauth (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  bot_id text,
  workspace_id text,
  workspace_name text,
  workspace_icon text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notion_oauth_set_updated_at on public.notion_oauth;
create trigger notion_oauth_set_updated_at
  before update on public.notion_oauth
  for each row execute function public.set_updated_at();

-- RLS on, deliberately no policies: service-role only.
alter table public.notion_oauth enable row level security;
