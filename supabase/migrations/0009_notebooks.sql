-- =====================================================================
-- 0009_notebooks.sql
--
-- Private per-user notebooks. Each user owns their notebooks and pages.
--
-- PRIVACY: unlike every other table in this schema, the RLS policies here
-- deliberately DO NOT grant app admins any access. A notebook is readable and
-- writable ONLY by its owner (owner_id = auth.uid()). Do not add an
-- is_app_admin() bypass to these policies, and never read these tables with the
-- service-role client. The notebook is a private journal.
--
-- Idempotent. Run after 0008.
-- =====================================================================

-- ----- notebooks --------------------------------------------------------
create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My Notebook'
    check (char_length(title) between 1 and 120),
  theme text not null default 'minimal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notebooks_owner_id_idx on public.notebooks (owner_id);

drop trigger if exists notebooks_set_updated_at on public.notebooks;
create trigger notebooks_set_updated_at
  before update on public.notebooks
  for each row execute function public.set_updated_at();

-- ----- notebook_pages ---------------------------------------------------
create table if not exists public.notebook_pages (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  position integer not null default 0,
  title text check (title is null or char_length(title) <= 120),
  paper_style text not null default 'ruled',
  -- Tiptap document JSON for the page's rich text.
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  show_guides boolean not null default true,
  rounded boolean not null default true,
  shadow boolean not null default true,
  bookmarked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notebook_pages_notebook_id_position_idx
  on public.notebook_pages (notebook_id, position);

drop trigger if exists notebook_pages_set_updated_at on public.notebook_pages;
create trigger notebook_pages_set_updated_at
  before update on public.notebook_pages
  for each row execute function public.set_updated_at();

-- ----- RLS: owner-only (no admin bypass) --------------------------------
alter table public.notebooks enable row level security;
alter table public.notebook_pages enable row level security;

-- Notebooks: the owner is the only principal, for every operation.
drop policy if exists "Owners manage their notebooks" on public.notebooks;
create policy "Owners manage their notebooks"
  on public.notebooks for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Pages: access derives from owning the parent notebook.
drop policy if exists "Owners manage their notebook pages" on public.notebook_pages;
create policy "Owners manage their notebook pages"
  on public.notebook_pages for all
  to authenticated
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = notebook_id and n.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = notebook_id and n.owner_id = auth.uid()
    )
  );
