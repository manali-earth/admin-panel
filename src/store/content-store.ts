import { create } from "zustand";
import type { AnyPageData, DatabaseIndex, PageDataMap, PageKey } from "@/lib/types";
import { PAGE_FILENAMES, PHOTO_FOLDER } from "@/lib/page-filenames";
import { STAGED_IMAGE_PREFIX } from "@/lib/image-path";
import { appendAtPath, getAtPath, moveAtPath, removeAtPath, setAtPath, type PathSegment } from "@/lib/object-path";
import { fileToBase64, generateImageFilename, utf8ToBase64 } from "@/lib/base64";
import { collectImagePaths } from "@/lib/collect-image-paths";
import { schemaForKey } from "@/lib/page-schemas";
import { withAutoIds } from "@/lib/auto-id";
import type { CommitRequest } from "@/lib/data-provider/types";
import { SITE_TEXT_FILENAME, type SiteTextMap } from "@/lib/site-text";

export type FieldPath = PathSegment[];
export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

type PagesState = Partial<Record<PageKey, AnyPageData>>;

interface StagedUpload {
  id: string; // "staged:<filename>" — this is what sits in the draft JSON until save
  pageKey: PageKey;
  filePath: string; // commit destination in the database repo, e.g. "photos/home/173..-ab12cd.jpg"
  jsonValue: string; // value written into the JSON in place of `id` — no "photos/" prefix, since
  // imageBase (e.g. "/database/photos/") already supplies it. Matches the shape every existing
  // image reference already uses, e.g. "home/173..-ab12cd.jpg".
  previewUrl: string; // blob: URL for immediate <img> preview
  contentsBase64: string;
}

interface Snapshot {
  pages: PagesState;
  siteText: SiteTextMap;
}

export interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
}

const HISTORY_LIMIT = 50;

interface ContentStore {
  databaseIndex: DatabaseIndex | null;
  original: PagesState;
  draft: PagesState;
  dirty: Partial<Record<PageKey, boolean>>;
  uploads: Record<string, StagedUpload>;
  history: Snapshot[];
  historyIndex: number;
  saveStatus: SaveStatus;
  saveError: string | null;
  /** Set when the last save was refused because the photos folder would exceed its size limit. */
  storageLimitHit: boolean;
  /** Size of the photos folder vs. its limit, for the usage meter. */
  storage: StorageInfo | null;
  /** Wording overrides for the website's fixed text (site-text.json). */
  siteTextOriginal: SiteTextMap;
  siteTextDraft: SiteTextMap;
  siteTextDirty: boolean;
  /** Whole-app UI mode: false = admin editor, true = simulated live site (fed by draft). */
  previewMode: boolean;
  /** Which page the preview iframe is currently showing — may drift from the admin's own
   * route if you click around inside the simulated site's own nav. Exiting preview should
   * return you to *this* page, not wherever the admin route originally was. */
  previewPageKey: PageKey | null;
  sidebarCollapsed: boolean;

  setDatabaseIndex: (index: DatabaseIndex) => void;
  loadPage: <K extends PageKey>(key: K, data: PageDataMap[K]) => void;
  loadSiteText: (data: SiteTextMap) => void;
  /** Sets the wording shown for `key`; an empty value removes the override (the website's own wording returns). */
  setSiteText: (key: string, value: string) => void;
  refreshStorage: () => Promise<void>;

  setField: (key: PageKey, path: FieldPath, value: unknown) => void;
  addListItem: (key: PageKey, path: FieldPath, item: unknown) => void;
  removeListItemAt: (key: PageKey, path: FieldPath, index: number) => void;
  removeListItemById: (key: PageKey, path: FieldPath, id: string) => void;
  moveListItem: (key: PageKey, path: FieldPath, from: number, to: number) => void;
  /** Stages an uploaded image or PDF; it is committed with the next Save. */
  stageFile: (key: PageKey, path: FieldPath, file: File) => Promise<void>;

  isDirty: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  resetAll: () => void;
  save: () => Promise<void>;
  enterPreview: (pageKey: PageKey) => void;
  exitPreview: () => void;
  setPreviewPageKey: (pageKey: PageKey) => void;
  toggleSidebarCollapsed: () => void;

