import { LocalFsProvider } from "./local-fs";
import { GithubProvider } from "./github";
import type { DataProvider } from "./types";

let cached: DataProvider | null = null;

/**
 * DATA_PROVIDER=local  -> local-data/ (this zip's content), no repo needed yet.
 * DATA_PROVIDER=github -> real repos, via GITHUB_TOKEN / WEBSITE_REPO / DATABASE_REPO.
 *
 * This is the one switch the whole app depends on — every route and
 * component talks to `getDataProvider()`, never to LocalFsProvider or
 * GithubProvider directly, so flipping this env var is the entire migration.
 */
export function getDataProvider(): DataProvider {
  if (cached) return cached;
  const mode = process.env.DATA_PROVIDER || "local";
  cached = mode === "github" ? new GithubProvider() : new LocalFsProvider();
  return cached;
}

export type { DataProvider, CommitRequest, CommitResult, FileChange } from "./types";
