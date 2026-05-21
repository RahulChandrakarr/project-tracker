import { redirect } from "next/navigation";

import { CategoriesManager } from "@/components/categories/categories-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listCategoriesWithCounts } from "@/lib/categories/queries";

export default async function CategoriesPage() {
  const me = await getCurrentUser();
  if (me.role !== "admin") redirect("/");

  const categories = await listCategoriesWithCounts();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Shared labels for projects. Renaming one updates it everywhere.
          Deleting one leaves its projects uncategorised.
        </p>
      </div>

      <CategoriesManager categories={categories} />
    </div>
  );
}
