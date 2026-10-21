"use client";

import { formatMB } from "@/lib/storage-limit";
import { useContentStore } from "@/store/content-store";

const LABELS = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save"
} as const;

export function SaveStatus() {
  const status = useContentStore((s) => s.saveStatus);
  const error = useContentStore((s) => s.saveError);
  const save = useContentStore((s) => s.save);
  const dirty = useContentStore((s) => s.isDirty());
  const limitHit = useContentStore((s) => s.storageLimitHit);
  const storage = useContentStore((s) => s.storage);
  const pct = storage ? Math.min(100, Math.round((storage.usedBytes / storage.limitBytes) * 100)) : 0;

  return (
    <div className={`save-status save-status-${status}`}>
      <span className="save-status-dot" aria-hidden="true" />
      <span>{LABELS[status]}</span>
      <button type="button" className="save-btn" disabled={status === "saving" || !dirty} onClick={() => save()}>
        Save changes
      </button>
      {status === "error" && error && (
        <span className="save-status-error-text">
          {limitHit ? "Storage limit reached — see the message at the bottom of the screen." : "See the message at the bottom of the screen."}
        </span>
      )}
      {storage && (
        <div className={`storage-meter${pct >= 90 ? " storage-meter-high" : ""}`} title="Size of the photos folder against its maximum">
          <div className="storage-meter-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="storage-meter-text">
            Photos storage: {formatMB(storage.usedBytes)} of {formatMB(storage.limitBytes)}
          </span>
        </div>
      )}
    </div>
  );
}
