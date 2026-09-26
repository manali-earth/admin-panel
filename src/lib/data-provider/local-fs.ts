import fs from "node:fs/promises";
import path from "node:path";
import type { DatabaseIndex, PageDataMap, PageKey } from "@/lib/types";
import { PAGE_FILENAMES } from "@/lib/page-filenames";
import type { CommitRequest, CommitResult, DataProvider, FileChange } from "./types";

/**
 * Stand-in for the two GitHub repos, used until real repo URLs exist.
 *
 * local-data/website/database/database.json  -> what will live in the WEBSITE repo
 * local-data/database/*                       -> what will live in the DATABASE repo
 *
 * Layout mirrors the real split exactly, so moving to GithubProvider later
 * is a data-source swap, not a schema change.
 */
const REPO_ROOT = process.cwd();
const WEBSITE_DB_JSON = path.join(REPO_ROOT, "local-data/website/database/database.json");
const DATABASE_DIR = path.join(REPO_ROOT, "local-data/database");
// Images also get mirrored here so the browser can actually fetch them at
// the same imageBase-relative path the live site would use.
const PUBLIC_DATABASE_DIR = path.join(REPO_ROOT, "public/database");

export class LocalFsProvider implements DataProvider {
  async getDatabaseIndex(): Promise<DatabaseIndex> {
    const raw = await fs.readFile(WEBSITE_DB_JSON, "utf8");
    return JSON.parse(raw) as DatabaseIndex;
  }

  async getPageData<K extends PageKey>(key: K): Promise<PageDataMap[K]> {
    const file = path.join(DATABASE_DIR, PAGE_FILENAMES[key]);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as PageDataMap[K];
  }

  async commit(request: CommitRequest): Promise<CommitResult> {
    for (const change of request.databaseFiles) {
      await writeUnder(DATABASE_DIR, change);
      if (change.path.startsWith("photos/")) {
        await writeUnder(PUBLIC_DATABASE_DIR, change);
      }
    }
    for (const deletionPath of request.databaseFileDeletions ?? []) {
      await deleteUnder(DATABASE_DIR, deletionPath);
      if (deletionPath.startsWith("photos/")) {
        await deleteUnder(PUBLIC_DATABASE_DIR, deletionPath);
      }
    }
    return { provider: "local-fs" };
  }
}

async function writeUnder(root: string, change: FileChange): Promise<void> {
  const dest = path.join(root, change.path);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(change.contentsBase64, "base64"));
}

async function deleteUnder(root: string, relativePath: string): Promise<void> {
  try {
    await fs.unlink(path.join(root, relativePath));
  } catch (err) {
    // Already gone is fine — same end state as a successful delete.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
