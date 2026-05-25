import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Holding screen for signed-in users an admin hasn't accepted yet. Lives
 * outside the (app) group so the approval gate in that layout can redirect
 * here without looping.
 */
export default async function PendingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  // Already in? Don't strand them here.
  if (profile?.role === "admin" || profile?.approved) {
    redirect("/");
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-secondary)]">
          <Clock className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          Awaiting approval
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          Your account{user.email ? ` (${user.email})` : ""} is set up and
          waiting for an admin to confirm your access. You&apos;ll get into the
          workspace as soon as you&apos;re accepted.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
