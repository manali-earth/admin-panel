"use client";

import { useEffect, useRef, useState } from "react";
import { useAutoSize } from "./useAutoSize";

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
 *
 * The edit box is an auto-growing textarea (Enter still commits), so a long value
 * stays fully visible and keeps its height while you edit instead of collapsing
 * into a one-line input.
 */
export function EditableText({ value, onCommit, as = "span", className = "", placeholder }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<HTMLElement>(null);
  const [viewHeight, setViewHeight] = useState(0);
  const Tag = as as React.ElementType;

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useAutoSize(inputRef, editing, draft, viewHeight);

  function startEditing() {
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
        ref={inputRef}
        rows={1}
        className={`editable-input editable-autosize ${className}`}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitAndClose}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
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
      ref={viewRef}
      className={`editable-field ${className}`}
      onClick={startEditing}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && startEditing()}
    >
      {value ? value : <span className="editable-placeholder">{placeholder ?? "Click to edit"}</span>}
      <span className="edit-badge" aria-hidden="true">
        ✎
      </span>
    </Tag>
  );
}
