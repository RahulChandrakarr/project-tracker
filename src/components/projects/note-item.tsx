"use client";

import * as React from "react";
import { useActionState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

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
import { deleteNote, updateNote, type NoteFormState } from "@/lib/notes/actions";
import type { Note } from "@/lib/notes/queries";

import { NoteBody, NoteEditor } from "./note-editor";

const INITIAL: NoteFormState = { ok: false };

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteItem({
  note,
  projectId,
  currentUserId,
  canManage,
}: {
  note: Note;
  projectId: string;
  currentUserId: string;
  canManage: boolean;
}) {
  // RLS allows authors and project/app admins to edit and delete.
  const canEdit = canManage || note.created_by === currentUserId;
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(updateNote, INITIAL);

  React.useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditOpen(false);
    }
  }, [state.ok]);

  const author = note.author?.fullName ?? "Unknown";
  const meta = `${author} · ${formatDate(note.created_at)}`;

  return (
    <li className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          {note.title ? (
            <p className="truncate text-sm font-medium">{note.title}</p>
          ) : null}
          <NoteBody body={note.body} clamp />
        </button>
        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="View note"
            onClick={() => setViewOpen(true)}
          >
            <Eye />
          </Button>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Edit note"
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
            </Button>
          ) : null}
          {canEdit ? (
            <form action={deleteNote}>
              <input type="hidden" name="noteId" value={note.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Delete note"
              >
                <Trash2 />
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="mt-2 text-xs text-[var(--color-muted-foreground)]">
        {meta}
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{note.title || "Note"}</DialogTitle>
            <DialogDescription>{meta}</DialogDescription>
          </DialogHeader>
          <NoteBody body={note.body} />
        </DialogContent>
      </Dialog>

      {canEdit ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit note</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="noteId" value={note.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <Input
                name="title"
                placeholder="Title (optional)"
                defaultValue={note.title ?? ""}
              />
              <NoteEditor name="body" defaultValue={note.body} />
              {state.message && !state.ok ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.message}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </li>
  );
}
