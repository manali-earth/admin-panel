/**
 * Hard cap on the size of the database repo's photos/ directory.
 *
 * Git keeps every version of every file forever, so the repo only ever grows.
 * To stay inside the free tier, a save is refused when the photos/ directory
 * WOULD end up bigger than the limit once the save is applied.
 *
 * The limit is an environment variable so it can be changed without touching code:
 *
 *   PHOTOS_STORAGE_LIMIT_MB=80      (wrangler.toml [vars] / Cloudflare dashboard / .env.local)
 *
 * 1 MB here is 1024 * 1024 bytes (the same unit `du -h` prints).
 */
export const BYTES_PER_MB = 1024 * 1024;
export const DEFAULT_PHOTOS_LIMIT_MB = 80;
export const PHOTOS_PREFIX = "photos/";

export function photosLimitBytes(): number {
  const raw = process.env.PHOTOS_STORAGE_LIMIT_MB?.trim();
  const mb = raw ? Number(raw) : NaN;
  return (Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_PHOTOS_LIMIT_MB) * BYTES_PER_MB;
}

export function formatMB(bytes: number): string {
  const mb = bytes / BYTES_PER_MB;
  return `${mb >= 10 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
}

/** Decoded size of a base64 string, without decoding it. */
export function base64ByteLength(b64: string): number {
  const clean = b64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

export interface PhotosLimitCheck {
  ok: boolean;
  limitBytes: number;
  /** Size of photos/ in the repo right now. */
  currentBytes: number;
  /** Size photos/ would have after this save. */
  projectedBytes: number;
}

/**
 * `existing` maps every file path currently in the repo's photos/ directory to its size in bytes.
 * Replaced files and deleted files are subtracted, new files are added.
 */
export function checkPhotosLimit(
  existing: Map<string, number>,
  additions: { path: string; contentsBase64: string }[],
  deletions: string[],
  limitBytes: number
): PhotosLimitCheck {
  let current = 0;
  for (const size of existing.values()) current += size;

  const next = new Map(existing);
  for (const path of deletions) if (path.startsWith(PHOTOS_PREFIX)) next.delete(path);
  for (const file of additions) {
    if (file.path.startsWith(PHOTOS_PREFIX)) next.set(file.path, base64ByteLength(file.contentsBase64));
  }
  let projected = 0;
  for (const size of next.values()) projected += size;

  return { ok: projected <= limitBytes, limitBytes, currentBytes: current, projectedBytes: projected };
}

/** Message shown to the admin when a save is refused. */
export function limitMessage(check: PhotosLimitCheck): string {
  return (
    `Storage limit reached — failed to save. The photos folder would grow to ${formatMB(check.projectedBytes)}, ` +
    `but the maximum is ${formatMB(check.limitBytes)} (currently ${formatMB(check.currentBytes)}). ` +
    `Nothing was uploaded. Remove some photos or use smaller files, then save again.`
  );
}
