import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppDataProvider } from "@/components/AppDataProvider";
import { TopNav } from "@/components/nav/TopNav";
import { UnsavedChangesGuard } from "@/components/nav/UnsavedChangesGuard";
import { SaveBar } from "@/components/nav/SaveBar";

export const metadata: Metadata = {
  title: "Portfolio Admin Panel"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The live site's own stylesheet, fetched on request — the editor mirrors it instead of reimplementing it. */}
        <link rel="stylesheet" href="/api/live/asset/styles.css" />
        {/* Chrome-only type: distinguishes tool controls from the site content being edited. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppDataProvider>
          <UnsavedChangesGuard />
          <TopNav />
          <main className="admin-main">{children}</main>
          <SaveBar />
        </AppDataProvider>
      </body>
    </html>
  );
}
