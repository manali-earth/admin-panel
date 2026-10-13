"use client";

import { useRef } from "react";
import { PdfPreview } from "./PdfPreview";

interface EditablePdfProps {
  /** Directly usable URL of the current PDF (a saved path resolved against imageBase, or a staged blob: URL). */
  src?: string;
  onFile: (file: File) => void;
}

const MAX_BYTES = 50 * 1024 * 1024;

export function EditablePdf({ src, onFile }: EditablePdfProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handle(file: File | undefined) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      window.alert("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      window.alert("That PDF is larger than 50 MB. Please compress it first (the site loads it for every visitor).");
      return;
    }
    onFile(file);
  }

  return (
    <div className="editable-pdf">
      {src ? <PdfPreview url={src} /> : <div className="editable-pdf-placeholder">No PDF uploaded yet</div>}
      <div className="editable-pdf-actions">
        <button type="button" className="add-item-btn" onClick={() => inputRef.current?.click()}>
          {src ? "Replace PDF" : "Upload PDF"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
