import type { DatabaseIndex, PageDataMap, PageKey } from "@/lib/types";

/** One file to write, relative to the database repo's root. Binary or text — always base64. */
export interface FileChange {
  path: string;
  contentsBase64: string;
}

export interface CommitRequest {
  message: string;
  databaseFiles: FileChange[];
  /** Paths (relative to the database repo root) to delete in the same commit — orphaned images, mainly. */
  databaseFileDeletions?: string[];
}

export interface CommitResult {
  provider: "local-fs" | "github";
  commitUrl?: string;
  commitSha?: string;
}

/**
 * Everything the admin panel needs from "the two repos" goes through this
 * interface. Swapping local-fs for real GitHub repos later is an env-var
 * change (DATA_PROVIDER=github + the repo/token settings below) — nothing
 * in app/, components/, or store/ needs to change.
 */
export interface DataProvider {
  getDatabaseIndex(): Promise<DatabaseIndex>;
  getPageData<K extends PageKey>(key: K, index: DatabaseIndex): Promise<PageDataMap[K]>;
  /** Writes every file in one atomic commit (or one atomic local write in dev). */
  commit(request: CommitRequest): Promise<CommitResult>;
}
