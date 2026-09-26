/**
 * Direct port of app.js's `img()` helper, so the admin preview resolves
 * image paths exactly the way the live site does: an absolute http(s) URL
 * passes through untouched, anything else is resolved against imageBase.
 */
export function resolveImage(imageBase: string, path?: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return imageBase + path;
}

/**
 * A staged (not-yet-saved) image is previewed from an in-memory object URL
 * rather than a real path — draft state stores those under this prefix so
 * resolveImage's http(s) passthrough branch renders them directly.
 */
export const STAGED_IMAGE_PREFIX = "staged:";

export function isStagedImage(path?: string): boolean {
  return !!path && path.startsWith(STAGED_IMAGE_PREFIX);
}
