import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projects Tracker",
  description: "Track client projects, status, and progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
