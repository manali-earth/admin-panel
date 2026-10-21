# Portfolio Admin Panel

A CMS-style editor for the JSON-driven portfolio site, built so it works
today against a **local copy** of the two future repos and needs **zero
code changes** once the real GitHub repos exist — only environment
variables change.

## Quick start

```bash
corepack enable pnpm   # if pnpm isn't already active
pnpm install
pnpm dev
```

Open http://localhost:3000. You're editing `local-data/` — a stand-in for
the two repos, seeded from the zip you provided (see "The repo swap"
below).

## The repo swap

Every read/write goes through one interface, `DataProvider`
(`src/lib/data-provider/types.ts`), picked by a single env var:

| `DATA_PROVIDER` | Reads/writes | Needs |
|---|---|---|
| `local` (default) | `local-data/` in this repo | nothing |
| `github` | The GitHub database repo via the Contents API; saves use the Git Database API | `DATABASE_REPO`; `GITHUB_TOKEN` is required for saves (see `.env.example`) |

`local-data/website/database/database.json` and `local-data/database/*`
mirror the local fixture layout. The real `manali-earth/database` repo
contains `database.json`, all page JSON files, and `photos/` at its root.
Set:

```
DATA_PROVIDER=github
GITHUB_TOKEN=...          # fine-grained PAT or GitHub App token; needed to save
DATABASE_REPO=owner/name  # contains database.json and the page JSON files
DATABASE_BRANCH=main
DATABASE_INDEX_PATH=database.json
# Optional when database.json is in a separate private website repo:
# WEBSITE_REPO=owner/private-website
# WEBSITE_BRANCH=main
# WEBSITE_INDEX_PATH=database/database.json
```

Public repositories can be loaded without `GITHUB_TOKEN`; the token is
required for saving, or for loading an optional private website index.
`src/lib/data-provider/github.ts` reads files
through the Contents API and performs a real atomic multi-file commit using
Git blobs, a tree, a commit, and a final fast-forward ref update. This keeps
large gallery images out of GraphQL input variables.

In production (Cloudflare Pages/Workers) these are set as Cloudflare
secrets/vars, never committed — see `wrangler.toml` and the GitHub Actions
workflow at `.github/workflows/deploy.yml`.

## Architecture

- **`src/lib/types.ts`** — TypeScript shape of every JSON file, reverse-
  engineered from the real `database/*.json` + `app.js`.
- **`src/lib/page-schemas.ts`** — the data-mapping layer: which field maps
  to which JSON key, and what editor it needs (text / textarea / image /
  list / grouped fields / string list). This is what makes the editor
  reusable instead of hand-built per page — adding a field means editing
  this file, not writing a new component.
- **`src/components/editable/`** — the reusable field components
  (`EditableText`, `EditableTextarea`, `EditableImage`, `ListEditor`,
  `StringListEditor`) plus `FieldRenderer`, which walks a `FieldDef` and
  renders the right one. `FieldRenderer` and `ListEditor` recurse into each
  other for nested lists (e.g. My Story's sections, each containing a list
  of paragraphs).
- **`src/components/generic/PageEditor.tsx`** — renders an entire page from
  its schema. All seven pages (Home included) currently go through this;
  Home's layout can be split into a bespoke hero/gallery/pin-picker
  composition later without touching the underlying field components.
- **`src/store/content-store.ts`** — Zustand store holding original vs.
  draft JSON per page, a global undo/redo history stack, the staged-image
  upload queue, dirty tracking, and save status. Nothing hits the network
  until **Save**.
- **`src/app/api/data/route.ts`** / **`src/app/api/save/route.ts`** — the
  only two server endpoints. `save` is where `GITHUB_TOKEN` gets used —
  it never reaches the browser.

## How specific requirements are implemented

- **Hover-to-edit, inline, live, no refresh** — every editable field is a
  styled span/div that looks like the live site (same `styles.css`); on
  click it becomes an input in place; changes update the Zustand store
  immediately, which is what's on screen — there's no separate "preview"
  render pass to keep in sync. **Preview site** shows the real, deployed website (see
  "Live preview" below).
- **Save button behavior** — building the final JSON, staged-image
  handling, and the single multi-file commit all happen in
  `content-store.ts`'s `save()` action and the `/api/save` route. The
  commit message includes an ISO timestamp automatically.
- **Undo / redo / reset** — a global snapshot stack in the store (`history`
  / `historyIndex`); Reset restores every page to its last-loaded (or
  last-saved) state and clears the upload queue.
- **Unsaved-changes guard** — `GuardedLink` intercepts in-app navigation
  and `UnsavedChangesGuard` covers tab close/refresh.
- **Pin to homepage** — see `src/components/sidebar/PinPicker.tsx`. Since
  `home.json` keeps independent copies of pinned projects/publications
  (confirmed by reading `app.js` — it never cross-references
  `projects.json`/`publications.json` at render time), pinning **copies**
  the item's fields into `home.json`'s own array; the pinned copy is then
  editable independently, and unpinning only removes the homepage copy.
