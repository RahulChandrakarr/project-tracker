-- 0007_task_position.sql
-- Adds a persisted manual ordering to tasks (drag-to-reorder) plus a helper
-- that writes a new sibling order in a single statement.
--
-- Ordering contract: tasks are ordered within their sibling group (same
-- project_id + parent_id) by `position` ascending. The app additionally sinks
-- done tasks to the bottom of each group when rendering/querying, so a
-- completed task always shows below the active ones regardless of position.
--
-- Idempotent: safe to re-run (won't error, won't clobber a manual order that
-- has already diverged from the created_at default). Run after 0006.
-- =====================================================================

alter table public.tasks
  add column if not exists position integer not null default 0;

-- Backfill once: number existing tasks within each sibling group by created_at
-- so today's visual order becomes the initial manual order. Skipped on re-run
-- if any task already carries a non-zero position (i.e. users have reordered).
do $$
begin
  if not exists (select 1 from public.tasks where position <> 0) then
    with ordered as (
      select
        id,
        row_number() over (
          partition by
            project_id,
            coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
          order by created_at
        ) - 1 as rn
      from public.tasks
    )
    update public.tasks t
    set position = ordered.rn
    from ordered
    where ordered.id = t.id;
  end if;
end $$;

create index if not exists tasks_order_idx
  on public.tasks (project_id, parent_id, position);

-- Write a new order for a set of sibling task ids: position = array index.
-- SECURITY INVOKER so the caller's RLS (project/app admin or assignee) governs
-- which rows may actually be updated.
create or replace function public.reorder_tasks(p_ids uuid[])
returns void
language sql
security invoker
as $$
  update public.tasks t
  set position = x.ord - 1
  from unnest(p_ids) with ordinality as x(id, ord)
  where t.id = x.id;
$$;

grant execute on function public.reorder_tasks(uuid[]) to authenticated;
