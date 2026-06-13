import { CollapsibleCard } from "@/components/ui/collapsible-card";
import type { Note } from "@/lib/notes/queries";

import { NotesList } from "./notes-list";

export function ProjectNotesCard({
  projectId,
  notes,
  currentUserId,
  canManage,
}: {
  projectId: string;
  notes: Note[];
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <CollapsibleCard
      title="Notes"
      badge={notes.length > 0 ? notes.length : undefined}
      // Open by default only when there's something to show.
      defaultOpen={notes.length > 0}
      description={`${notes.length} note${notes.length === 1 ? "" : "s"} on this project.`}
    >
      <NotesList
        projectId={projectId}
        notes={notes}
        currentUserId={currentUserId}
        canManage={canManage}
      />
    </CollapsibleCard>
  );
}
