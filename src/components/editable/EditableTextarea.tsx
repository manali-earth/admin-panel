"use client";

import { useEffect, useRef, useState } from "react";
import { useAutoSize } from "./useAutoSize";

interface EditableTextareaProps {
  value: string;
  onCommit: (next: string) => void;
  className?: string;
  placeholder?: string;
}

export function EditableTextarea({ value, onCommit, className = "", placeholder }: EditableTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [viewHeight, setViewHeight] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);
  useAutoSize(ref, editing, draft, viewHeight);

  function startEditing() {
    // Remember how tall the text is displayed, so the edit box starts at least that tall.
    setViewHeight(viewRef.current?.getBoundingClientRect().height ?? 0);
    setEditing(true);
  }

  function commitAndClose() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        className={`editable-input editable-textarea ${className}`}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitAndClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      ref={viewRef}
      className={`editable-field editable-multiline ${className}`}
      onClick={startEditing}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && startEditing()}
    >
      {value ? value : <span className="editable-placeholder">{placeholder ?? "Click to edit"}</span>}
      <span className="edit-badge" aria-hidden="true">
        ✎
      </span>
    </div>
  );
}
