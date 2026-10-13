import type { FieldDef } from "./page-schemas";

/**
 * Every uploaded file ("image" fields and PDF blocks) currently referenced in `data`, walking lists
 * and blockLists too. Used by content-store's save() to work out which
 * images got dropped (replaced or their list item deleted) so the old file
 * can be deleted from the repo in the same commit, instead of piling up
 * forever — see the storage-growth discussion this was written for.
 */
export function collectImagePaths(fields: FieldDef[], data: unknown): Set<string> {
  const paths = new Set<string>();

  function walk(fieldList: FieldDef[], node: unknown) {
    if (node == null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    for (const field of fieldList) {
      const value = record[field.key];
      if (field.kind === "image") {
        if (typeof value === "string" && value) paths.add(value);
      } else if (field.kind === "group") {
        walk(field.fields, value);
      } else if (field.kind === "list") {
        if (Array.isArray(value)) value.forEach((item) => walk(field.itemFields, item));
      } else if (field.kind === "blockList") {
        if (Array.isArray(value)) {
          for (const block of value as Array<{ type?: string; image?: string; pdf?: string }>) {
            if (block?.type === "image" && block.image) paths.add(block.image);
            if (block?.type === "pdf" && block.pdf) paths.add(block.pdf);
          }
        }
      }
      // "text" | "textarea" | "stringList" carry no image paths.
    }
  }

  walk(fields, data);
  return paths;
}
