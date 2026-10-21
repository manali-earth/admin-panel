"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useContentStore } from "@/store/content-store";

/**
 * Always-visible bottom bar, on every screen (editor and preview alike):
 *  - unsaved changes → a clear "Save changes" button (also Ctrl/⌘ + S) and "Discard";
 *  - after a save → a confirmation that fades away;
 *  - a failed save (including "storage limit reached") → a red message that stays until dismissed or fixed.
 */
export function SaveBar() {
  const pathname = usePathname();
  const status = useContentStore((s) => s.saveStatus);
  const error = useContentStore((s) => s.saveError);
  const limitHit = useContentStore((s) => s.storageLimitHit);
  const dirty = useContentStore((s) => s.isDirty());
  const save = useContentStore((s) => s.save);
  const resetAll = useContentStore((s) => s.resetAll);
  const [justSaved, setJustSaved] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [wasSaving, setWasSaving] = useState(false);

  useEffect(() => {
    if (status === "saving") setWasSaving(true);
    if (status === "saved" && wasSaving) {
      setWasSaving(false);
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 6000);
      return () => clearTimeout(t);
    }
    if (status === "error") setWasSaving(false);
  }, [status, wasSaving]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const s = useContentStore.getState();
        if (s.isDirty() && s.saveStatus !== "saving") void s.save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/login") return null;

  const showError = status === "error" && error && error !== dismissedError;

  if (showError) {
    return (
      <div className="savebar savebar-error" role="alert">
        <div className="savebar-text">
          <strong>{limitHit ? "Storage limit reached — your changes were not saved." : "Your changes were not saved."}</strong>
          <span>{error}</span>
        </div>
        <div className="savebar-actions">
          <button type="button" className="savebar-secondary" onClick={() => setDismissedError(error)}>
            Dismiss
          </button>
          <button type="button" className="savebar-primary" onClick={() => void save()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === "saving") {
    return (
      <div className="savebar" role="status">
        <div className="savebar-text">
          <strong>Saving…</strong>
          <span>Uploading your changes. Please keep this tab open.</span>
        </div>
      </div>
    );
  }

  if (dirty) {
    return (
      <div className="savebar savebar-dirty" role="status">
        <div className="savebar-text">
          <strong>You have unsaved changes</strong>
          <span>They are not on the website until you save. Press Ctrl/⌘ + S, or use the button.</span>
        </div>
        <div className="savebar-actions">
          <button
            type="button"
            className="savebar-secondary"
            onClick={() => {
              if (window.confirm("Discard all unsaved changes and go back to the last saved version?")) resetAll();
            }}
          >
            Discard
          </button>
          <button type="button" className="savebar-primary" onClick={() => void save()}>
            Save changes
          </button>
        </div>
      </div>
    );
  }

  if (justSaved) {
    return (
      <div className="savebar savebar-ok" role="status">
        <div className="savebar-text">
          <strong>✓ Saved</strong>
          <span>The website updates automatically in about a minute.</span>
        </div>
        <div className="savebar-actions">
          <button type="button" className="savebar-secondary" onClick={() => setJustSaved(false)}>
            OK
          </button>
        </div>
      </div>
    );
  }
  return null;
}
