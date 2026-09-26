import type { FieldDef } from "./page-schemas";
import { getAtPath, setAtPath, type PathSegment } from "./object-path";

/**
 * Returns a deep copy of `data` with every "image" field's value resolved
 * through `resolve` (normally content-store's imagePreviewUrl) — turning a
 * relative photos/... path or a staged:... upload id into a real, directly
 * usable URL. Needed because the live-preview iframe is a separate static
 * document with no access to the admin's own image-resolution logic.
 */
export function resolveImagesForPreview<T>(fields: FieldDef[], data: T, resolve: (value: string | undefined) => string | undefined): T {
  let result: T = data;

  function walk(fieldList: FieldDef[], basePath: PathSegment[]) {
    for (const field of fieldList) {
      const path = [...basePath, field.key];
      if (field.kind === "image") {
        const current = getAtPath(result, path) as string | undefined;
        const resolved = resolve(current);
        if (resolved !== current) result = setAtPath(result, path, resolved ?? "");
      } else if (field.kind === "group") {
        walk(field.fields, path);
      } else if (field.kind === "list") {
        const arr = (getAtPath(result, path) as unknown[]) ?? [];
        arr.forEach((_, idx) => walk(field.itemFields, [...path, idx]));
      } else if (field.kind === "blockList") {
        const blocks = (getAtPath(result, path) as Array<{ type: string }>) ?? [];
        blocks.forEach((block, idx) => {
          if (block.type !== "image") return;
          const imagePath = [...path, idx, "image"];
          const current = getAtPath(result, imagePath) as string | undefined;
          const resolved = resolve(current);
          if (resolved !== current) result = setAtPath(result, imagePath, resolved ?? "");
        });
      }
      // "text" | "textarea" | "stringList" carry no image paths.
    }
  }

  walk(fields, []);
  return result;
}
