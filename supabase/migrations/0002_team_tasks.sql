-- =====================================================================
-- 0002_team_tasks.sql
-- Adds hybrid roles, project membership, and tasks.
--
-- Roles:
--   profiles.role            global    'admin' | 'member'
--   project_members.role     per-proj  'admin' | 'member'
--
-- Idempotent: safe to re-run if a previous run failed mid-way.
-- Run after 0001_init.sql.
-- =====================================================================

-- ----- Enums (CREATE TYPE has no IF NOT EXISTS, so use a guard) ---------

do $$ begin
  create type public.app_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_member_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

-- ----- profiles.role ----------------------------------------------------

alter table public.profiles
  add column if not exists role public.app_role not null default 'member';

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- ----- project_members (must exist before helper functions reference it) -

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.project_member_role not null default 'member',
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_id_idx
  on public.project_members (user_id);

alter table public.project_members enable row level security;

-- ----- tasks ------------------------------------------------------------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  assignee_id uuid references auth.users (id) on delete set null,
  status public.task_status not null default 'todo',
  due_date date,
  created_by uuid not null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);
create index if not exists tasks_status_idx on public.tasks (status);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- ----- Helper functions -------------------------------------------------
-- SECURITY DEFINER so they can read project_members / profiles without
-- triggering the RLS policies we're about to write on those very tables
-- (which would otherwise recurse).

create or replace function public.is_app_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

create or replace function public.is_project_member(pid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and user_id = uid
  );
$$;

create or replace function public.is_project_admin(pid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and user_id = uid and role = 'admin'
  );
$$;

-- ----- project_members policies -----------------------------------------

drop policy if exists "Members can read membership of their projects"
  on public.project_members;
create policy "Members can read membership of their projects"
  on public.project_members for select
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  );

drop policy if exists "Project admins and app admins can add members"
  on public.project_members;
create policy "Project admins and app admins can add members"
  on public.project_members for insert
  to authenticated
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

drop policy if exists "Project admins and app admins can update members"
  on public.project_members;
create policy "Project admins and app admins can update members"
  on public.project_members for update
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  )
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

drop policy if exists "Project admins and app admins can remove members"
  on public.project_members;
create policy "Project admins and app admins can remove members"
  on public.project_members for delete
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

-- ----- Rewrite projects policies to use membership ----------------------

drop policy if exists "Users can view their own projects" on public.projects;
drop policy if exists "Users can insert their own projects" on public.projects;
drop policy if exists "Users can update their own projects" on public.projects;
drop policy if exists "Users can delete their own projects" on public.projects;

drop policy if exists "Members and admins can view projects" on public.projects;
create policy "Members and admins can view projects"
  on public.projects for select
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_member(id, auth.uid())
  );

drop policy if exists "Authenticated users can create projects" on public.projects;
create policy "Authenticated users can create projects"
  on public.projects for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Project admins and app admins can update projects"
  on public.projects;
create policy "Project admins and app admins can update projects"
  on public.projects for update
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(id, auth.uid())
  )
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(id, auth.uid())
  );

drop policy if exists "Project admins and app admins can delete projects"
  on public.projects;
create policy "Project admins and app admins can delete projects"
  on public.projects for delete
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(id, auth.uid())
  );

-- ----- Auto-add creator as project admin --------------------------------

create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- ----- tasks policies ---------------------------------------------------

drop policy if exists "Members and admins can view tasks" on public.tasks;
create policy "Members and admins can view tasks"
  on public.tasks for select
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_member(project_id, auth.uid())
  );

drop policy if exists "Project admins and app admins can create tasks"
  on public.tasks;
create policy "Project admins and app admins can create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

drop policy if exists "Project admins, app admins, and assignees can update tasks"
  on public.tasks;
create policy "Project admins, app admins, and assignees can update tasks"
  on public.tasks for update
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
    or assignee_id = auth.uid()
  )
  with check (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
    or assignee_id = auth.uid()
  );

drop policy if exists "Project admins and app admins can delete tasks"
  on public.tasks;
create policy "Project admins and app admins can delete tasks"
  on public.tasks for delete
  to authenticated
  using (
    public.is_app_admin(auth.uid())
    or public.is_project_admin(project_id, auth.uid())
  );

-- ----- Backfill profiles for any pre-existing auth users ----------------
-- Users created before the on_auth_user_created trigger existed in 0001
-- won't have a profile row yet. Insert one for each.

insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data ->> 'full_name'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
