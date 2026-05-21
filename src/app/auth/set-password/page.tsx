import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reachable only with an active session — landed here from /auth/callback
  // after clicking an invite link. If somehow signed out, send to /login.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <AuthCard
          title="Set your password"
          description={`Welcome${user.email ? `, ${user.email}` : ""}. Choose a password to finish setting up your account.`}
          footer={{
            prompt: "Already set up?",
            href: "/",
            label: "Go to dashboard",
          }}
        >
          <SetPasswordForm />
        </AuthCard>
      </div>
    </div>
  );
}
