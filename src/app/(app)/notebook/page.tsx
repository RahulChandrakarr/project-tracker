import { PageMotion, PageMotionItem } from "@/components/layout/page-motion";
import { NotebookApp } from "@/components/notebook/notebook-app";
import { getOrCreateMyNotebook } from "@/lib/notebook/queries";
import { pageFromRow } from "@/lib/notebook/page-state";
import { DEFAULT_THEME, isNotebookTheme } from "@/types/notebook";

// The notebook is private to the signed-in user (RLS owner-only), so never
// cache it across requests.
export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  const { notebook, pages } = await getOrCreateMyNotebook();
  const theme = isNotebookTheme(notebook.theme) ? notebook.theme : DEFAULT_THEME;

  return (
    <PageMotion className="">
      <PageMotionItem>
        <NotebookApp
          notebookId={notebook.id}
          title={notebook.title}
          theme={theme}
          pages={pages.map(pageFromRow)}
        />
      </PageMotionItem>
    </PageMotion>
  );
}
