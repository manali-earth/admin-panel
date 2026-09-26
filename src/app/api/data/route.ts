import { NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data-provider";
import type { PageKey } from "@/lib/types";

const PAGE_KEYS: PageKey[] = [
  "home",
  "myStory",
  "educationExperience",
  "gisProjects",
  "researchPublications",
  "conferences",
  "leadership"
];

export async function GET() {
  try {
    const provider = getDataProvider();
    const index = await provider.getDatabaseIndex();
    const entries = await Promise.all(PAGE_KEYS.map(async (key) => [key, await provider.getPageData(key, index)] as const));
    const pages = Object.fromEntries(entries);
    return NextResponse.json({ index, pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
