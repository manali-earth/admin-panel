import type { DatabaseIndex, PageDataMap, PageKey } from "@/lib/types";
import { PAGE_FILENAMES } from "@/lib/page-filenames";
import type { CommitRequest, CommitResult, DataProvider } from "./types";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_REST_URL = "https://api.github.com";

interface GithubProviderConfig {
  token: string;
  websiteRepo: string; // "owner/name"
  websiteBranch: string;
  databaseRepo: string; // "owner/name"
  databaseBranch: string;
}

function readConfig(): GithubProviderConfig {
  const token = process.env.GITHUB_TOKEN;
  const websiteRepo = process.env.WEBSITE_REPO;
  const databaseRepo = process.env.DATABASE_REPO;
  if (!token || !websiteRepo || !databaseRepo) {
    throw new Error(
      "GithubProvider requires GITHUB_TOKEN, WEBSITE_REPO and DATABASE_REPO to be set (see .env.example)."
    );
  }
  return {
    token,
    websiteRepo,
    websiteBranch: process.env.WEBSITE_BRANCH || "main",
    databaseRepo,
    databaseBranch: process.env.DATABASE_BRANCH || "main"
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
    const { owner, name } = splitRepo(this.config.websiteRepo);
    const raw = await this.fetchFileContents(owner, name, this.config.websiteBranch, "database/database.json");
    return JSON.parse(raw) as DatabaseIndex;
  }

  async getPageData<K extends PageKey>(key: K): Promise<PageDataMap[K]> {
    const { owner, name } = splitRepo(this.config.databaseRepo);
    const raw = await this.fetchFileContents(owner, name, this.config.databaseBranch, PAGE_FILENAMES[key]);
    return JSON.parse(raw) as PageDataMap[K];
  }

  /** Reads a single file via the REST Contents API (works for private repos too). */
  private async fetchFileContents(owner: string, name: string, ref: string, filePath: string): Promise<string> {
    const url = `${GITHUB_REST_URL}/repos/${owner}/${name}/contents/${filePath}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!res.ok) {
      throw new Error(`GitHub contents fetch failed for ${owner}/${name}/${filePath}: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { content: string; encoding: string };
    if (json.encoding !== "base64") throw new Error(`Unexpected encoding "${json.encoding}" for ${filePath}`);
    return Buffer.from(json.content, "base64").toString("utf8");
  }

  /**
   * Commits every changed file to the database repo in a single commit via
   * createCommitOnBranch, so a multi-file save (several JSON files plus new
   * images) never lands as a half-applied series of separate commits.
   */
  async commit(request: CommitRequest): Promise<CommitResult> {
    const { owner, name } = splitRepo(this.config.databaseRepo);
    const branch = this.config.databaseBranch;
    const expectedHeadOid = await this.getBranchHeadOid(owner, name, branch);

    const query = /* GraphQL */ `
      mutation ($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            oid
            url
          }
        }
      }
    `;

    const variables = {
      input: {
        branch: {
          repositoryNameWithOwner: `${owner}/${name}`,
          branchName: branch
        },
        message: { headline: request.message },
        expectedHeadOid,
        fileChanges: {
          additions: request.databaseFiles.map((f) => ({
            path: f.path,
            contents: f.contentsBase64
          })),
          deletions: (request.databaseFileDeletions ?? []).map((path) => ({ path }))
        }
      }
    };

    const result = await this.graphql<{
      createCommitOnBranch: { commit: { oid: string; url: string } };
    }>(query, variables);

    return {
      provider: "github",
      commitSha: result.createCommitOnBranch.commit.oid,
      commitUrl: result.createCommitOnBranch.commit.url
    };
  }

  private async getBranchHeadOid(owner: string, name: string, branch: string): Promise<string> {
    const query = /* GraphQL */ `
      query ($owner: String!, $name: String!, $qualifiedName: String!) {
        repository(owner: $owner, name: $name) {
          ref(qualifiedName: $qualifiedName) {
            target {
              oid
            }
          }
        }
      }
    `;
    const result = await this.graphql<{
      repository: { ref: { target: { oid: string } } | null } | null;
    }>(query, { owner, name, qualifiedName: `refs/heads/${branch}` });

    const oid = result.repository?.ref?.target?.oid;
    if (!oid) throw new Error(`Could not resolve HEAD for ${owner}/${name}@${branch}`);
    return oid;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });
    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (!res.ok || json.errors) {
      const message = json.errors?.map((e) => e.message).join("; ") || res.statusText;
      throw new Error(`GitHub GraphQL error: ${message}`);
    }
    return json.data as T;
  }
}
