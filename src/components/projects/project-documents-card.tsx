"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  ExternalLink,
  FileText,
  LinkIcon,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

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
import {
  addLink,
  deleteDocument,
  uploadFile,
  type DocumentFormState,
} from "@/lib/documents/actions";
import type { ProjectDocument } from "@/lib/documents/queries";
import { formatDate } from "@/lib/format";

const INITIAL: DocumentFormState = { ok: false };

export function ProjectDocumentsCard({
  projectId,
  documents,
  canManage,
}: {
  projectId: string;
  documents: ProjectDocument[];
  canManage: boolean;
}) {
  const [showForms, setShowForms] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          Links (GitHub, Vercel, dashboards) and uploaded files.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {documents.length > 0 ? (
          <ul className="flex flex-col divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
            {documents.map((d) => (
              <DocumentRow
                key={d.id}
                document={d}
                projectId={projectId}
                canManage={canManage}
              />
            ))}
          </ul>
        ) : null}

        {canManage ? (
          showForms ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4">
                <AddLinkForm projectId={projectId} />
                <UploadFileForm projectId={projectId} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForms(false)}
                className="self-start"
              >
                Done
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForms(true)}
              className="self-start"
            >
              <Plus />
              Add document
            </Button>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  document: d,
  projectId,
  canManage,
}: {
  document: ProjectDocument;
  projectId: string;
  canManage: boolean;
}) {
  const href = d.kind === "link" ? d.url : `/api/documents/${d.id}/download`;
  const Icon = d.kind === "link" ? LinkIcon : FileText;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Icon className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />

      <div className="min-w-0 flex-1">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium underline-offset-4 hover:underline"
        >
          {d.name}
        </a>
        <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
          {d.kind === "link" ? (
            <span className="min-w-0 truncate">{d.url}</span>
          ) : (
            <span className="min-w-0 truncate">
              {d.mime_type ?? "file"} ·{" "}
              {d.size_bytes ? formatBytes(d.size_bytes) : "—"}
            </span>
          )}
          <span className="shrink-0">· Added {formatDate(d.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label={`Open ${d.name}`}
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
          </a>
        </Button>

        {canManage ? (
          <form action={deleteDocument}>
            <input type="hidden" name="documentId" value={d.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label={`Delete ${d.name}`}
            >
              <Trash2 />
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

function AddLinkForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(addLink, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] p-3"
    >
      <input type="hidden" name="projectId" value={projectId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="link-name" className="text-xs">
          Link name
        </Label>
        <Input
          id="link-name"
          name="name"
          placeholder="GitHub repo"
          required
          maxLength={200}
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="link-url" className="text-xs">
          URL
        </Label>
        <Input
          id="link-url"
          name="url"
          type="url"
          placeholder="https://github.com/org/repo"
          required
        />
        {state.fieldErrors?.url ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.url}
          </p>
        ) : null}
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        <LinkIcon />
        Add link
      </Button>
    </form>
  );
}

function UploadFileForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(uploadFile, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] p-3"
    >
      <input type="hidden" name="projectId" value={projectId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file" className="text-xs">
          Upload file
        </Label>
        <Input id="file" name="file" type="file" required />
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Max 50MB. Stored privately; access controlled by project membership.
        </p>
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        <Upload />
        Upload
      </Button>
    </form>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
