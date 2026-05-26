"use client";

import * as React from "react";
import { Check, FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { uploadFile } from "@/lib/documents/actions";
import { cn } from "@/lib/utils";

import { asDrawing } from "./drawing";
import { DrawingCanvas } from "./drawing-canvas";
import { themeVars } from "./notebook-theme";
import { PageSurface } from "./page-surface";
import { StaticPageBody } from "./static-page-body";
import { useNotebook, type PageState } from "./notebook-store";

// A4 portrait at 96dpi. Each selected page renders into a box this size, then
// gets rasterised into one PDF page so the export is a clean, printable A4.
const PAGE_W = 794;
const PAGE_H = 1123;
// Keep exports inside the 50MB document cap (and bounded render time).
const MAX_PAGES = 40;

/**
 * "Save to project" — pick a range and/or individual notebook pages, rasterise
 * them to a PDF in the browser (text + drawings, faithful to the on-screen
 * page), and upload it as a file document on a project. The project page then
 * shows it in its Documents card, where it opens/downloads like any file.
 */
export function NotebookExport() {
  const pages = useNotebook((s) => s.pages);
  const projects = useNotebook((s) => s.projects);
  const theme = useNotebook((s) => s.theme);
  const notebookTitle = useNotebook((s) => s.title);

  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState("");
  const [name, setName] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [from, setFrom] = React.useState(1);
  const [to, setTo] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  // Once set, the selected pages render off-screen and the capture effect runs.
  const [job, setJob] = React.useState<PageState[] | null>(null);
  const nodes = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // Reset the form to "all pages" each time the dialog opens.
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setSelected(new Set(pages.map((p) => p.id)));
    setFrom(1);
    setTo(pages.length);
    setProjectId((prev) => prev || projects[0]?.id || "");
    setName(notebookTitle ? `${notebookTitle} notes` : "Notebook notes");
    setError(null);
    setDone(false);
  }

  function applyRange(f: number, t: number) {
    const lo = Math.max(1, Math.min(f, t, pages.length));
    const hi = Math.min(pages.length, Math.max(f, t, 1));
    setFrom(lo);
    setTo(hi);
    setSelected(new Set(pages.slice(lo - 1, hi).map((p) => p.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPages = pages.filter((p) => selected.has(p.id));

  function onSave() {
    setError(null);
    if (!projectId) return setError("Pick a project to save into.");
    if (selectedPages.length === 0)
      return setError("Select at least one page.");
    if (selectedPages.length > MAX_PAGES)
      return setError(`Too many pages — ${MAX_PAGES} max per document.`);
    if (!name.trim()) return setError("Give the document a name.");
    setBusy(true);
    setJob(selectedPages);
  }

  // Rasterise the off-screen pages once they've rendered, build the PDF, upload.
  React.useEffect(() => {
    if (!job) return;
    let cancelled = false;

    (async () => {
      try {
        const { jsPDF } = await import("jspdf");
        const { toJpeg } = await import("html-to-image");

        // Let fonts load and the drawing canvases paint before snapshotting.
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 300));

        const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < job.length; i++) {
          const node = nodes.current.get(job[i].id);
          if (!node) continue;
          const dataUrl = await toJpeg(node, {
            quality: 0.92,
            pixelRatio: 2,
            width: PAGE_W,
            height: PAGE_H,
            cacheBust: true,
          });
          if (cancelled) return;
          if (i > 0) pdf.addPage();
          pdf.addImage(dataUrl, "JPEG", 0, 0, pw, ph);
        }
        if (cancelled) return;

        const safe =
          name.trim().replace(/[^a-zA-Z0-9 ._-]/g, "_").slice(0, 180) ||
          "notebook";
        const file = new File([pdf.output("blob")], `${safe}.pdf`, {
          type: "application/pdf",
        });
        const fd = new FormData();
        fd.append("projectId", projectId);
        fd.append("file", file);

        const res = await uploadFile({ ok: false }, fd);
        if (cancelled) return;
        if (res.ok) setDone(true);
        else setError(res.message ?? "Could not save the document.");
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Export failed.");
      } finally {
        if (!cancelled) {
          setBusy(false);
          setJob(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job, name, projectId]);

  const noProjects = projects.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="nb-seg nb-segment"
            title="Save pages to a project"
            aria-label="Save pages to a project"
          >
            <FileDown className="size-4" />
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save pages to a project</DialogTitle>
            <DialogDescription>
              Export the chosen pages as a PDF. It lands in the project&apos;s
              Documents, where anyone on the project can open or download it.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
                <Check className="size-5" />
              </span>
              <p className="text-sm font-medium">Saved to the project.</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Find it in the project&apos;s Documents card.
              </p>
            </div>
          ) : noProjects ? (
            <p className="py-4 text-sm text-[var(--color-muted-foreground)]">
              You&apos;re not on any projects yet, so there&apos;s nowhere to
              save to.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="export-project" className="text-xs">
                  Project
                </Label>
                <SelectNative
                  id="export-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.currentTarget.value)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="export-name" className="text-xs">
                  Document name
                </Label>
                <Input
                  id="export-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={180}
                  placeholder="Sprint notes"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Pages</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() =>
                        setSelected(new Set(pages.map((p) => p.id)))
                      }
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() => setSelected(new Set())}
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    From
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={pages.length}
                    value={from}
                    onChange={(e) =>
                      applyRange(Number(e.target.value) || 1, to)
                    }
                    className="h-8 w-16"
                    aria-label="From page"
                  />
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    to
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={pages.length}
                    value={to}
                    onChange={(e) =>
                      applyRange(from, Number(e.target.value) || 1)
                    }
                    className="h-8 w-16"
                    aria-label="To page"
                  />
                  <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                    {selectedPages.length} selected
                  </span>
                </div>

                <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-md border border-[var(--color-border)] p-1">
                  {pages.map((p, i) => {
                    const on = selected.has(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => toggle(p.id)}
                          aria-pressed={on}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--color-accent)]",
                            on && "bg-[var(--color-accent)]",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-4 shrink-0 place-items-center rounded border border-[var(--color-border)]",
                              on &&
                                "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                            )}
                          >
                            {on ? <Check className="size-3" /> : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-xs text-[var(--color-muted-foreground)]">
                            {i + 1}
                          </span>
                          <span className="truncate">
                            {p.title || "Untitled page"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {error ? (
                <p className="text-sm text-[var(--color-destructive)]">
                  {error}
                </p>
              ) : null}

              <DialogFooter>
                <Button onClick={onSave} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <FileDown />
                      Save PDF
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Off-screen render used only for rasterising the selected pages. */}
      {job ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: -100000,
            top: 0,
            pointerEvents: "none",
            ...themeVars(theme),
          }}
        >
          {job.map((p) => {
            const pageNumber = pages.findIndex((q) => q.id === p.id) + 1;
            return (
              <div
                key={p.id}
                ref={(el) => {
                  if (el) nodes.current.set(p.id, el);
                  else nodes.current.delete(p.id);
                }}
                style={{
                  width: PAGE_W,
                  height: PAGE_H,
                  background: "var(--nb-page)",
                }}
              >
                <PageSurface
                  page={p}
                  pageNumber={pageNumber}
                  overlay={
                    <DrawingCanvas
                      editable={false}
                      drawing={asDrawing(p.drawing)}
                    />
                  }
                >
                  <StaticPageBody content={p.content} />
                </PageSurface>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
