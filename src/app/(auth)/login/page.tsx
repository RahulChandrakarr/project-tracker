import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Enter your details to continue."
      footer={{
        prompt: "No account?",
        href: "/signup",
        label: "Create one",
      }}
    >
      <LoginForm />
    </AuthCard>
  );
}
