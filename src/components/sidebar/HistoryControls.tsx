"use client";

import { useContentStore } from "@/store/content-store";

export function HistoryControls() {
  const undo = useContentStore((s) => s.undo);
  const redo = useContentStore((s) => s.redo);
  const canUndo = useContentStore((s) => s.canUndo());
  const canRedo = useContentStore((s) => s.canRedo());
  const resetAll = useContentStore((s) => s.resetAll);
  const dirty = useContentStore((s) => s.isDirty());

  return (
    <div className="history-controls">
      <button type="button" disabled={!canUndo} onClick={undo} title="Undo the last change">
        ↶ Undo
      </button>
      <button type="button" disabled={!canRedo} onClick={redo} title="Redo">
        ↷ Redo
      </button>
      <button
        type="button"
        className="danger"
        disabled={!dirty}
        onClick={() => {
          if (window.confirm("Discard all unsaved changes and restore the last saved version?")) resetAll();
        }}
      >
        Discard all
      </button>
    </div>
  );
}
