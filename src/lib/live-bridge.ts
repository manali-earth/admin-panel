/**
 * The script injected into the proxied website page (see injectBridge in live-site.ts).
 *
 * It runs BEFORE the website's own scripts and does four things, so that the site's real, unmodified
 * code (app.js) renders the admin's unsaved draft:
 *
 *  1. Answers the site's data requests (database.json, home.json, projects.json, site-text.json …)
 *     with the draft the admin posts in, instead of the saved files.
 *  2. Gives the document its real URL (/projects/?view=x) so the site's path/query logic works.
 *  3. Keeps navigation inside the preview (links, back links, #anchors); mailto:/tel: do nothing.
 *  4. Re-runs the site's own load() whenever the draft changes — a live preview with no page reload.
 *
 * Plain ES5 on purpose: it is shipped as a string.
 */
export function bridgeSource(siteOrigin: string): string {
  return `(function () {
  'use strict';
  var SITE = ${JSON.stringify(siteOrigin)};
  var FRAME = '/api/live/page';
  var ORIGIN = location.origin;
  var state = null, waiters = [], refreshTimer = null, firstRenderDone = false;

  // ---- 2. real URL for the site's own code (absolute, because <base> points at the live site)
  var params = new URLSearchParams(location.search);
  var fauxPath = params.get('path') || '/';
  var wantedHash = params.get('hash') || '';
  try { history.replaceState(null, '', ORIGIN + fauxPath); } catch (e) {}

  function post(msg) { try { parent.postMessage(msg, ORIGIN); } catch (e) {} }

  // ---- 1. data requests
  function ready() {
    if (state) return Promise.resolve();
    return new Promise(function (ok) {
      var done = false;
      function fin() { if (!done) { done = true; ok(); } }
      waiters.push(fin);
      setTimeout(fin, 6000); // opened outside the admin: fall through to the network
    });
  }
  function norm(u) { try { var x = new URL(u, SITE + '/'); x.hash = ''; return x.href; } catch (e) { return null; } }
  function keyFor(url) {
    var href = norm(url); if (!href || !state) return null;
    if (href === SITE + '/database/database.json') return '__index'; // the routing index the site reads first
    var urls = state.urls || {};
    for (var k in urls) if (norm(urls[k]) === href) return k;
    return null;
  }
  function payloadFor(key) {
    if (key === '__index') return state.index;
    if (key === 'siteText') return state.siteText || {};
    return state.pages[key];
  }
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var looksLikeData = /\\.json(\\?|#|$)/i.test(url);
    function passThrough() { return realFetch ? realFetch(input, init) : Promise.reject(new Error('Not available in the preview: ' + url)); }
    if (!looksLikeData) return passThrough();
    return ready().then(function () {
      var key = keyFor(url);
      if (key === null || payloadFor(key) === undefined) return passThrough();
      return new Response(JSON.stringify(payloadFor(key)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
  };

  // ---- messages from the admin
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || e.source !== parent) return;
    var m = e.data;
    if (!m || m.type !== 'PREVIEW_STATE') return;
    var first = !state;
    state = m.state;
    if (state && state.index) state.urls = state.urls || {};
    if (first) { var w = waiters.splice(0); for (var i = 0; i < w.length; i++) w[i](); }
    else scheduleRefresh();
  });

  // ---- 4. live refresh through the site's own load()
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      if (typeof window.load === 'function') {
        Promise.resolve(window.load()).then(afterRender);
      } else {
        post({ type: 'PREVIEW_RELOAD' }); // the site no longer exposes load(): ask the admin for a full reload
      }
    }, 120);
  }
  function afterRender() { /* sections were re-rendered in place */ }

  function scrollToHash() {
    if (!wantedHash) return;
    var el = document.getElementById(wantedHash);
    if (el) el.scrollIntoView();
  }
  window.addEventListener('load', function () { setTimeout(scrollToHash, 400); });

  // ---- 3. navigation stays inside the preview
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^(mailto:|tel:|javascript:)/i.test(href)) { e.preventDefault(); return; }
    if (href.charAt(0) === '#') {
      e.preventDefault();
      var id = decodeURIComponent(href.slice(1));
      var t = id && document.getElementById(id);
      if (t) t.scrollIntoView({ behavior: 'smooth' }); else if (!id) window.scrollTo(0, 0);
      return;
    }
    var u;
    try { u = new URL(href, location.href); } catch (err) { return; }
    if (u.origin === ORIGIN || u.origin === SITE) {
      e.preventDefault();
      var next = FRAME + '?path=' + encodeURIComponent(u.pathname + u.search) + (u.hash ? '&hash=' + encodeURIComponent(u.hash.slice(1)) : '');
      if (u.pathname + u.search === location.pathname + location.search && u.hash) {
        var el = document.getElementById(u.hash.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      location.href = next;
    } else {
      a.target = '_blank'; a.rel = 'noopener noreferrer'; // external links open in a new tab
    }
  }, true);

  post({ type: 'PREVIEW_READY', pathname: fauxPath.split('?')[0] });
})();`;
}
