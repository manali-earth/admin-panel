"use client";

import { useContentStore } from "@/store/content-store";

const LABELS = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Error saving"
} as const;

export function SaveStatus() {
  const status = useContentStore((s) => s.saveStatus);
  const error = useContentStore((s) => s.saveError);
  const save = useContentStore((s) => s.save);
  const dirty = useContentStore((s) => s.isDirty());

  return (
    <div className={`save-status save-status-${status}`}>
      <span className="save-status-dot" aria-hidden="true" />
      <span>{LABELS[status]}</span>
      <button type="button" className="save-btn" disabled={status === "saving" || !dirty} onClick={() => save()}>
        Save
      </button>
      {status === "error" && error && <span className="save-status-error-text">{error}</span>}
    </div>
  );
}
