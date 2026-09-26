"use client";

import { EditableTextarea } from "./EditableTextarea";

interface StringListEditorProps {
  values: string[];
  itemLabel: string;
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function StringListEditor({ values, itemLabel, onAdd, onChange, onRemove, onMove }: StringListEditorProps) {
  return (
    <div className="string-list-editor">
      {values.map((v, index) => (
        <div className="string-list-item" key={index}>
          <EditableTextarea value={v} onCommit={(next) => onChange(index, next)} placeholder={itemLabel} />
          <div className="list-item-actions">
            <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move up">
              ↑
            </button>
            <button
              type="button"
              disabled={index === values.length - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label="Move down"
            >
              ↓
            </button>
            <button type="button" className="danger" onClick={() => onRemove(index)}>
              Delete
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="add-item-btn" onClick={onAdd}>
        + Add {itemLabel.toLowerCase()}
      </button>
    </div>
  );
}
