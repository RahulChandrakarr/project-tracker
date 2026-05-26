import { PageMotion, PageMotionItem } from "@/components/layout/page-motion";
import { NotebookApp } from "@/components/notebook/notebook-app";
import { getOrCreateMyNotebook } from "@/lib/notebook/queries";
import { pageFromRow } from "@/lib/notebook/page-state";
import { listProjects } from "@/lib/projects/queries";
import { DEFAULT_THEME, isNotebookTheme } from "@/types/notebook";

// The notebook is private to the signed-in user (RLS owner-only), so never
// cache it across requests.
export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  const [{ notebook, pages }, projects] = await Promise.all([
    getOrCreateMyNotebook(),
    listProjects(),
  ]);
  const theme = isNotebookTheme(notebook.theme) ? notebook.theme : DEFAULT_THEME;

  return (
    <PageMotion className="">
      <PageMotionItem>
        <NotebookApp
          notebookId={notebook.id}
          title={notebook.title}
          theme={theme}
          pages={pages.map(pageFromRow)}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </PageMotionItem>
    </PageMotion>
  );
}
