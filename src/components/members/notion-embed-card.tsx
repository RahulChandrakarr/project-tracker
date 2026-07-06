"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateNotionEmbed } from "@/lib/profile/actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Embeds a user's Notion page / Notion Calendar link on their profile. The
 * owner can paste or clear the link; others see the embed read-only.
 */
export function NotionEmbedCard({
  url,
  canEdit,
}: {
  url: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(url ?? "");
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  async function save(next: string) {
    setStatus("saving");
    setMessage(null);
    const result = await updateNotionEmbed(next);
    if (result.ok) {
      setStatus("saved");
      setMessage(result.message ?? null);
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.message ?? "Could not save.");
    }
  }

  const statusLabel =
    status === "saving" ? "Saving…" : status === "idle" ? null : message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notion</CardTitle>
        <CardDescription>
          {canEdit
            ? "Paste a shared Notion page or Notion Calendar link to embed it here."
            : "This member's embedded Notion page."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canEdit ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                inputMode="url"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setStatus("idle");
                }}
                placeholder="https://your-workspace.notion.site/…"
                aria-label="Notion link"
                className="sm:flex-1"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void save(value)}
                  disabled={status === "saving"}
                >
                  Save
                </Button>
                {url ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue("");
                      void save("");
                    }}
                    disabled={status === "saving"}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
            {statusLabel ? (
              <p
                className={
                  status === "error"
                    ? "text-xs text-[var(--color-destructive)]"
                    : "text-xs text-[var(--color-muted-foreground)]"
                }
                aria-live="polite"
              >
                {statusLabel}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                The page must be shared or published to the web for the embed to
                load. Get the link from Notion&apos;s Share menu.
              </p>
            )}
          </div>
        ) : null}

        {url ? (
          <div className="flex flex-col gap-2">
            <iframe
              src={url}
              title="Notion embed"
              className="h-[600px] w-full rounded-md border border-[var(--color-border)]"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              Open in Notion
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        ) : canEdit ? null : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No Notion page connected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
