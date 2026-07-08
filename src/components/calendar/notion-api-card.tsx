"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { disconnectNotion } from "@/lib/integrations/notion-actions";
import type { NotionConnectionStatus } from "@/lib/integrations/notion";
import { formatDate } from "@/lib/format";

const NOTICES: Record<string, { text: string; error?: boolean }> = {
  connected: { text: "Connected to Notion." },
  error: { text: "Couldn't connect to Notion. Please try again.", error: true },
  denied: { text: "Notion connection was cancelled.", error: true },
  unconfigured: { text: "Notion isn't configured on this site yet.", error: true },
};

export function NotionApiCard({ status }: { status: NotionConnectionStatus }) {
  const router = useRouter();
  const params = useSearchParams();
  const notice = NOTICES[params.get("notion") ?? ""];
  const [busy, setBusy] = React.useState(false);

  async function disconnect() {
    setBusy(true);
    await disconnectNotion();
    setBusy(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notion account</CardTitle>
        <CardDescription>
          Connect your Notion so the app can sync your data. Separate from the
          embedded page above.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {notice ? (
          <p
            className={
              notice.error
                ? "text-sm text-[var(--color-destructive)]"
                : "text-sm text-emerald-600 dark:text-emerald-400"
            }
          >
            {notice.text}
          </p>
        ) : null}

        {!status.configured ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            The Notion integration isn&apos;t set up on this site yet. An admin
            needs to add the Notion OAuth credentials.
          </p>
        ) : status.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" />
              </span>
              <span>
                Connected
                {status.workspaceName ? (
                  <> to <strong>{status.workspaceName}</strong></>
                ) : null}
                {status.connectedAt ? (
                  <span className="text-[var(--color-muted-foreground)]">
                    {" "}
                    · {formatDate(status.connectedAt)}
                  </span>
                ) : null}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void disconnect()}
              disabled={busy}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div>
            <Button asChild size="sm">
              <a href="/api/notion/connect">Connect with Notion</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
