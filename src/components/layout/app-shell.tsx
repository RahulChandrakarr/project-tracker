import * as React from "react";
import type { User } from "@supabase/supabase-js";

import type { AppRole } from "@/lib/supabase/types";

import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({
  user,
  role,
  avatarUrl,
  children,
}: {
  user: User;
  role: AppRole;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role={role} userId={user.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          role={role}
          userId={user.id}
          avatarUrl={avatarUrl}
        />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
