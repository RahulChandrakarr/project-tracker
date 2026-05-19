"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  createTask,
  type TaskFormState,
} from "@/lib/tasks/mutations";
import type { TaskNode as TaskNodeData } from "@/lib/tasks/queries";
import type { ProjectMember } from "@/lib/members/queries";
import type { Note } from "@/lib/notes/queries";

import { TaskNode } from "./task-node";

const INITIAL: TaskFormState = { ok: false };

export function TasksCard({
  projectId,
  tree,
  members,
  notesByTaskId,
  canManage,
  currentUserId,
}: {
  projectId: string;
  tree: TaskNodeData[];
  members: ProjectMember[];
  notesByTaskId: Map<string, Note[]>;
  canManage: boolean;
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(createTask, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const totalTasks = countTasks(tree);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <CardDescription>
          {totalTasks} task{totalTasks === 1 ? "" : "s"}
          {canManage ? " — assign to members, break into subtasks, add notes." : "."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {canManage ? (
          <form
            ref={formRef}
            action={formAction}
            className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] p-4"
          >
            <input type="hidden" name="projectId" value={projectId} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">New task</Label>
              <Input
                id="title"
                name="title"
                placeholder="What needs doing?"
                required
                maxLength={200}
              />
              {state.fieldErrors?.title ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.title}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assigneeId">Assignee</Label>
                <SelectNative id="assigneeId" name="assigneeId" defaultValue="">
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName ?? m.userId.slice(0, 8)}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <SelectNative id="status" name="status" defaultValue="todo">
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDate">Due</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
            </div>

            {state.message && !state.ok ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {state.message}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                <Plus />
                Add task
              </Button>
            </div>
          </form>
        ) : null}

        {tree.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No tasks yet.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            {tree.map((node) => (
              <TaskNode
                key={node.id}
                node={node}
                members={members}
                notesByTaskId={notesByTaskId}
                canManage={canManage}
                currentUserId={currentUserId}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function countTasks(nodes: TaskNodeData[]): number {
  let total = 0;
  for (const n of nodes) {
    total += 1 + countTasks(n.children);
  }
  return total;
}
