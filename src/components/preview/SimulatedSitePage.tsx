"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { resolveImagesForPreview } from "@/lib/preview-resolve";
import { dedicatedPageSchemas, homeSchema, type PageSchema } from "@/lib/page-schemas";
import { PAGE_KEY_TO_SITE_FOLDER, type DatabaseIndex, type PageKey } from "@/lib/types";
import { useContentStore } from "@/store/content-store";

const PAGE_KEYS = Object.keys(PAGE_KEY_TO_SITE_FOLDER) as PageKey[];

const FOLDER_TO_PAGE_KEY: Record<string, PageKey> = Object.fromEntries(PAGE_KEYS.map((key) => [PAGE_KEY_TO_SITE_FOLDER[key], key]));

function schemaForPageKey(key: PageKey): PageSchema {
  return key === "home" ? homeSchema : dedicatedPageSchemas[key as Exclude<PageKey, "home">];
}

/** The path of a page on the live website, e.g. "/projects/" or "/projects/?view=project-3". */
function sitePathFor(schema: PageSchema, viewId?: string): string {
  const folder = PAGE_KEY_TO_SITE_FOLDER[schema.key];
  const base = folder ? `/${folder}/` : "/";
  return viewId ? `${base}?view=${encodeURIComponent(viewId)}` : base;
}

function pageKeyForSitePath(pathname: string): PageKey | null {
  const folder = pathname.replace(/^\/+|\/+$/g, "").replace(/\/index\.html$/, "");
  return FOLDER_TO_PAGE_KEY[folder] ?? null;
}

/** Absolute URL of every data file the site requests, so the preview can answer those requests from the draft. */
function dataUrls(index: DatabaseIndex): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const key of PAGE_KEYS) {
    const value = (index as unknown as Record<string, unknown>)[key === "gisProjects" ? "gisProjects" : key];
    if (typeof value === "string") urls[key] = value;
  }
  urls.siteText = index.siteText || new URL("site-text.json", index.home).href;
  return urls;
}

/**
 * Live preview: the REAL website, fetched from its deployed address on every load (see /api/live/page), running its
 * own code on the admin's unsaved draft. Nothing about the site is copied here, so there is nothing to keep in sync:
 * whatever the site looks like today is what the preview shows.
 *
 * `viewId` opens the item's on-demand page (the site's ?view=<id>) instead of the page overview.
 */
export function SimulatedSitePage({ schema, viewId }: { schema: PageSchema; viewId?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draft = useContentStore((s) => s.draft);
  const siteTextDraft = useContentStore((s) => s.siteTextDraft);
  const databaseIndex = useContentStore((s) => s.databaseIndex);
  const imagePreviewUrl = useContentStore((s) => s.imagePreviewUrl);
  const setPreviewPageKey = useContentStore((s) => s.setPreviewPageKey);

  const src = useMemo(() => `/api/live/page?path=${encodeURIComponent(sitePathFor(schema, viewId))}`, [schema, viewId]);

  const buildState = useCallback(() => {
    if (!databaseIndex) return null;
    const urls = dataUrls(databaseIndex);
    const pages: Record<string, unknown> = {};
    for (const key of PAGE_KEYS) {
      const data = draft[key];
      if (data) pages[key] = resolveImagesForPreview(schemaForPageKey(key).fields, data, imagePreviewUrl);
    }
    return { index: { ...databaseIndex, siteText: urls.siteText }, urls, pages, siteText: siteTextDraft };
  }, [databaseIndex, draft, siteTextDraft, imagePreviewUrl]);

  const postState = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    const state = buildState();
    if (win && state) win.postMessage({ type: "PREVIEW_STATE", state }, window.location.origin);
  }, [buildState]);

  // The frame announces itself when a page of the site has loaded (including after its own link clicks).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== iframeRef.current?.contentWindow) return;
      const msg = e.data as { type?: string; pathname?: string } | null;
      if (msg?.type === "PREVIEW_READY") {
        const key = pageKeyForSitePath(msg.pathname ?? "/");
        if (key) setPreviewPageKey(key);
        postState();
      } else if (msg?.type === "PREVIEW_RELOAD") {
        iframeRef.current?.contentWindow?.location.reload();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postState, setPreviewPageKey]);

  // Every edit is pushed to the frame; it re-renders in place (no reload, scroll position kept).
  useEffect(() => {
    postState();
  }, [postState]);

  return (
    <div className="simulated-site">
      <iframe ref={iframeRef} key={src} src={src} title="Live site preview" className="simulated-site-frame" />
    </div>
  );
}
