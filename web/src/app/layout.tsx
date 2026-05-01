import type { Metadata } from "next";
import "./globals.css";
import { AuthFragmentHandler } from "@/components/AuthFragmentHandler";

export const metadata: Metadata = {
  title: "Employ the Agent — Platform",
  description: "Watch your AI agents work, in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <AuthFragmentHandler />
        {children}
      </body>
    </html>
  );
}
