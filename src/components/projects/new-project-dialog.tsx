"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  createProject,
  type ProjectFormState,
} from "@/lib/projects/mutations";
import type { ProjectCategory } from "@/lib/categories/queries";

const INITIAL: ProjectFormState = { ok: false };

export function NewProjectDialog({
  categories,
}: {
  categories: ProjectCategory[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("new") === "1";

  const [state, formAction, pending] = useActionState(createProject, INITIAL);

  function onOpenChange(next: boolean) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("new", "1");
    else params.delete("new");
    router.replace(`?${params.toString()}`);
  }

  React.useEffect(() => {
    if (state.ok && open) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <>
      <Button size="sm" onClick={() => onOpenChange(true)}>
        <Plus />
        New project
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Add a client project. You can update status, members, tasks, and
              documents later.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" name="name" required maxLength={200} />
              {state.fieldErrors?.name ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client">Client</Label>
              <Input id="client" name="client" required maxLength={200} />
              {state.fieldErrors?.client ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.client}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <SelectNative
                id="categoryId"
                name="categoryId"
                defaultValue=""
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <SelectNative id="status" name="status" defaultValue="planning">
                  <option value="planning">Planning</option>
                  <option value="in_progress">In progress</option>
                  <option value="review">Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">Priority</Label>
                <SelectNative
                  id="priority"
                  name="priority"
                  defaultValue="medium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </SelectNative>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="progress">Progress %</Label>
                <Input
                  id="progress"
                  name="progress"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" name="deadline" type="date" />
              </div>
            </div>

            {state.message && !state.ok ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {state.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
