"use client";

import { useEffect, useRef, useState } from "react";

export type EditableTextTag = "span" | "h1" | "h2" | "h3" | "p" | "div";

interface EditableTextProps {
  value: string;
  onCommit: (next: string) => void;
  as?: EditableTextTag;
  className?: string;
  placeholder?: string;
}

/**
 * Click-to-edit rather than contentEditable: predictable cursor/state
 * behavior, and it commits to the store (one history entry) on blur/Enter
 * instead of per keystroke, so undo steps stay meaningful.
 */
export function EditableText({ value, onCommit, as = "span", className = "", placeholder }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const Tag = as as React.ElementType;

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitAndClose() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`editable-input ${className}`}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitAndClose}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <Tag
      className={`editable-field ${className}`}
      onClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && setEditing(true)}
    >
      {value ? value : <span className="editable-placeholder">{placeholder ?? "Click to edit"}</span>}
      <span className="edit-badge" aria-hidden="true">
        ✎
      </span>
    </Tag>
  );
}
