"use client";

import { getAtPath } from "@/lib/object-path";
import type { PickSource } from "@/lib/page-schemas";
import type { PageKey } from "@/lib/types";
import { type FieldPath, useContentStore } from "@/store/content-store";

interface ListPickerProps {
  pageKey: PageKey;
  path: FieldPath;
  itemLabel: string;
  source: PickSource;
  onClose: () => void;
}

export function ListPicker({ pageKey, path, itemLabel, source, onClose }: ListPickerProps) {
  const currentItems = useContentStore(
    (s) => (getAtPath(s.draft[pageKey], path) as Array<{ id?: string }> | undefined) ?? []
  );
  const masterItems = useContentStore(
    (s) =>
      (getAtPath(s.draft[source.masterPageKey], source.masterPath) as Array<Record<string, unknown>> | undefined) ?? []
  );
  const addListItem = useContentStore((s) => s.addListItem);
  const removeListItemById = useContentStore((s) => s.removeListItemById);

  const pickedIds = new Set(currentItems.map((i) => i.id));

  function toggle(item: Record<string, unknown>) {
    const id = String(item.id ?? "");
    if (!id) return;
    if (pickedIds.has(id)) {
      removeListItemById(pageKey, path, id);
    } else {
      addListItem(pageKey, path, source.toItem(item));
    }
  }

  return (
    <div className="list-picker-overlay" role="dialog" aria-modal="true">
      <div className="list-picker">
        <header>
          <h3>Add {itemLabel.toLowerCase()}</h3>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="list-picker-hint">
          Pick an existing entry to copy it in here — later edits to the source list won&apos;t change this copy, and
          unchecking an entry removes it from here only.
        </p>
        {masterItems.length === 0 ? (
          <p className="list-picker-empty">Nothing to pick from yet — add one to the source list first.</p>
        ) : (
          <ul className="list-picker-list">
            {masterItems.map((item, idx) => {
              const id = String(item.id ?? idx);
              const subtitle = source.itemSubtitle?.(item);
              return (
                <li key={id}>
                  <label>
                    <input type="checkbox" checked={pickedIds.has(id)} onChange={() => toggle(item)} />
                    {source.itemTitle(item)}
                    {subtitle ? <span className="list-picker-id">({subtitle})</span> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
