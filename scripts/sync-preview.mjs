#!/usr/bin/env node
// Rebuilds the admin panel's live-preview copy of the website from the real
// website repo, so the preview can never drift behind the deployed site.
//
//   pnpm sync:preview                        # downloads the website from GitHub (main branch) — no local clone needed
//   PORTFOLIO_BRANCH=dev pnpm sync:preview   # ...a different branch
//   PORTFOLIO_DIR=/path/to/portfolio pnpm sync:preview   # use a local folder instead (e.g. unpushed changes)
//
// Generated (don't hand-edit — rerun this instead):
//   public/preview-site/**/index.html   <- website page HTML, links rewritten to /preview-site/...
//   public/preview-site/styles.css      <- website styles.css, verbatim (it lives in an isolated iframe)
//   public/preview-site/preview-app.js  <- website app.js, fed by postMessage instead of fetch()
//   public/site/styles.css              <- website styles.css for the admin chrome, with the three
//                                          design tokens that collide with the admin's own renamed
//   public/site/pdf-viewer.js           <- website pdf-viewer.js (draws PDFs in the editor and the preview)
//   public/vendor/pdfjs/                <- website vendor/pdfjs (the PDF.js build pdf-viewer.js uses)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO = process.env.PORTFOLIO_REPO || "https://github.com/manali-earth/portfolio.git";
let siteDir;
let tmpDir = null;
if (process.env.PORTFOLIO_DIR) {
  siteDir = path.resolve(process.env.PORTFOLIO_DIR);
} else {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-sync-"));
  const args = ["clone", "--depth", "1", ...(process.env.PORTFOLIO_BRANCH ? ["--branch", process.env.PORTFOLIO_BRANCH] : []), REPO, tmpDir];
  console.log(`fetching website from ${REPO}${process.env.PORTFOLIO_BRANCH ? ` (${process.env.PORTFOLIO_BRANCH})` : ""} ...`);
  try {
    execFileSync("git", args, { stdio: ["ignore", "ignore", "inherit"] });
  } catch {
    console.error("sync-preview: couldn't clone the website repo. Check your connection / git access, or use PORTFOLIO_DIR=/path/to/portfolio.");
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.exit(1);
  }
  siteDir = tmpDir;
  process.on("exit", () => fs.rmSync(tmpDir, { recursive: true, force: true }));
  console.log("website commit:", execFileSync("git", ["-C", tmpDir, "log", "-1", "--format=%h %s"]).toString().trim());
}
const pub = path.resolve("public");
const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
  console.log("wrote", path.relative(process.cwd(), p));
};
const must = (cond, msg) => {
  if (!cond) {
    console.error("sync-preview: " + msg + " — the website's code changed shape; update scripts/sync-preview.mjs");
    process.exit(1);
  }
};

if (!fs.existsSync(path.join(siteDir, "app.js"))) {
  console.error(`sync-preview: no app.js found in ${siteDir} — is that the website repo?`);
  process.exit(1);
}

// ---- styles
const css = read(path.join(siteDir, "styles.css"));
write(path.join(pub, "preview-site/styles.css"), css);
write(path.join(pub, "site/styles.css"), css.replace(/--(ink|paper|font-body)(?![\w-])/g, "--site-$1"));

// ---- page HTML
const pages = [["", path.join(siteDir, "index.html")]];
for (const d of fs.readdirSync(siteDir, { withFileTypes: true })) {
  const f = path.join(siteDir, d.name, "index.html");
  if (d.isDirectory() && fs.existsSync(f)) pages.push([d.name, f]);
}
// Drop preview pages whose folder no longer exists on the website (e.g. a page that was renamed).
const keep = new Set(pages.map(([folder]) => folder));
const previewRoot = path.join(pub, "preview-site");
if (fs.existsSync(previewRoot)) {
  for (const d of fs.readdirSync(previewRoot, { withFileTypes: true })) {
    if (d.isDirectory() && !keep.has(d.name)) {
      fs.rmSync(path.join(previewRoot, d.name), { recursive: true, force: true });
      console.log("removed stale preview page", d.name);
    }
  }
}
for (const [folder, file] of pages) {
  const html = read(file)
    .replace(/href="\/styles\.css"/g, 'href="/preview-site/styles.css"')
    .replace(/src="\/app\.js"/g, 'src="/preview-site/preview-app.js"')
    .replace(/href="\/(#[^"]*)?"/g, (_, hash = "") => `href="/preview-site/index.html${hash}"`)
    .replace(/href="\/([\w-]+)\/(#[^"]*)?"/g, (_, slug, hash = "") => `href="/preview-site/${slug}/index.html${hash}"`);
  must(html.includes("/preview-site/preview-app.js"), `${folder || "home"} page doesn't load /app.js`);
  write(path.join(pub, "preview-site", folder, "index.html"), html);
}

// ---- PDF viewer + the PDF.js build it loads (same files, same URLs: /vendor/pdfjs/ is root-relative on both sites)
must(fs.existsSync(path.join(siteDir, "pdf-viewer.js")), "no pdf-viewer.js in the website");
write(path.join(pub, "site/pdf-viewer.js"), read(path.join(siteDir, "pdf-viewer.js")));
const vendorDir = path.join(siteDir, "vendor/pdfjs");
must(fs.existsSync(vendorDir), "no vendor/pdfjs in the website");
for (const f of fs.readdirSync(vendorDir)) {
  fs.mkdirSync(path.join(pub, "vendor/pdfjs"), { recursive: true });
  fs.copyFileSync(path.join(vendorDir, f), path.join(pub, "vendor/pdfjs", f));
  console.log("wrote", path.join("public/vendor/pdfjs", f));
}

// ---- app.js -> preview-app.js
let js = read(path.join(siteDir, "app.js"));
const sub = (re, to, what) => {
  must(re.test(js), `couldn't find ${what} in app.js`);
  js = js.replace(re, to);
};
sub(/^function img\(p\).*$/m, "function img(p) { return p || '' } // the admin pre-resolves image paths (incl. blob: URLs for unsaved uploads)\nconst PROJECTS_PAGE_HREF = '/preview-site/projects/index.html'", "img()");
sub(/projectCard\(p, '\/projects\/'\)/, "projectCard(p, PROJECTS_PAGE_HREF)", "the home project-card link");
// The top bar is built by app.js from NAV_ITEMS; inside the preview its links must stay inside the preview.
sub(/^function navHref\(h\).*$/m, "function navHref(h) { return '/preview-site' + h + 'index.html' } // keep nav links inside the preview", "navHref()");
sub(/^const PDF_VIEWER_SRC = .*$/m, "const PDF_VIEWER_SRC = '/site/pdf-viewer.js'", "PDF_VIEWER_SRC");
sub(/^async function load\(\).*$/m, "", "load()");
sub(/^load\(\);?\s*$/m, "", "the load() call");
js =
  "// GENERATED by scripts/sync-preview.mjs from the website's app.js — do not edit by hand.\n" +
  "// Same rendering code as the live site; data arrives via postMessage (the unsaved draft) instead of fetch().\n" +
  js.trimEnd() +
  `

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  const msg = e.data;
  if (!msg || msg.type !== 'PORTFOLIO_PREVIEW_DATA') return;
  document.body.dataset.page = msg.pageKey;
  try {
    if (msg.home) applySiteChrome(msg.home); // site title + footer, as the real site loads from home.json
    render(msg.pageKey, msg.data);
    bind();
  } catch (err) { console.error(err); }
});
`;
write(path.join(pub, "preview-site/preview-app.js"), js);
