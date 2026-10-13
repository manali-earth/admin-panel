"use client";

import { ItemEditor } from "./ItemEditor";
import { SimulatedSitePage } from "@/components/preview/SimulatedSitePage";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { cardListField, type PageSchema } from "@/lib/page-schemas";
import { useContentStore } from "@/store/content-store";

export function ItemShell({ schema, id }: { schema: PageSchema; id: string }) {
  const previewMode = useContentStore((s) => s.previewMode);
  const sidebarCollapsed = useContentStore((s) => s.sidebarCollapsed);
  const noun = cardListField(schema)?.itemLabel.toLowerCase() ?? "item";

  return (
    <div className={`page-layout${sidebarCollapsed ? " page-layout-sidebar-collapsed" : ""}`}>
      {previewMode ? <SimulatedSitePage schema={schema} viewId={id} /> : <ItemEditor schema={schema} id={id} />}
      <Sidebar pageKey={schema.key} hint={`Everything for this ${noun} is edited here. Go back to the list to add, remove or reorder cards. Save publishes all changes.`} />
    </div>
  );
}
