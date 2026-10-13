/*
 * PDF viewer for Poster & Presentations pages.
 *
 * window.PortfolioPdf.mount(box) renders the PDF at box.dataset.pdf into <div class="pdf-viewer" data-pdf="...">.
 *
 *  - Page 1 is always shown in full: the box is exactly as tall as the first page at the box's current width,
 *    so there is nothing to scroll for a one-page PDF.
 *  - For longer PDFs the box scrolls on its own (page 1 fills it; the rest follow underneath).
 *  - Pages are drawn lazily and freed again when far off-screen, so long decks stay light.
 *
 * Needs /vendor/pdfjs/ (PDF.js classic build). The same file is copied into the admin panel by
 * `pnpm sync:preview`, so the editor, the preview and the live site always render PDFs identically.
 */
(function () {
    'use strict';

    var BASE = '/vendor/pdfjs/';
    var libPromise = null;
    var docCache = {};

    function loadLib() {
        if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.js'; return Promise.resolve(window.pdfjsLib); }
        if (!libPromise) {
            libPromise = new Promise(function (resolve, reject) {
                var s = document.createElement('script');
                s.src = BASE + 'pdf.min.js';
                s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.js'; resolve(window.pdfjsLib); };
                s.onerror = function () { libPromise = null; reject(new Error('Could not load the PDF viewer')); };
                document.head.appendChild(s);
            });
        }
        return libPromise;
    }

    // One parsed document per URL, shared by every box that shows it (the admin preview re-renders on each edit).
    function getDoc(url) {
        if (!docCache[url]) {
            docCache[url] = loadLib().then(function (lib) {
                // isEvalSupported:false — hardens PDF.js against script injection through crafted fonts.
                return lib.getDocument({ url: url, isEvalSupported: false }).promise;
            });
            docCache[url].catch(function () { delete docCache[url]; });
        }
        return docCache[url];
    }

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

    function fail(box, url) {
        box.className = 'pdf-viewer pdf-failed';
        box.style.height = '';
        box.innerHTML = '<p class="pdf-error">This PDF could not be displayed here. <a href="' + esc(url) + '" target="_blank" rel="noopener">Open it in a new tab</a>.</p>';
    }

    function mount(box) {
        var url = box.dataset.pdf;
        if (!url || box._pdfUrl === url) return;
        box._pdfUrl = url;
        if (box._pdfCleanup) box._pdfCleanup();

        var meta = box._pdfMeta;
        if (meta) meta.remove();
        box._pdfMeta = null;
        box.className = 'pdf-viewer pdf-loading';
        box.style.height = '';
        box.textContent = '';

        getDoc(url).then(function (doc) {
            if (box._pdfUrl !== url) return;
            return Promise.all(Array.from({ length: doc.numPages }, function (_, i) { return doc.getPage(i + 1); })).then(function (pdfPages) {
                if (box._pdfUrl !== url) return;
                build(box, url, pdfPages);
            });
        }).catch(function (err) {
            if (box._pdfUrl !== url) return;
            console.error(err);
            fail(box, url);
        });
    }

    function build(box, url, pdfPages) {
        var n = pdfPages.length;
        var multi = n > 1;
        var sizes = pdfPages.map(function (p) { var v = p.getViewport({ scale: 1 }); return { w: v.width, h: v.height }; });

        box.className = 'pdf-viewer' + (multi ? ' pdf-multi' : '');
        box.textContent = '';
        var els = sizes.map(function (sz) {
            var el = document.createElement('div');
            el.className = 'pdf-page';
            el.style.aspectRatio = sz.w + ' / ' + sz.h;
            box.appendChild(el);
            return el;
        });

        var meta = document.createElement('div');
        meta.className = 'pdf-meta';
        meta.innerHTML = '<span>' + (multi ? n + ' pages \u2014 scroll inside the document to read on' : '1 page') + '</span><a href="' + esc(url) + '" target="_blank" rel="noopener">Open PDF \u2197</a>';
        box.insertAdjacentElement('afterend', meta);
        box._pdfMeta = meta;

        var renderedAt = els.map(function () { return 0; });
        var gen = els.map(function () { return 0; });
        var visible = {};

        function renderPage(i) {
            var el = els[i], width = el.clientWidth;
            if (!width || renderedAt[i] === width) return;
            renderedAt[i] = width;
            var token = ++gen[i];
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var scale = (width / sizes[i].w) * dpr;
            if (sizes[i].w * scale > 3200) scale = 3200 / sizes[i].w; // keep canvases a sane size
            var viewport = pdfPages[i].getViewport({ scale: scale });
            var canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            pdfPages[i].render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () {
                if (token === gen[i]) el.replaceChildren(canvas);
            }, function (err) {
                if (!err || err.name !== 'RenderingCancelledException') console.error(err);
                if (token === gen[i]) renderedAt[i] = 0;
            });
        }

        function release(i) {
            if (i === 0) return;
            gen[i]++;
            renderedAt[i] = 0;
            els[i].replaceChildren();
        }

        // Page 1 decides the window height: the whole first page is visible without scrolling.
        function fit() {
            if (multi) box.style.height = els[0].getBoundingClientRect().height + 'px';
        }

        var io = null;
        if (multi) {
            io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    var i = els.indexOf(e.target);
                    if (e.isIntersecting) { visible[i] = true; renderPage(i); } else { delete visible[i]; release(i); }
                });
            }, { root: box, rootMargin: '400px 0px' });
            els.forEach(function (el) { io.observe(el); });
        }
        renderPage(0);

        var lastWidth = els[0].clientWidth, timer = null;
        var ro = new ResizeObserver(function () {
            fit();
            var w = els[0].clientWidth;
            if (w === lastWidth) return;
            lastWidth = w;
            clearTimeout(timer);
            timer = setTimeout(function () {
                renderedAt = renderedAt.map(function () { return 0; });
                renderPage(0);
                Object.keys(visible).forEach(function (k) { renderPage(+k); });
            }, 150);
        });
        ro.observe(els[0]);
        fit();

        box._pdfCleanup = function () {
            ro.disconnect();
            if (io) io.disconnect();
            clearTimeout(timer);
            box._pdfCleanup = null;
        };
    }

    window.PortfolioPdf = { mount: mount };
})();
