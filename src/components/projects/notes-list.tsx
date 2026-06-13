"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addNote, type NoteFormState } from "@/lib/notes/actions";
import type { Note } from "@/lib/notes/queries";

import { NoteEditor } from "./note-editor";
import { NoteItem } from "./note-item";

const INITIAL: NoteFormState = { ok: false };

export function NotesList({
  projectId,
  taskId,
  notes,
  currentUserId,
  canManage,
  showForm: showFormProp,
  onShowFormChange,
}: {
  projectId: string;
  taskId?: string;
  notes: Note[];
  currentUserId: string;
  canManage: boolean;
  /**
   * When provided, the form's open state is controlled by the parent and the
   * built-in "Add note" trigger is hidden (the parent owns the trigger). The
   * task tree uses this so the add-note action can live in the row toolbar.
   */
  showForm?: boolean;
  onShowFormChange?: (open: boolean) => void;
}) {
  const controlled = onShowFormChange !== undefined;
  const [showFormState, setShowFormState] = React.useState(false);
  const showForm = controlled ? Boolean(showFormProp) : showFormState;
  const setShowForm = React.useCallback(
    (open: boolean) => {
      if (controlled) onShowFormChange?.(open);
      else setShowFormState(open);
    },
    [controlled, onShowFormChange],
  );
  const [state, formAction, pending] = useActionState(addNote, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowForm(false);
    }
  }, [state.ok, setShowForm]);

  return (
    <div className="flex flex-col gap-3">
      {notes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              projectId={projectId}
              currentUserId={currentUserId}
              canManage={canManage}
            />
          ))}
        </ul>
      ) : null}

      {showForm ? (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] p-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          {taskId ? (
            <input type="hidden" name="taskId" value={taskId} />
          ) : null}

          <Input name="title" placeholder="Title (optional)" autoFocus />
          <NoteEditor name="body" />
          {state.message && !state.ok ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving..." : "Save note"}
            </Button>
          </div>
        </form>
      ) : !controlled ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="self-start"
        >
          <Plus />
          Add note
        </Button>
      ) : null}
    </div>
  );
}
