"use client";

import { useEffect, useRef, useState } from "react";

interface EditableTextareaProps {
  value: string;
  onCommit: (next: string) => void;
  className?: string;
  placeholder?: string;
}

export function EditableTextarea({ value, onCommit, className = "", placeholder }: EditableTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [editing]);

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
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
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
      className={`editable-field editable-multiline ${className}`}
      onClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
    >
      {value ? value : <span className="editable-placeholder">{placeholder ?? "Click to edit"}</span>}
      <span className="edit-badge" aria-hidden="true">
        ✎
      </span>
    </div>
  );
}
