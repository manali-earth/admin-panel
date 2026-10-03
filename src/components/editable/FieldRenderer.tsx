"use client";

import type { FieldDef } from "@/lib/page-schemas";
import { fieldReactKey } from "@/lib/page-schemas";
import type { ContentBlock, PageKey } from "@/lib/types";
import { getAtPath } from "@/lib/object-path";
import { type FieldPath, useContentStore } from "@/store/content-store";
import { BlockListEditor } from "./BlockListEditor";
import { EditableImage } from "./EditableImage";
import { EditableText } from "./EditableText";
import { EditableTextarea } from "./EditableTextarea";
import { FieldShell } from "./FieldShell";
import { ListEditor } from "./ListEditor";
import { StringListEditor } from "./StringListEditor";

interface FieldRendererProps {
  pageKey: PageKey;
  field: FieldDef;
  basePath: FieldPath;
}

/**
 * Every editable element on every dedicated page ultimately renders through
 * here. This is the concrete answer to "the editor should understand
 * mappings such as projects[0].title": `path` below IS that mapping,
 * built structurally by walking page-schemas.ts instead of being a
 * hand-written string anywhere.
 */
export function FieldRenderer({ pageKey, field, basePath }: FieldRendererProps) {
  const page = useContentStore((s) => s.draft[pageKey]);
  const setField = useContentStore((s) => s.setField);
  const addListItem = useContentStore((s) => s.addListItem);
  const removeListItemAt = useContentStore((s) => s.removeListItemAt);
  const moveListItem = useContentStore((s) => s.moveListItem);
  const stageImage = useContentStore((s) => s.stageImage);
  const imagePreviewUrl = useContentStore((s) => s.imagePreviewUrl);

  if (!page) return null;

  const path: FieldPath = [...basePath, field.key];
  const value = getAtPath(page, path);

  switch (field.kind) {
    case "text":
      return (
        <FieldShell label={field.label}>
          <EditableText
            value={(value as string) ?? ""}
            onCommit={(v) => setField(pageKey, path, v)}
            placeholder={field.label}
            as={field.as ?? "span"}
          />
        </FieldShell>
      );

    case "textarea":
      return (
        <FieldShell label={field.label}>
          <EditableTextarea value={(value as string) ?? ""} onCommit={(v) => setField(pageKey, path, v)} placeholder={field.label} />
        </FieldShell>
      );

    case "select":
      return (
        <FieldShell label={field.label}>
          <select
            className="editable-input"
            value={(value as string) ?? ""}
            onChange={(e) => setField(pageKey, path, e.target.value)}
          >
            <option value="">Choose a section…</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldShell>
      );

    case "image":
      return (
        <FieldShell label={field.label}>
          <EditableImage src={imagePreviewUrl(value as string | undefined)} onFile={(file) => stageImage(pageKey, path, file)} />
        </FieldShell>
      );

    case "group":
      return (
        <fieldset className="field-group">
          <legend>{field.label}</legend>
          {field.fields.map((f) => (
            <FieldRenderer key={fieldReactKey(f)} pageKey={pageKey} field={f} basePath={path} />
          ))}
        </fieldset>
      );

    case "stringList":
      return (
        <FieldShell label={field.label}>
          <StringListEditor
            values={(value as string[]) ?? []}
            itemLabel={field.itemLabel}
            onAdd={() => addListItem(pageKey, path, "")}
            onChange={(index, v) => setField(pageKey, [...path, index], v)}
            onRemove={(index) => removeListItemAt(pageKey, path, index)}
            onMove={(from, to) => moveListItem(pageKey, path, from, to)}
          />
        </FieldShell>
      );

    case "list":
      return (
        <FieldShell label={field.label}>
          <ListEditor
            pageKey={pageKey}
            path={path}
            items={(value as unknown[]) ?? []}
            itemFields={field.itemFields}
            itemLabel={field.itemLabel}
            addFrom={field.addFrom}
            autoId={field.autoId}
          />
        </FieldShell>
      );

    case "blockList":
      return (
        <FieldShell label={field.label}>
          <BlockListEditor pageKey={pageKey} path={path} blocks={(value as ContentBlock[]) ?? []} />
        </FieldShell>
      );

    default:
      return null;
  }
}
