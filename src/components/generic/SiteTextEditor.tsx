"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SimulatedSitePage } from "@/components/preview/SimulatedSitePage";
import { GROUP_LABELS, type SiteTextItem } from "@/lib/site-text";
import { homeSchema } from "@/lib/page-schemas";
import { useContentStore } from "@/store/content-store";

/**
 * Every fixed piece of wording on the website — menu labels, section headings, button captions, footer links …
 * The list is read from the live site, so it is always what the site really contains. Leave a box empty to keep the
 * site's own wording; type to replace it. Like every other text, HTML tags such as <br> and <b> are allowed.
 */
export function SiteTextEditor() {
  const previewMode = useContentStore((s) => s.previewMode);
  const sidebarCollapsed = useContentStore((s) => s.sidebarCollapsed);
  const overrides = useContentStore((s) => s.siteTextDraft);
  const setSiteText = useContentStore((s) => s.setSiteText);
  const [items, setItems] = useState<SiteTextItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/live/manifest")
      .then(async (res) => {
        const json = (await res.json()) as { items?: SiteTextItem[]; error?: string };
        if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
        if (!cancelled) setItems(json.items ?? []);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const map = new Map<string, SiteTextItem[]>();
    for (const item of items ?? []) {
      if (needle && !(item.defaultText + " " + (overrides[item.key] ?? "") + " " + item.key).toLowerCase().includes(needle)) continue;
      map.set(item.group, [...(map.get(item.group) ?? []), item]);
    }
    return [...map.entries()];
  }, [items, filter, overrides]);

  return (
    <div className={`page-layout${sidebarCollapsed ? " page-layout-sidebar-collapsed" : ""}`}>
      {previewMode ? (
        <SimulatedSitePage schema={homeSchema} />
      ) : (
        <article className="site-page">
          <header className="page-heading page-banner">
            <h1>Site text</h1>
          </header>
          <p className="html-hint">
            Wording that is part of the website itself rather than a page&apos;s content. Leave a box empty to keep the website&apos;s own wording; type to
            replace it. HTML tags such as <code>&lt;br&gt;</code> and <code>&lt;b&gt;</code> are allowed. Use <b>Preview site</b> to see the result.
            Page content (stories, projects, news …) is edited on each page.
          </p>
          <div className="page-content">
            <input className="editable-input site-text-filter" placeholder="Search the site's wording…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            {error && <p className="save-status-error-text">Couldn&apos;t read the website: {error}</p>}
            {!items && !error && <p>Reading the live website…</p>}
            {items && items.length === 0 && <p>No editable wording was found on the live website yet.</p>}
            {groups.map(([group, list]) => (
              <fieldset className="field-group" key={group}>
                <legend>{GROUP_LABELS[group] ?? group}</legend>
                {list.map((item) => (
                  <label className="site-text-row" key={item.key}>
                    <span className="site-text-key">{item.key}</span>
                    <textarea
                      className="editable-input"
                      rows={1}
                      value={overrides[item.key] ?? ""}
                      placeholder={item.defaultText}
                      onChange={(e) => setSiteText(item.key, e.target.value)}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </article>
      )}
      <Sidebar pageKey="home" hint="Change any fixed wording of the website. Empty box = the website's own wording." />
    </div>
  );
}
