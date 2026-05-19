import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      description="Start tracking your client projects in one place."
      footer={{
        prompt: "Already have an account?",
        href: "/login",
        label: "Sign in",
      }}
    >
      <SignupForm />
    </AuthCard>
  );
}
