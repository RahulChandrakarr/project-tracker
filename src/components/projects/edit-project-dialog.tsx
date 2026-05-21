"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";

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
  deleteProject,
  updateProject,
  type ProjectFormState,
} from "@/lib/projects/mutations";
import type { ProjectCategory } from "@/lib/categories/queries";
import type { Project } from "@/lib/projects/queries";

const INITIAL: ProjectFormState = { ok: false };

export function EditProjectDialog({
  project,
  categories,
}: {
  project: Project;
  categories: ProjectCategory[];
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ProjectFormState, formData: FormData) => {
      const result = await updateProject(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    INITIAL,
  );

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmingDelete(false);
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onOpenChange(true)}
      >
        <Pencil />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Update the project details. Progress and status also sync with
              the inline controls.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={project.id} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={200}
                defaultValue={project.name}
              />
              {state.fieldErrors?.name ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                name="client"
                required
                maxLength={200}
                defaultValue={project.client}
              />
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
                defaultValue={project.category_id ?? ""}
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
                <SelectNative
                  id="status"
                  name="status"
                  defaultValue={project.status}
                >
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
                  defaultValue={project.priority}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </SelectNative>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={project.deadline ?? ""}
              />
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
                {pending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>

          <div className="mt-2 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
            {confirmingDelete ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Permanently delete this project and everything in it: tasks,
                  notes, documents, and members. This can&apos;t be undone.
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep project
                  </Button>
                  <form action={deleteProject}>
                    <input type="hidden" name="id" value={project.id} />
                    <Button type="submit" variant="destructive">
                      <Trash2 />
                      Delete project
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="w-fit text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 />
                Delete project
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