  imagePreviewUrl: (value: string | undefined) => string | undefined;
}

function mutate(
  set: (partial: Partial<ContentStore>) => void,
  get: () => ContentStore,
  key: PageKey,
  updater: (data: AnyPageData) => AnyPageData
) {
  const state = get();
  const current = state.draft[key];
  if (!current) return;
  const nextPage = updater(current);
  const nextDraft: PagesState = { ...state.draft, [key]: nextPage };
  const truncated = state.history.slice(0, state.historyIndex + 1);
  const snapshot: Snapshot = { pages: structuredClone(nextDraft), siteText: { ...state.siteTextDraft } };
  const nextHistory = [...truncated, snapshot].slice(-HISTORY_LIMIT);
  set({
    draft: nextDraft,
    dirty: { ...state.dirty, [key]: true },
    saveStatus: "unsaved",
    history: nextHistory,
    historyIndex: nextHistory.length - 1
  });
}

export const useContentStore = create<ContentStore>((set, get) => ({
  databaseIndex: null,
  original: {},
  draft: {},
  dirty: {},
  uploads: {},
  history: [{ pages: {}, siteText: {} }],
  historyIndex: 0,
  saveStatus: "saved",
  saveError: null,
  storageLimitHit: false,
  storage: null,
  siteTextOriginal: {},
  siteTextDraft: {},
  siteTextDirty: false,
  previewMode: false,
  previewPageKey: null,
  sidebarCollapsed: false,

  setDatabaseIndex: (index) => set({ databaseIndex: index }),

  loadPage: (key, data) => {
    const state = get();
    if (state.draft[key]) return; // already loaded — don't clobber in-progress edits
    const withIds = withAutoIds(key, data); // items without an id get one automatically
    const nextOriginal = { ...state.original, [key]: withIds };
    const nextDraft = { ...state.draft, [key]: structuredClone(withIds) };
    set({
      original: nextOriginal,
      draft: nextDraft,
      history: [{ pages: structuredClone(nextDraft), siteText: { ...state.siteTextDraft } }],
      historyIndex: 0
    });
  },

  loadSiteText: (data) => {
    if (get().siteTextDirty) return; // don't clobber in-progress edits
    set({ siteTextOriginal: { ...data }, siteTextDraft: { ...data } });
  },

  setSiteText: (key, value) => {
    const state = get();
    const next = { ...state.siteTextDraft };
    if (value === "") delete next[key];
    else next[key] = value;
    const truncated = state.history.slice(0, state.historyIndex + 1);
    const nextHistory = [...truncated, { pages: structuredClone(state.draft), siteText: { ...next } }].slice(-HISTORY_LIMIT);
    set({
      siteTextDraft: next,
      siteTextDirty: JSON.stringify(sortKeys(next)) !== JSON.stringify(sortKeys(state.siteTextOriginal)),
      saveStatus: "unsaved",
      history: nextHistory,
      historyIndex: nextHistory.length - 1
    });
  },

  refreshStorage: async () => {
    try {
      const res = await fetch("/api/storage");
      if (res.ok) set({ storage: (await res.json()) as StorageInfo });
    } catch {
      /* the meter is informational only */
    }
  },

  setField: (key, path, value) => mutate(set, get, key, (data) => setAtPath(data, path, value)),

  addListItem: (key, path, item) => mutate(set, get, key, (data) => appendAtPath(data, path, item)),

  removeListItemAt: (key, path, index) => mutate(set, get, key, (data) => removeAtPath(data, path, index)),

  removeListItemById: (key, path, id) =>
    mutate(set, get, key, (data) => {
      const arr = (getAtPath(data, path) as Array<{ id?: string }>) ?? [];
      const index = arr.findIndex((x) => x.id === id);
      return index === -1 ? data : removeAtPath(data, path, index);
    }),

  moveListItem: (key, path, from, to) => mutate(set, get, key, (data) => moveAtPath(data, path, from, to)),

  stageFile: async (key, path, file) => {
    const folder = PHOTO_FOLDER[key];
    const filename = generateImageFilename(file.name);
    const jsonValue = `${folder}/${filename}`;
    const filePath = `photos/${jsonValue}`;
    const [contentsBase64, previewUrl] = await Promise.all([fileToBase64(file), Promise.resolve(URL.createObjectURL(file))]);
    const uploadId = `${STAGED_IMAGE_PREFIX}${filename}`;

    set({ uploads: { ...get().uploads, [uploadId]: { id: uploadId, pageKey: key, filePath, jsonValue, previewUrl, contentsBase64 } } });
    get().setField(key, path, uploadId);
  },

  isDirty: () => Object.values(get().dirty).some(Boolean) || Object.keys(get().uploads).length > 0 || get().siteTextDirty,
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    const idx = state.historyIndex - 1;
    const snapshot = state.history[idx];
    if (!snapshot) return;
    set({ draft: structuredClone(snapshot.pages), siteTextDraft: { ...snapshot.siteText }, siteTextDirty: textChanged(snapshot.siteText, get().siteTextOriginal), historyIndex: idx, saveStatus: "unsaved" });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const idx = state.historyIndex + 1;
    const snapshot = state.history[idx];
    if (!snapshot) return;
    set({ draft: structuredClone(snapshot.pages), siteTextDraft: { ...snapshot.siteText }, siteTextDirty: textChanged(snapshot.siteText, get().siteTextOriginal), historyIndex: idx, saveStatus: "unsaved" });
  },

  resetAll: () => {
    const state = get();
    const resetDraft = structuredClone(state.original);
    Object.values(state.uploads).forEach((u) => URL.revokeObjectURL(u.previewUrl));
    set({
      draft: resetDraft,
      dirty: {},
      uploads: {},
      siteTextDraft: { ...state.siteTextOriginal },
      siteTextDirty: false,
      history: [{ pages: structuredClone(resetDraft), siteText: { ...state.siteTextOriginal } }],
      historyIndex: 0,
      saveStatus: "saved",
      saveError: null,
      storageLimitHit: false
    });
  },

  save: async () => {
    const state = get();
    const dirtyKeys = (Object.keys(state.dirty) as PageKey[]).filter((k) => state.dirty[k]);
    const uploadList = Object.values(state.uploads);
    if (dirtyKeys.length === 0 && uploadList.length === 0 && !state.siteTextDirty) return;

    set({ saveStatus: "saving", saveError: null, storageLimitHit: false });

    try {
      const databaseFiles: CommitRequest["databaseFiles"] = [];
      const finalized: PagesState = {};
      // Only staged uploads that actually end up referenced in the saved JSON get committed —
      // otherwise re-staging over an already-staged (but unsaved) image would silently commit
      // the abandoned first upload too, wasting repo storage on a file nothing points to.
      const usedUploadIds = new Set<string>();

      const pagesToWrite = new Set<PageKey>(dirtyKeys);
      uploadList.forEach((u) => pagesToWrite.add(u.pageKey));

      for (const key of pagesToWrite) {
        const data = state.draft[key];
        if (!data) continue;
        let json = JSON.stringify(data, null, 2) + "\n";
        for (const upload of uploadList) {
          if (upload.pageKey === key && json.includes(upload.id)) {
            usedUploadIds.add(upload.id);
            json = json.split(upload.id).join(upload.jsonValue);
          }
        }
        finalized[key] = JSON.parse(json);
        databaseFiles.push({ path: PAGE_FILENAMES[key], contentsBase64: utf8ToBase64(json) });
      }

      for (const upload of uploadList) {
        if (usedUploadIds.has(upload.id)) {
          databaseFiles.push({ path: upload.filePath, contentsBase64: upload.contentsBase64 });
        }
      }

      const databaseFileDeletions = computeOrphanedImageDeletions(state, finalized, pagesToWrite);

      if (state.siteTextDirty) {
        databaseFiles.push({ path: SITE_TEXT_FILENAME, contentsBase64: utf8ToBase64(JSON.stringify(sortKeys(state.siteTextDraft), null, 2) + "\n") });
      }

      // The server measures what photos/ would weigh after this save BEFORE anything reaches GitHub,
      // and refuses (413) when that is over the limit. Nothing is lost: the draft stays as it is.
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseFiles, databaseFileDeletions })
      });
      if (!res.ok) {
        const raw = await res.text();
        let parsed: { error?: string; code?: string } = {};
        try {
          parsed = JSON.parse(raw) as { error?: string; code?: string };
        } catch {
          /* not JSON (e.g. the platform rejected an oversized request) */
        }
        if (parsed.code === "STORAGE_LIMIT" || (res.status === 413 && !parsed.error)) {
          set({
            saveStatus: "error",
            storageLimitHit: true,
            saveError: parsed.error ?? "Storage limit reached — failed to save. The files are too large to upload in one save. Remove some photos or use smaller files, then save again."
          });
          void get().refreshStorage();
          return;
        }
        throw new Error(parsed.error || raw || `Save failed (${res.status})`);
      }

      set((s) => {
        const nextOriginal = { ...s.original };
        const nextDraft = { ...s.draft };
        const nextDirty = { ...s.dirty };
        (Object.keys(finalized) as PageKey[]).forEach((key) => {
          nextOriginal[key] = finalized[key];
          nextDraft[key] = finalized[key];
          nextDirty[key] = false;
        });
        return {
          original: nextOriginal,
          draft: nextDraft,
          dirty: nextDirty,
          uploads: {},
          saveStatus: "saved",
          siteTextOriginal: { ...s.siteTextDraft },
          siteTextDirty: false
        };
      });
      void get().refreshStorage();
    } catch (err) {
      set({ saveStatus: "error", saveError: err instanceof Error ? err.message : String(err) });
    }
  },

  enterPreview: (pageKey) => set({ previewMode: true, previewPageKey: pageKey }),
  exitPreview: () => set({ previewMode: false }),
  setPreviewPageKey: (pageKey) => set({ previewPageKey: pageKey }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  imagePreviewUrl: (value) => {
    if (!value) return undefined;
    if (value.startsWith(STAGED_IMAGE_PREFIX)) return get().uploads[value]?.previewUrl;
    const base = get().databaseIndex?.imageBase ?? "";
    if (/^https?:\/\//.test(value)) return value;
    return base + value;
  }
}));

