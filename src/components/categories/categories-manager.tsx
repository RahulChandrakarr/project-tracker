"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryFormState,
} from "@/lib/categories/actions";
import type { CategoryWithCount } from "@/lib/categories/queries";

const INITIAL: CategoryFormState = { ok: false };

export function CategoriesManager({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const [state, formAction, pending] = useActionState(createCategory, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="flex flex-col gap-5">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            name="name"
            required
            maxLength={100}
            placeholder="New category name"
            className="sm:max-w-xs"
          />
          <Button type="submit" disabled={pending}>
            <Plus />
            {pending ? "Adding..." : "Add category"}
          </Button>
        </div>
        {state.message && !state.ok ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.message}
          </p>
        ) : null}
      </form>

      {categories.length === 0 ? (
        <div className="grid h-32 place-items-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-muted-foreground)]">
          No categories yet. Add your first above.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Projects</TableHead>
                <TableHead className="w-[80px] text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: CategoryWithCount }) {
  // Controlled so React 19's <form action> auto-reset can't revert the field.
  const [name, setName] = React.useState(category.name);
  const [state, renameAction, renaming] = useActionState(
    updateCategory,
    INITIAL,
  );

  const dirty = name.trim() !== category.name && name.trim().length > 0;

  return (
    <TableRow>
      <TableCell>
        <form action={renameAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={category.id} />
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={100}
            className="h-8 max-w-xs text-sm"
          />
          {dirty ? (
            <Button type="submit" size="sm" disabled={renaming}>
              {renaming ? "Saving..." : "Save"}
            </Button>
          ) : null}
        </form>
        {state.message && !state.ok ? (
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {state.message}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-[var(--color-muted-foreground)]">
        {category.projectCount}
      </TableCell>
      <TableCell className="text-right">
        <form action={deleteCategory} className="inline">
          <input type="hidden" name="id" value={category.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label={`Delete ${category.name}`}
            onClick={(e) => {
              if (
                category.projectCount > 0 &&
                !window.confirm(
                  `Delete "${category.name}"? ${category.projectCount} project${
                    category.projectCount === 1 ? "" : "s"
                  } will become uncategorised.`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <Trash2 />
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}
