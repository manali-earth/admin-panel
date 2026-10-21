import { getDataProvider } from "@/lib/data-provider";

/**
 * The live website the preview is built from. Its pages, styles and scripts are fetched on demand,
 * so the preview is always the real, current site — there is nothing to copy over or keep in sync.
 */
export const DEFAULT_WEBSITE_URL = "https://munakhan.pages.dev";

export function websiteOrigin(): string {
  const raw = process.env.WEBSITE_URL?.trim() || DEFAULT_WEBSITE_URL;
  return new URL(raw).origin;
}

/** Only absolute paths on the website itself are ever fetched ("/", "/projects/?view=x" …). */
export function sitePathToUrl(rawPath: string): URL | null {
  if (!rawPath.startsWith("/") || rawPath.startsWith("//") || rawPath.includes("\\") || /[\u0000-\u001f]/.test(rawPath)) return null;
  const origin = websiteOrigin();
  const url = new URL(rawPath, `${origin}/`);
  return url.origin === origin ? url : null;
}

let dbOriginCache: { value: string[]; at: number } | null = null;

/** Origins the previewed site may talk to: where its page data and photos live. */
export async function dataOrigins(): Promise<string[]> {
  if (dbOriginCache && Date.now() - dbOriginCache.at < 60_000) return dbOriginCache.value;
  const origins = new Set<string>();
  try {
    const index = (await getDataProvider().getDatabaseIndex()) as unknown as Record<string, unknown>;
    for (const v of Object.values(index)) {
      if (typeof v !== "string") continue;
      try {
        origins.add(new URL(v).origin);
      } catch {
        /* relative value — same origin as the website */
      }
    }
  } catch {
    /* index unreadable: fall back to the website's own origin only */
  }
  const value = [...origins];
  dbOriginCache = { value, at: Date.now() };
  return value;
}

/**
 * Content-Security-Policy for the proxied page. The previewed site's scripts run on the admin's origin,
 * so connect-src deliberately lists only the website and its data hosts — NOT 'self' — which stops those
 * scripts from calling the admin's own /api routes.
 */
export function previewCsp(dataHosts: string[]): string {
  const site = websiteOrigin();
  const hosts = [site, ...dataHosts].join(" ");
  return [
    `default-src 'none'`,
    `script-src 'unsafe-inline' ${site}`,
    `style-src 'unsafe-inline' ${site} https://fonts.googleapis.com`,
    `font-src ${site} https://fonts.gstatic.com data:`,
    `img-src ${hosts} blob: data: https:`,
    `connect-src ${hosts} blob: data:`,
    `worker-src blob: ${site}`,
    `frame-src ${hosts} blob:`,
    `media-src ${hosts} blob:`,
    `base-uri ${site}`,
    `form-action 'none'`,
    `object-src 'none'`,
    `frame-ancestors 'self'`
  ].join("; ");
}

/**
 * Turns the website's own page HTML into a previewable document:
 *  - <base> makes every root-relative URL (/styles.css, /app.js, /pdf-viewer.js …) load from the live site;
 *  - the bridge script (first thing in <head>) feeds the unsaved draft to the site's own code;
 *  - preload hints for the real data are dropped (the draft replaces that data).
 */
export function injectBridge(html: string, bridgeSource: string): string {
  const site = websiteOrigin();
  const cleaned = html.replace(/<link\b[^>]*\brel=["']?preload["']?[^>]*>/gi, "").replace(/<base\b[^>]*>/gi, "");
  const injection = `<base href="${site}/"><script>${bridgeSource.replace(/<\/script/gi, "<\\/script")}</script>`;
  return /<head\b[^>]*>/i.test(cleaned)
    ? cleaned.replace(/<head\b[^>]*>/i, (m) => `${m}${injection}`)
    : `${injection}${cleaned}`;
}
