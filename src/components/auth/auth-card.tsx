import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: { prompt: string; href: string; label: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {children}
        <div className="text-center text-sm text-[var(--color-muted-foreground)]">
          {footer.prompt}{" "}
          <Link
            href={footer.href}
            className="font-medium text-[var(--color-foreground)] underline-offset-4 hover:underline"
          >
            {footer.label}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
