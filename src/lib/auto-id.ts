import type { PageKey } from "./types";

/**
 * Items that get a detail page (?view=<id>) need a unique id. Editors never type
 * one: new items get a generated id, and existing items that lack one are backfilled
 * on load. Existing ids are never changed, so links that are already out there keep working.
 */

/** Where each page keeps lists whose items carry an id. */
const ID_LISTS: Partial<Record<PageKey, string[][]>> = {
  gisProjects: [["projects"]],
  researchPublications: [["publications"]],
  conferences: [["items"]],
  leadership: [["items"]],
  home: [["projects"], ["publications"]]
};

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

/** A fresh random id, e.g. "project-k3f9a2x1". Collision-safe against `taken`. */
export function generateId(label: string, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  const base = slug(label);
  let id: string;
  do {
    const rand =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
        : Math.random().toString(36).slice(2, 10).padEnd(8, "0");
    id = `${base}-${rand}`;
  } while (used.has(id));
  return id;
}

/** Returns the data with an id on every list item that lacks one (numbered in list order, so it is stable across reloads). */
export function withAutoIds<T>(key: PageKey, data: T): T {
  const lists = ID_LISTS[key];
  if (!lists) return data;
  const next = structuredClone(data) as Record<string, unknown>;
  for (const path of lists) {
    let node: unknown = next;
    for (const seg of path) node = (node as Record<string, unknown> | undefined)?.[seg];
    if (!Array.isArray(node)) continue;
    const prefix = slug(path[path.length - 1] ?? "item").replace(/s$/, "");
    const taken = new Set(node.map((x) => (x as { id?: string })?.id).filter((x): x is string => !!x));
    let n = 0;
    for (const item of node as Array<Record<string, unknown>>) {
      if (!item || typeof item !== "object" || item.id) continue;
      do n += 1;
      while (taken.has(`${prefix}-${n}`));
      item.id = `${prefix}-${n}`;
      taken.add(item.id as string);
    }
  }
  return next as T;
}
