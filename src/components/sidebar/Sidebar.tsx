"use client";

import { useRouter } from "next/navigation";
import { PAGE_KEY_TO_SLUG, type PageKey } from "@/lib/types";
import { useContentStore } from "@/store/content-store";
import { HistoryControls } from "./HistoryControls";
import { SaveStatus } from "./SaveStatus";

function hrefForPageKey(key: PageKey): string {
  const slug = PAGE_KEY_TO_SLUG[key];
  return slug === "home" ? "/" : `/${slug}`;
}

export function Sidebar({ pageKey }: { pageKey: PageKey }) {
  const router = useRouter();
  const previewMode = useContentStore((s) => s.previewMode);
  const previewPageKey = useContentStore((s) => s.previewPageKey);
  const collapsed = useContentStore((s) => s.sidebarCollapsed);
  const enterPreview = useContentStore((s) => s.enterPreview);
  const exitPreview = useContentStore((s) => s.exitPreview);
  const toggleSidebarCollapsed = useContentStore((s) => s.toggleSidebarCollapsed);

  function handlePreviewToggle() {
    if (previewMode) {
      // Return to whichever page preview actually ended up showing (you may have
      // browsed elsewhere using the simulated site's own nav), not wherever this
      // admin route happened to be when preview was turned on.
      const targetKey = previewPageKey ?? pageKey;
      exitPreview();
      if (targetKey !== pageKey) {
        router.push(hrefForPageKey(targetKey));
      }
    } else {
      enterPreview(pageKey);
    }
  }

  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={toggleSidebarCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "\u2039" : "\u203a"}
      </button>

      {!collapsed && (
        <>
          <SaveStatus />
          <HistoryControls />

          <button
            type="button"
            className={`preview-toggle-btn${previewMode ? " preview-toggle-btn-active" : ""}`}
            onClick={handlePreviewToggle}
          >
            {previewMode ? "Exit preview" : "Preview site"}
          </button>

          {!previewMode && pageKey && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">On this page</div>
              <p className="sidebar-hint">Add, edit, delete, and reorder items directly in the content — hover any item for its controls.</p>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
