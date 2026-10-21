import { NextResponse } from "next/server";
import { sitePathToUrl } from "@/lib/live-site";

/**
 * Two files of the live website that the admin's own screens reuse, fetched from the deployed site on request:
 * its stylesheet (so the editor looks like the site) and its PDF viewer script. Public on purpose — they are
 * public files of the website, and the login screen needs the stylesheet too.
 */
const ASSETS: Record<string, { path: string; type: string; transform?: (body: string) => string }> = {
  // The admin keeps its own --ink / --paper / --font-body tokens, so the site's three clashing ones are renamed.
  "styles.css": {
    path: "/styles.css",
    type: "text/css; charset=utf-8",
    transform: (css) => css.replace(/--(ink|paper|font-body)(?![\w-])/g, "--site-$1")
  },
  "pdf-viewer.js": { path: "/pdf-viewer.js", type: "text/javascript; charset=utf-8" }
};

const lastGood = new Map<string, string>();

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const asset = ASSETS[name];
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = sitePathToUrl(asset.path)!;
  let body: string | undefined;
  try {
    const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
    if (res.ok) {
      body = await res.text();
      if (asset.transform) body = asset.transform(body);
      lastGood.set(name, body);
    }
  } catch {
    /* fall back to the last copy fetched by this instance */
  }
  body ??= lastGood.get(name);
  if (body === undefined) return NextResponse.json({ error: "The website could not be reached." }, { status: 502 });
  return new Response(body, { headers: { "Content-Type": asset.type, "Cache-Control": "public, max-age=60" } });
}