/**
 * Finds images that this save is about to make unreachable — replaced in
 * place, or their whole list item deleted — so they can be removed from the
 * repo in the same commit rather than sitting there forever. A path is only
 * ever deleted if it's genuinely gone from every page's current data, not
 * just the pages being written this round (in case the same file is
 * legitimately referenced from two places).
 */
function computeOrphanedImageDeletions(state: { original: PagesState; draft: PagesState }, finalized: PagesState, pagesToWrite: Set<PageKey>): string[] {
  const droppedPaths = new Set<string>();

  for (const key of pagesToWrite) {
    const schema = schemaForKey(key);
    const oldPaths = collectImagePaths(schema.fields, state.original[key]);
    const newPaths = collectImagePaths(schema.fields, finalized[key]);
    for (const oldPath of oldPaths) {
      if (!newPaths.has(oldPath)) droppedPaths.add(oldPath);
    }
  }

  if (droppedPaths.size === 0) return [];

  // Safety net: keep anything still referenced by any page's current data —
  // written this round (use the just-finalized version) or not (use draft).
  for (const key of Object.keys(state.draft) as PageKey[]) {
    const schema = schemaForKey(key);
    const data = pagesToWrite.has(key) ? finalized[key] : state.draft[key];
    for (const stillUsed of collectImagePaths(schema.fields, data)) {
      droppedPaths.delete(stillUsed);
    }
  }

  return [...droppedPaths].map((p) => `photos/${p}`);
}

/**
 * The store's internal draft/original are keyed generically (AnyPageData)
 * because the mutation engine is path-based and doesn't need to know each
 * page's exact shape. Call sites that DO know which page they want (e.g.
 * ListPicker always wants HomeData) use this instead of casting inline.
 */
function sortKeys(map: SiteTextMap): SiteTextMap {
  return Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k] ?? ""]));
}

function textChanged(a: SiteTextMap, b: SiteTextMap): boolean {
  return JSON.stringify(sortKeys(a)) !== JSON.stringify(sortKeys(b));
}

export function usePageDraft<K extends PageKey>(key: K): PageDataMap[K] | undefined {
  return useContentStore((s) => s.draft[key]) as PageDataMap[K] | undefined;
}
