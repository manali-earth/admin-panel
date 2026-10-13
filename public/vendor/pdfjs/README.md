PDF.js (pdfjs-dist 3.11.174, Apache-2.0 — see LICENSE), vendored so the site and the admin preview
never depend on a third-party CDN. Used only by `/pdf-viewer.js`. Upgrade by replacing the two
`.min.js` files with the same files from a newer `pdfjs-dist/build/` (keep them classic scripts).
