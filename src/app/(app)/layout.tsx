import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const me = await getCurrentUser();

  // Self-registered users wait for an app admin to accept them. Admins are
  // never gated (and can't lock themselves out).
  if (!me.approved && me.role !== "admin") {
    redirect("/pending");
  }

  return (
    <AppShell user={user} role={me.role} avatarUrl={me.avatarUrl}>
      {children}
    </AppShell>
  );
}
