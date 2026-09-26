"use client";

import { PageEditor } from "./PageEditor";
import { SimulatedSitePage } from "@/components/preview/SimulatedSitePage";
import { Sidebar } from "@/components/sidebar/Sidebar";
import type { PageSchema } from "@/lib/page-schemas";
import { useContentStore } from "@/store/content-store";

export function PageShell({ schema }: { schema: PageSchema }) {
  const previewMode = useContentStore((s) => s.previewMode);
  const sidebarCollapsed = useContentStore((s) => s.sidebarCollapsed);

  return (
    <div className={`page-layout${sidebarCollapsed ? " page-layout-sidebar-collapsed" : ""}`}>
      {previewMode ? <SimulatedSitePage schema={schema} /> : <PageEditor schema={schema} />}
      <Sidebar pageKey={schema.key} />
    </div>
  );
}