- **Images** — staged uploads preview instantly via `URL.createObjectURL`
  and get included in the same commit as the JSON changes on Save, written
  to `photos/<section>/<generated-filename>` (see `PHOTO_FOLDER` in
  `src/lib/page-filenames.ts` for the section-name mapping — note
  `gisProjects` → `photos/projects/` and `researchPublications` →
  `photos/publications/`, which don't match their own page slugs).

## Live preview (no syncing)

**Preview site** shows the real website, fetched live from `WEBSITE_URL` (default `https://munakhan.pages.dev`), running its own
unmodified code on your unsaved draft. Nothing from the website is copied into this repo, so there is nothing to keep in step:
whatever the site looks like and does today is what the preview shows.

How it works (`src/lib/live-site.ts`, `src/lib/live-bridge.ts`, `src/app/api/live/`):

- `/api/live/page?path=/projects/` fetches the page's HTML from the live site and injects a `<base>` tag (so the site's
  CSS/JS/fonts load straight from it) and a small bridge script ahead of the site's own scripts.
- The bridge answers the site's data requests (`/database/database.json`, `home.json`, `projects.json`, `site-text.json` …)
  with the draft posted in by the admin, so the site's real `app.js` renders unsaved edits. Each edit calls the site's own
  `load()` again — no reload, scroll position kept. Links and `#anchors` stay inside the preview; `mailto:`/`tel:` do nothing.
- The proxied page runs under a Content-Security-Policy whose `connect-src` lists only the website and its data hosts
  (not this app), so the site's scripts cannot call this admin's own `/api` routes. Only paths of `WEBSITE_URL` are ever fetched.
- The editor's own stylesheet is the live site's `styles.css` (three clashing design tokens renamed on the fly) —
  `/api/live/asset/styles.css`.

## Storage limit

The database repo's `photos/` directory has a hard cap, set by `PHOTOS_STORAGE_LIMIT_MB` (default **80**; `wrangler.toml`
`[vars]` / Cloudflare dashboard / `.env.local`). On **Save**, before anything is sent to GitHub, `/api/save` reads the current size
of `photos/` from the Git trees API and works out what it would be after the save (new files added, replaced and deleted files
subtracted). If that is over the limit the save is refused (HTTP 413) and the editor shows
"Storage limit reached — failed to save"; nothing is pushed and the draft is kept, so you can remove photos and save again.
The sidebar shows a usage meter. If the folder cannot be measured the save is refused too (it fails closed).
Only page JSON files and `photos/…` can be written through `/api/save`, and the commit message is always neutral
(`Update content — <timestamp>`).

The cap measures the current `photos/` directory. Git history keeps older versions of replaced/deleted files, so
repository size can still grow over time even while the folder stays under the cap.

## Site text

**Site text** (top menu) lists every fixed piece of wording on the website — menu labels, section headings, link and button captions,
footer links — read from the live site (`data-text="…"` attributes in its HTML and `window.SITE_TEXT_DEFAULTS` in its `app.js`).
An empty box keeps the website's own wording; typing replaces it. Overrides are saved as `site-text.json` in the database repo and
shown in Preview. Page content itself (stories, projects, news …) is edited on each page.

## Projects page sections

The groups the Projects page is divided into (`categories` in `projects.json`) are editable on the Projects page: add, rename, reorder
or remove sections, then pick a section for each project. A project whose section was removed shows under "More projects" on the site.
Each project's own detail-page sections (heading + text/photos) are added from its **Edit content** page.

## Card pages: Projects and Poster presentations

These two pages show a grid of cards (add, delete, reorder with ← →). **Edit content** on a card opens that item's own page at `/<page>/<item id>` (e.g. `/gis-projects/project-1`, `/posters/poster-ab12cd34`), where all of its fields are edited. A page opts in with `cards: {...}` on its list field in `src/lib/page-schemas.ts`. In Poster presentations a section's content can also be a PDF (`allowPdf` on the `blockList` field): the PDF is staged and committed with Save like an image, and previewed with the same viewer the website uses (the live site's own `pdf-viewer.js`, fetched on request via `/api/live/asset/pdf-viewer.js`, plus the vendored PDF.js build in `public/vendor/pdfjs/`).

Education & Experience has a Certificates list (image + caption).

## Known simplifications (first pass)

- Add/edit/delete/reorder for most pages' lists is inline in the content
  (matching the "feels like editing a document" requirement) rather than a
  separate sidebar list — the sidebar is reserved for save/undo/redo/reset
  and the cross-page pin pickers, which don't fit naturally inline.
- Home currently renders through the same generic `PageEditor` as every
  other page rather than a bespoke hero/gallery-carousel layout — every
  field is editable and correct, just not laid out identically to the
  live hero section yet.
- Undo/redo covers JSON field edits; undoing past an image upload doesn't
  un-stage that file (it stays queued until Save or Reset).
- No authentication yet, by design — see the original spec for what to
  layer on later (auth, roles, multiple admins, draft/approval workflow).

## Deploying

```bash
pnpm cf:build      # opennextjs-cloudflare build
pnpm cf:preview    # test the Worker build locally
pnpm cf:deploy      # or let the GitHub Actions workflow do this on push to main
```

`@opennextjs/cloudflare` is the current recommended Next.js-on-Cloudflare
adapter; check https://opennext.js.org/cloudflare before deploying in case
its CLI has moved on since this was written.

## Keeping this repository private

This repository must be **private**, and nothing in the website or database repositories may mention it — visitors should believe
the only way to update the site is by editing the database repo by hand. The admin only needs: read access to the website
repo (for `database/database.json`), read + write access to the database repo (fine-grained token, Contents), and the live
website's public address. No website or database file, README or commit message refers to it (commits made through `/api/save` read
"Update content — <timestamp>").
