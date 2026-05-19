-- =====================================================================
-- 0004_notes.sql
--
-- Replaces the single-textarea notes (projects.notes, tasks.description)
-- with a multi-note model. Each note belongs to a project; optionally it
-- also belongs to a task within that project.
--
-- The old columns are kept (no data drop) so old single-note content is
-- still readable. UI now writes here.
--
-- Idempotent. Run after 0003.
-- =====================================================================

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_project_id_idx on public.notes (project_id);
create index if not exists notes_task_id_idx on public.notes (task_id);
create index if not exists notes_created_at_idx on public.notes (created_at desc);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;

-- Anyone with project access can read every note on the project,
-- regardless of whether it's a project-level or task-level note.
drop policy if exists "Members and admins can view notes" on public.notes;
create policy "Members and admins can view notes"
  on public.notes for select
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  );

-- Any project member can post notes. (Project admins, app admins, and
-- regular members all participate in the conversation.)
drop policy if exists "Members can post notes" on public.notes;
create policy "Members can post notes"
  on public.notes for insert
  to authenticated
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  );

-- Authors can edit their own notes; project admins can edit any note.
drop policy if exists "Authors and admins can update notes" on public.notes;
create policy "Authors and admins can update notes"
  on public.notes for update
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
    or created_by = auth.uid()
  )
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
    or created_by = auth.uid()
  );

-- Same rule for delete.
drop policy if exists "Authors and admins can delete notes" on public.notes;
create policy "Authors and admins can delete notes"
  on public.notes for delete
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
    or created_by = auth.uid()
  );
