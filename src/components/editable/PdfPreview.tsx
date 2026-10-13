"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    PortfolioPdf?: { mount: (box: HTMLElement) => void };
  }
}

// The viewer script is the website's own /pdf-viewer.js, copied here by `pnpm sync:preview`,
// so the editor shows a PDF exactly the way the live site will.
const VIEWER_SRC = "/site/pdf-viewer.js";
let viewerPromise: Promise<void> | null = null;

function loadViewer(): Promise<void> {
  if (window.PortfolioPdf) return Promise.resolve();
  if (!viewerPromise) {
    viewerPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = VIEWER_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        viewerPromise = null;
        reject(new Error("Could not load the PDF viewer"));
      };
      document.head.appendChild(script);
    });
  }
  return viewerPromise;
}

/**
 * Shows a PDF the way the website does: the first page in full (the window is exactly one page tall),
 * the remaining pages scrollable inside it. The viewer owns its DOM, so the box is created imperatively
 * and React never re-renders inside it.
 */
export function PdfPreview({ url }: { url: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const box = document.createElement("div");
    box.className = "pdf-viewer pdf-loading";
    box.dataset.pdf = url;
    host.appendChild(box);
    loadViewer()
      .then(() => {
        if (!cancelled) window.PortfolioPdf?.mount(box);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
      host.textContent = "";
    };
  }, [url]);

  return <div ref={hostRef} className="pdf-preview" />;
}
