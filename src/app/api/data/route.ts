import { NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data-provider";
import type { PageKey } from "@/lib/types";
import { requestHasValidSession } from "@/lib/auth";

const PAGE_KEYS: PageKey[] = [
  "home",
  "myStory",
  "educationExperience",
  "gisProjects",
  "researchPublications",
  "conferences",
  "posters"
];

export async function GET(request: Request) {
  if (!(await requestHasValidSession(request))) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const provider = getDataProvider();
    const index = await provider.getDatabaseIndex();
    const entries = await Promise.all(PAGE_KEYS.map(async (key) => [key, await provider.getPageData(key, index)] as const));
    const pages = Object.fromEntries(entries);
    const siteText = await provider.getSiteText();
    return NextResponse.json({ index, pages, siteText });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
