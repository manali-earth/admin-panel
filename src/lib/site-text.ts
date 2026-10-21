/**
 * "Site text": every piece of wording on the website that does NOT come from a page's own JSON —
 * navigation labels, section headings, button/link captions, footer links …
 *
 * The website marks each of those with data-text="<key>" (in its HTML) or lists it in
 * window.SITE_TEXT_DEFAULTS (in app.js, for strings the script writes itself). An override
 * lives in site-text.json in the database repo as { "<key>": "<replacement HTML>" }; a key with
 * no override simply shows the website's own wording.
 *
 * The list of editable keys is read from the LIVE website on demand (see /api/live/manifest),
 * so nothing here has to be kept in step with the site by hand.
 */
export const SITE_TEXT_FILENAME = "site-text.json";

export type SiteTextMap = Record<string, string>;

export interface SiteTextItem {
  key: string;
  /** The website's own wording — what is shown when there is no override. May contain HTML. */
  defaultText: string;
  /** Where it appears: the part of the key before the first dot, e.g. "home", "nav", "common". */
  group: string;
}

const DATA_TEXT_RE = /<([a-z][a-z0-9]*)\b[^>]*?\sdata-text="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;
const SCRIPT_DEFAULTS_RE = /window\.SITE_TEXT_DEFAULTS\s*=\s*(\{[\s\S]*?\})\s*;\s*\/\/\s*end-site-text-defaults/;

/** Pulls every data-text element out of a page's HTML. */
export function extractHtmlTexts(html: string): SiteTextItem[] {
  const items: SiteTextItem[] = [];
  for (const m of html.matchAll(DATA_TEXT_RE)) {
    const key = m[2] ?? "";
    if (key) items.push({ key, defaultText: (m[3] ?? "").trim(), group: groupOf(key) });
  }
  return items;
}

/** Reads the strings app.js declares as window.SITE_TEXT_DEFAULTS (a plain JSON object literal). */
export function extractScriptTexts(js: string): SiteTextItem[] {
  const m = js.match(SCRIPT_DEFAULTS_RE);
  if (!m?.[1]) return [];
  try {
    const obj = JSON.parse(m[1]) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([, v]) => typeof v === "string")
      .map(([key, v]) => ({ key, defaultText: v as string, group: groupOf(key) }));
  } catch {
    return [];
  }
}

export function groupOf(key: string): string {
  const i = key.indexOf(".");
  return i === -1 ? "other" : key.slice(0, i);
}

/** First occurrence of a key wins (the footer/nav repeat on every page). */
export function mergeItems(...lists: SiteTextItem[][]): SiteTextItem[] {
  const seen = new Map<string, SiteTextItem>();
  for (const list of lists) for (const item of list) if (!seen.has(item.key)) seen.set(item.key, item);
  return [...seen.values()];
}

export const GROUP_LABELS: Record<string, string> = {
  nav: "Top menu",
  common: "Header & footer (every page)",
  home: "Home page",
  "my-story": "My Story page",
  edu: "Education & Experience page",
  projects: "Projects page",
  publications: "Research Publications page",
  conferences: "Seminars & Conferences page",
  posters: "Poster presentations page",
  card: "Cards & buttons",
  detail: "Detail pages",
  other: "Other"
};
