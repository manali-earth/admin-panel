import { NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data-provider";
import { requestHasValidSession } from "@/lib/auth";
import { photosLimitBytes } from "@/lib/storage-limit";

/** Current size of the photos folder and the configured maximum, for the usage meter. */
export async function GET(request: Request) {
  if (!(await requestHasValidSession(request))) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    let used = 0;
    for (const size of (await getDataProvider().getPhotoSizes()).values()) used += size;
    return NextResponse.json({ usedBytes: used, limitBytes: photosLimitBytes() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
