import type { DatabaseIndex, PageDataMap, PageKey } from "@/lib/types";
import { PAGE_FILENAMES } from "@/lib/page-filenames";
import type { CommitRequest, CommitResult, DataProvider } from "./types";

const GITHUB_REST_URL = "https://api.github.com";

interface GithubProviderConfig {
  token?: string;
  websiteRepo?: string;
  websiteBranch: string;
  websiteIndexPath: string;
  databaseRepo: string; // "owner/name"
  databaseBranch: string;
  databaseIndexPath: string;
}

function readConfig(): GithubProviderConfig {
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  const websiteRepo = process.env.WEBSITE_REPO?.trim() || undefined;
  const databaseRepo = process.env.DATABASE_REPO?.trim();
  if (!databaseRepo) {
    throw new Error("GithubProvider requires DATABASE_REPO to be set (see .env.example).");
  }
  return {
    token,
    websiteRepo,
    websiteBranch: process.env.WEBSITE_BRANCH || "main",
    websiteIndexPath: process.env.WEBSITE_INDEX_PATH || "database/database.json",
    databaseRepo,
    databaseBranch: process.env.DATABASE_BRANCH || "main",
    databaseIndexPath: process.env.DATABASE_INDEX_PATH || "database.json"
  };
}

function splitRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error(`Expected "owner/name", got "${repo}"`);
  return { owner, name };
}

export class GithubProvider implements DataProvider {
  private config = readConfig();

  async getDatabaseIndex(): Promise<DatabaseIndex> {
    const indexRepo = this.config.websiteRepo || this.config.databaseRepo;
    const indexBranch = this.config.websiteRepo ? this.config.websiteBranch : this.config.databaseBranch;
    const indexPath = this.config.websiteRepo ? this.config.websiteIndexPath : this.config.databaseIndexPath;
    const { owner, name } = splitRepo(indexRepo);
    const raw = await this.fetchFileContents(owner, name, indexBranch, indexPath);
    return JSON.parse(raw) as DatabaseIndex;
  }

  async getPageData<K extends PageKey>(key: K): Promise<PageDataMap[K]> {
    const { owner, name } = splitRepo(this.config.databaseRepo);
    const raw = await this.fetchFileContents(owner, name, this.config.databaseBranch, PAGE_FILENAMES[key]);
    return JSON.parse(raw) as PageDataMap[K];
  }

  /** Reads a single file via the REST Contents API (works for public and private repos). */
  private async fetchFileContents(owner: string, name: string, ref: string, filePath: string): Promise<string> {
    const url = `${GITHUB_REST_URL}/repos/${owner}/${name}/contents/${filePath}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, { headers: this.authHeaders() });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(
        `GitHub contents fetch failed for ${owner}/${name}/${filePath}: ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`
      );
    }
    const json = (await res.json()) as { content: string; encoding: string };
    if (json.encoding !== "base64") throw new Error(`Unexpected encoding "${json.encoding}" for ${filePath}`);
    return Buffer.from(json.content, "base64").toString("utf8");
  }

  /**
   * Creates one atomic commit containing all JSON and image changes.
   *
   * The Git Database API is used instead of createCommitOnBranch because the
   * latter sends large binary images as GraphQL input variables. Here each
   * image is uploaded as a blob, then one tree, one commit, and one fast-forward
   * ref update are created. Readers see the new files only after the final ref
   * update, and empty/non-JSON GitHub responses are reported clearly.
   */
  async commit(request: CommitRequest): Promise<CommitResult> {
    if (!this.config.token) {
      throw new Error("GITHUB_TOKEN is required to save changes when DATA_PROVIDER=github.");
    }
    const { owner, name } = splitRepo(this.config.databaseRepo);
    const branch = this.config.databaseBranch;
    const head = await this.githubJson<{ object: { sha: string } }>(
      `/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(branch)}`
    );
    const headSha = head.object.sha;
    const headCommit = await this.githubJson<{ tree: { sha: string } }>(
      `/repos/${owner}/${name}/git/commits/${headSha}`
    );

    const blobs = await Promise.all(
      request.databaseFiles.map(async (file) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: await this.createBlob(owner, name, file.contentsBase64)
      }))
    );
    const tree = await this.githubJson<{ sha: string }>(`/repos/${owner}/${name}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: headCommit.tree.sha,
        tree: [
          ...blobs,
          ...(request.databaseFileDeletions ?? []).map((path) => ({
            path,
            mode: "100644",
            type: "blob",
            sha: null
          }))
        ]
      })
    });
    const commit = await this.githubJson<{ sha: string; html_url: string }>(`/repos/${owner}/${name}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message: request.message, tree: tree.sha, parents: [headSha] })
    });
    await this.githubJson(`/repos/${owner}/${name}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false })
    });
    return { provider: "github", commitSha: commit.sha, commitUrl: commit.html_url };
  }

  private async createBlob(owner: string, name: string, contentsBase64: string): Promise<string> {
    const blob = await this.githubJson<{ sha: string }>(`/repos/${owner}/${name}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: contentsBase64, encoding: "base64" })
    });
    return blob.sha;
  }

  private authHeaders(): HeadersInit {
    return {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {})
    };
  }

  private async githubJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${GITHUB_REST_URL}${path}`, {
      ...init,
      headers: {
        ...this.authHeaders(),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers
      }
    });
    const text = await res.text();
    let json: T | { message?: string } | undefined;
    try {
      json = text ? (JSON.parse(text) as T | { message?: string }) : undefined;
    } catch {
      throw new Error(`GitHub API returned invalid JSON (${res.status} ${res.statusText}): ${text.slice(0, 300)}`);
    }
    if (!res.ok) {
      const message = json && typeof json === "object" && "message" in json ? json.message : undefined;
      throw new Error(
        `GitHub API error ${res.status} ${res.statusText}: ${message || text.slice(0, 300) || "empty response"}`
      );
    }
    if (!json) throw new Error(`GitHub API returned an empty response for ${path}.`);
    return json as T;
  }
}
