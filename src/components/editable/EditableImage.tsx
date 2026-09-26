"use client";

import { useEffect, useRef, useState } from "react";

interface EditableImageProps {
  src?: string;
  alt?: string;
  onFile: (file: File) => void;
  className?: string;
  placeholderLabel?: string;
}

const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

export function EditableImage({ src, alt, onFile, className = "", placeholderLabel = "Click to add image" }: EditableImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);

  // Reset zoom every time the lightbox is (re)opened, so it always starts fit-to-screen.
  useEffect(() => {
    if (!lightboxOpen) {
      setZoom(1);
      setNaturalWidth(null);
    }
  }, [lightboxOpen]);

  const zoomIndex = ZOOM_STEPS.indexOf(zoom);
  const zoomIn = () => setZoom(ZOOM_STEPS[Math.min(zoomIndex + 1, ZOOM_STEPS.length - 1)] ?? zoom);
  const zoomOut = () => setZoom(ZOOM_STEPS[Math.max(zoomIndex - 1, 0)] ?? zoom);

  return (
    <>
      <div
        className={`editable-image ${className}`}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- static/staged files, no Next Image optimizer on Cloudflare
          <img src={src} alt={alt ?? ""} />
        ) : (
          <div className="editable-image-placeholder">{placeholderLabel}</div>
        )}
        {src && (
          <button
            type="button"
            className="image-view-full-btn"
            aria-label="View full size"
            title="View full size"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            ⤢
          </button>
        )}
        <span className="edit-badge" aria-hidden="true">
          ✎
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {lightboxOpen && src && (
        <div className="image-lightbox-overlay" role="dialog" aria-modal="true" onClick={() => setLightboxOpen(false)}>
          <div className="image-lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={zoomOut} disabled={zoomIndex <= 0} aria-label="Zoom out">
              −
            </button>
            <span className="image-lightbox-zoom-label">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={zoomIn} disabled={zoomIndex >= ZOOM_STEPS.length - 1} aria-label="Zoom in">
              +
            </button>
          </div>
          <button
            type="button"
            className="image-lightbox-close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
          >
            ✕
          </button>
          {/* Scrollable so a zoomed-in image (rendered at real pixel width below) can be panned by scrolling. */}
          <div className="image-lightbox-viewport" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- lightbox shows the same static/staged file at full/zoomed size */}
            <img
              src={src}
              alt={alt ?? ""}
              className="image-lightbox-img"
              onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth)}
              onClick={() => (zoom === 1 ? zoomIn() : setZoom(1))}
              style={
                zoom !== 1 && naturalWidth
                  ? { width: `${naturalWidth * zoom}px`, maxWidth: "none", maxHeight: "none", cursor: "zoom-out" }
                  : { cursor: "zoom-in" }
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
