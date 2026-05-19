import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Lightweight native <select>. Keeps the project off Radix's Select primitive
 * (which is heavyweight + needs a full popover). For inline status/assignee
 * dropdowns inside forms, a native select is honestly fine and accessible.
 */
const SelectNative = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
SelectNative.displayName = "SelectNative";

export { SelectNative };
