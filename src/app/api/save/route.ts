import { NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data-provider";
import type { CommitRequest } from "@/lib/data-provider/types";
import { requestHasValidSession } from "@/lib/auth";
import { PAGE_FILENAMES } from "@/lib/page-filenames";
import { SITE_TEXT_FILENAME } from "@/lib/site-text";
import { checkPhotosLimit, limitMessage, photosLimitBytes, PHOTOS_PREFIX } from "@/lib/storage-limit";

const JSON_FILES = new Set<string>([...Object.values(PAGE_FILENAMES), SITE_TEXT_FILENAME]);

/** Only page JSON files and photos/ may be written — nothing else in the repo can be touched through this route. */
function isAllowedPath(path: unknown): path is string {
  if (typeof path !== "string" || path.includes("..") || path.includes("\\") || path.startsWith("/")) return false;
  return JSON_FILES.has(path) || (path.startsWith(PHOTOS_PREFIX) && path.length > PHOTOS_PREFIX.length);
}

export async function POST(request: Request) {
  if (!(await requestHasValidSession(request))) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  let body: CommitRequest;
  try {
    body = (await request.json()) as CommitRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body?.databaseFiles)) {
    return NextResponse.json({ error: "Expected { databaseFiles }" }, { status: 400 });
  }
  const deletions = body.databaseFileDeletions ?? [];
  if (
    !body.databaseFiles.every((f) => isAllowedPath(f?.path) && typeof f.contentsBase64 === "string") ||
    !deletions.every((p) => isAllowedPath(p) && p.startsWith(PHOTOS_PREFIX))
  ) {
    return NextResponse.json({ error: "One of the files is not allowed to be saved." }, { status: 400 });
  }

  try {
    const provider = getDataProvider();

    // Storage limit: measure what photos/ WOULD weigh after this save, before anything is sent to GitHub.
    const check = checkPhotosLimit(await provider.getPhotoSizes(), body.databaseFiles, deletions, photosLimitBytes());
    if (!check.ok) {
      return NextResponse.json({ error: limitMessage(check), code: "STORAGE_LIMIT", ...check }, { status: 413 });
    }

    // The commit message is always neutral — whatever the browser sent is ignored.
    const result = await provider.commit({
      message: `Update content — ${new Date().toISOString()}`,
      databaseFiles: body.databaseFiles,
      databaseFileDeletions: deletions
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
