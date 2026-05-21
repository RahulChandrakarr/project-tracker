"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SelectNative } from "@/components/ui/select-native";
import type { ProjectCategory } from "@/lib/categories/queries";

/**
 * Filters a project list by category via the `?category=` search param.
 * `value` is the current param ("" = all, "none" = uncategorised, else a
 * category id), passed from the server so it stays in sync on navigation.
 */
export function CategoryFilter({
  categories,
  value,
}: {
  categories: ProjectCategory[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("category", next);
    else params.delete("category");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <SelectNative
      key={value}
      aria-label="Filter by category"
      defaultValue={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      className="h-9 w-full sm:w-52"
    >
      <option value="">All categories</option>
      <option value="none">Uncategorised</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </SelectNative>
  );
}
