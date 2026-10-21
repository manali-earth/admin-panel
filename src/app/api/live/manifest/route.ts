import { NextResponse } from "next/server";
import { requestHasValidSession } from "@/lib/auth";
import { sitePathToUrl } from "@/lib/live-site";
import { extractHtmlTexts, extractScriptTexts, mergeItems } from "@/lib/site-text";

/** Pages whose static text is editable. Fetched live, so a new page or a reworded heading shows up with no update here. */
const PAGES = ["/", "/my-story/", "/education-experience/", "/projects/", "/publications/", "/conferences/", "/posters/"];

async function fetchText(path: string): Promise<string> {
  const url = sitePathToUrl(path);
  if (!url) return "";
  try {
    const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

/** Every editable piece of site wording, read from the live website. */
export async function GET(request: Request) {
  if (!(await requestHasValidSession(request))) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const [pages, js] = await Promise.all([Promise.all(PAGES.map(fetchText)), fetchText("/app.js")]);
  if (pages.every((p) => !p) && !js) {
    return NextResponse.json({ error: "The website could not be reached." }, { status: 502 });
  }
  const items = mergeItems(extractScriptTexts(js), ...pages.map(extractHtmlTexts));
  return NextResponse.json({ items });
}
