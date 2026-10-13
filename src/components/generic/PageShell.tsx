"use client";

import { PageEditor } from "./PageEditor";
import { SimulatedSitePage } from "@/components/preview/SimulatedSitePage";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { cardListField, type PageSchema } from "@/lib/page-schemas";
import { useContentStore } from "@/store/content-store";

export function PageShell({ schema }: { schema: PageSchema }) {
  const previewMode = useContentStore((s) => s.previewMode);
  const sidebarCollapsed = useContentStore((s) => s.sidebarCollapsed);
  const cards = cardListField(schema);

  return (
    <div className={`page-layout${sidebarCollapsed ? " page-layout-sidebar-collapsed" : ""}`}>
      {previewMode ? <SimulatedSitePage schema={schema} /> : <PageEditor schema={schema} />}
      <Sidebar
        pageKey={schema.key}
        hint={
          cards
            ? `Add, remove or reorder ${cards.itemLabel.toLowerCase()} cards here. Use "Edit content" on a card to edit it on its own page.`
            : undefined
        }
      />
    </div>
  );
}
