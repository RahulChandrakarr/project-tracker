-- =====================================================================
-- 0003_categories_subtasks_docs.sql
--
-- Adds:
--   - project_categories table + projects.category_id FK
--   - tasks.parent_id (self-referencing, supports n-level subtasks)
--   - project_documents table (kind = 'link' | 'file')
--   - Supabase Storage bucket "project-documents" + RLS on storage.objects
--
-- Idempotent. Run after 0002.
-- =====================================================================

-- ----- project_documents kind enum --------------------------------------

do $$ begin
  create type public.document_kind as enum ('link', 'file');
exception when duplicate_object then null; end $$;

-- ----- project_categories -----------------------------------------------

create table if not exists public.project_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 100),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.project_categories enable row level security;

-- Everyone authenticated can read categories — they're shared workspace
-- metadata, like tags. Only app-admins can create/update/delete.
drop policy if exists "Authenticated can read categories"
  on public.project_categories;
create policy "Authenticated can read categories"
  on public.project_categories for select
  to authenticated
  using (true);

drop policy if exists "App admins can insert categories"
  on public.project_categories;
create policy "App admins can insert categories"
  on public.project_categories for insert
  to authenticated
  with check (public.is_app_admin(auth.uid()));

drop policy if exists "App admins can update categories"
  on public.project_categories;
create policy "App admins can update categories"
  on public.project_categories for update
  to authenticated
  using (public.is_app_admin(auth.uid()))
  with check (public.is_app_admin(auth.uid()));

drop policy if exists "App admins can delete categories"
  on public.project_categories;
create policy "App admins can delete categories"
  on public.project_categories for delete
  to authenticated
  using (public.is_app_admin(auth.uid()));

-- ----- projects.category_id ---------------------------------------------

alter table public.projects
  add column if not exists category_id uuid
    references public.project_categories (id) on delete set null;

create index if not exists projects_category_id_idx
  on public.projects (category_id);

-- ----- Seed a few default categories so the dropdown isn't empty ---------

insert into public.project_categories (name)
values
  ('Website'),
  ('SEO'),
  ('Ad campaign'),
  ('Internal'),
  ('Branding')
on conflict (name) do nothing;

-- ----- tasks.parent_id --------------------------------------------------

alter table public.tasks
  add column if not exists parent_id uuid
    references public.tasks (id) on delete cascade;

create index if not exists tasks_parent_id_idx on public.tasks (parent_id);

-- Prevent a task from being its own ancestor. Simple guard against the
-- 1-cycle case (a row pointing to itself). Deeper cycles are still possible
-- in theory but require manual intervention; the UI never builds one.
alter table public.tasks
  drop constraint if exists tasks_no_self_parent;
alter table public.tasks
  add constraint tasks_no_self_parent check (id <> parent_id);

-- ----- project_documents ------------------------------------------------

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind public.document_kind not null,
  name text not null check (char_length(name) between 1 and 200),
  url text not null,
  storage_path text,                   -- only for kind='file', null otherwise
  size_bytes bigint,
  mime_type text,
  created_by uuid not null references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx
  on public.project_documents (project_id);

alter table public.project_documents enable row level security;

drop policy if exists "Members can view documents" on public.project_documents;
create policy "Members can view documents"
  on public.project_documents for select
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  );

drop policy if exists "Project admins can add documents"
  on public.project_documents;
create policy "Project admins can add documents"
  on public.project_documents for insert
  to authenticated
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

drop policy if exists "Project admins can update documents"
  on public.project_documents;
create policy "Project admins can update documents"
  on public.project_documents for update
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  )
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

drop policy if exists "Project admins can delete documents"
  on public.project_documents;
create policy "Project admins can delete documents"
  on public.project_documents for delete
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

-- ----- Storage bucket for file uploads -----------------------------------
-- Bucket is private; files served via signed URLs from the server.
-- File path convention: <project_id>/<uuid>-<filename>

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Helper: given a storage path "<project_id>/...", extract the project uuid.
create or replace function public.storage_object_project_id(path text)
returns uuid
language sql
immutable
as $$
  select case
    when path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
    then (split_part(path, '/', 1))::uuid
    else null
  end;
$$;

drop policy if exists "Members can read project files" on storage.objects;
create policy "Members can read project files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-documents'
    and (
      public.is_app_admin(auth.uid())
      or public.is_project_member(
        public.storage_object_project_id(name),
        auth.uid()
      )
    )
  );

drop policy if exists "Project admins can upload project files"
  on storage.objects;
create policy "Project admins can upload project files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-documents'
    and (
      public.is_app_admin(auth.uid())
      or public.is_project_admin(
        public.storage_object_project_id(name),
        auth.uid()
      )
    )
  );

drop policy if exists "Project admins can delete project files"
  on storage.objects;
create policy "Project admins can delete project files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-documents'
    and (
      public.is_app_admin(auth.uid())
      or public.is_project_admin(
        public.storage_object_project_id(name),
        auth.uid()
      )
    )
  );
