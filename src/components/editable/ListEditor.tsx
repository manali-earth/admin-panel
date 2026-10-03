"use client";

import { useState } from "react";
import type { FieldDef, PickSource } from "@/lib/page-schemas";
import { fieldReactKey } from "@/lib/page-schemas";
import type { PageKey } from "@/lib/types";
import type { FieldPath } from "@/store/content-store";
import { useContentStore } from "@/store/content-store";
import { generateId } from "@/lib/auto-id";
import { FieldRenderer } from "./FieldRenderer";
import { ListPicker } from "./ListPicker";

interface ListEditorProps {
  pageKey: PageKey;
  path: FieldPath;
  items: unknown[];
  itemFields: FieldDef[];
  itemLabel: string;
  addFrom?: PickSource;
  /** Items get an automatically generated unique id (used by ?view= detail links). */
  autoId?: boolean;
}

export function ListEditor({ pageKey, path, items, itemFields, itemLabel, addFrom, autoId }: ListEditorProps) {
  const addListItem = useContentStore((s) => s.addListItem);
  const removeListItemAt = useContentStore((s) => s.removeListItemAt);
  const moveListItem = useContentStore((s) => s.moveListItem);
  const [pickerOpen, setPickerOpen] = useState(false);
  const newItem = () => (autoId ? { id: generateId(itemLabel, items.map((x) => (x as { id?: string })?.id ?? "")) } : {});

  return (
    <div className="list-editor">
      {items.map((_, index) => (
        // Index as key is fine here: identity comes from position in an
        // ordered, reorderable list with no stable external id to rely on.
        // eslint-disable-next-line react/no-array-index-key
        <div className="list-item-card" key={index}>
          <div className="list-item-header">
            <span>
              {itemLabel} {index + 1}
            </span>
            <div className="list-item-actions">
              <button type="button" disabled={index === 0} onClick={() => moveListItem(pageKey, path, index, index - 1)} aria-label="Move up">
                ↑
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => moveListItem(pageKey, path, index, index + 1)}
                aria-label="Move down"
              >
                ↓
              </button>
              <button type="button" className="danger" onClick={() => removeListItemAt(pageKey, path, index)}>
                Delete
              </button>
            </div>
          </div>
          {itemFields.map((f) => (
            <FieldRenderer key={fieldReactKey(f)} pageKey={pageKey} field={f} basePath={[...path, index]} />
          ))}
        </div>
      ))}
      {addFrom ? (
        <button type="button" className="add-item-btn" onClick={() => setPickerOpen(true)}>
          + Add {itemLabel.toLowerCase()} from existing
        </button>
      ) : (
        <button type="button" className="add-item-btn" onClick={() => addListItem(pageKey, path, newItem())}>
          + Add {itemLabel.toLowerCase()}
        </button>
      )}
      {pickerOpen && addFrom && (
        <ListPicker pageKey={pageKey} path={path} itemLabel={itemLabel} source={addFrom} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
