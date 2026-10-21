import { NextResponse } from "next/server";
import { requestHasValidSession } from "@/lib/auth";
import { bridgeSource } from "@/lib/live-bridge";
import { dataOrigins, injectBridge, previewCsp, sitePathToUrl, websiteOrigin } from "@/lib/live-site";

/**
 * The live website, made previewable: the real page HTML is fetched from the deployed site on every request
 * and given the bridge (see live-bridge.ts). Its CSS, JS and fonts load straight from the live site.
 */
export async function GET(request: Request) {
  if (!(await requestHasValidSession(request))) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const rawPath = new URL(request.url).searchParams.get("path") || "/";
  const target = sitePathToUrl(rawPath);
  if (!target) return NextResponse.json({ error: "Invalid path." }, { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: { Accept: "text/html", "Cache-Control": "no-cache" }, redirect: "follow" });
  } catch (err) {
    return NextResponse.json({ error: `Could not reach the website: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }
  const type = upstream.headers.get("content-type") || "";
  if (!type.includes("text/html")) {
    return NextResponse.json({ error: `The website returned ${upstream.status} (${type || "no content type"}) for ${target.pathname}.` }, { status: 502 });
  }
  const html = injectBridge(await upstream.text(), bridgeSource(websiteOrigin()));
  return new Response(html, {
    status: upstream.status === 404 ? 404 : 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": previewCsp(await dataOrigins()),
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
