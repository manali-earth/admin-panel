"use client";

import { useCallback, useEffect, useRef } from "react";
import { resolveImagesForPreview } from "@/lib/preview-resolve";
import { dedicatedPageSchemas, homeSchema, type PageSchema } from "@/lib/page-schemas";
import { PAGE_KEY_TO_SITE_FOLDER, type PageKey } from "@/lib/types";
import { useContentStore } from "@/store/content-store";

const FOLDER_TO_PAGE_KEY: Record<string, PageKey> = Object.fromEntries(
  (Object.keys(PAGE_KEY_TO_SITE_FOLDER) as PageKey[]).map((key) => [PAGE_KEY_TO_SITE_FOLDER[key], key])
);

function schemaForPageKey(key: PageKey): PageSchema {
  return key === "home" ? homeSchema : dedicatedPageSchemas[key as Exclude<PageKey, "home">];
}

function previewSrcFor(schema: PageSchema): string {
  const folder = PAGE_KEY_TO_SITE_FOLDER[schema.key];
  return folder ? `/preview-site/${folder}/index.html` : "/preview-site/index.html";
}

function pageKeyForPreviewPath(pathname: string): PageKey | null {
  const match = pathname.match(/^\/preview-site\/(?:([\w-]+)\/)?index\.html$/);
  if (!match) return null;
  const folder = match[1] ?? "";
  return FOLDER_TO_PAGE_KEY[folder] ?? null;
}

export function SimulatedSitePage({ schema }: { schema: PageSchema }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draft = useContentStore((s) => s.draft);
  const imagePreviewUrl = useContentStore((s) => s.imagePreviewUrl);
  const setPreviewPageKey = useContentStore((s) => s.setPreviewPageKey);

  const postCurrentPage = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    let pathname: string;
    try {
      pathname = win.location.pathname;
    } catch {
      return; // cross-origin during a transient navigation state — next load event will retry
    }
    const pageKey = pageKeyForPreviewPath(pathname);
    if (!pageKey) return;
    setPreviewPageKey(pageKey);
    const pageSchema = schemaForPageKey(pageKey);
    const pageData = draft[pageKey];
    if (!pageData) return;
    const resolved = resolveImagesForPreview(pageSchema.fields, pageData, imagePreviewUrl);
    win.postMessage({ type: "PORTFOLIO_PREVIEW_DATA", pageKey: pageSchema.slug, data: resolved, home: draft.home }, window.location.origin);
  }, [draft, imagePreviewUrl, setPreviewPageKey]);

  useEffect(() => {
    postCurrentPage();
  }, [postCurrentPage]);

  return (
    <div className="simulated-site">
      <iframe
        ref={iframeRef}
        key={previewSrcFor(schema)}
        src={previewSrcFor(schema)}
        title="Live site preview"
        className="simulated-site-frame"
        onLoad={postCurrentPage}
      />
    </div>
  );
}
