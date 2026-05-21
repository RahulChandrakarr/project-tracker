import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          {notes.length} note{notes.length === 1 ? "" : "s"} on this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NotesList
          projectId={projectId}
          notes={notes}
          currentUserId={currentUserId}
          canManage={canManage}
        />
      </CardContent>
    </Card>
  );
}
