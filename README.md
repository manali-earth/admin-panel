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
| `github` | The real website + database repos, via GitHub's GraphQL API | `GITHUB_TOKEN`, `WEBSITE_REPO`, `DATABASE_REPO` (see `.env.example`) |

`local-data/website/database/database.json` and `local-data/database/*`
mirror the exact split described for the real repos — `database.json`
stays in the website repo; everything else under `database/` (the page
JSON files + `photos/`) belongs in the database repo. When those two
repos exist, set:

```
DATA_PROVIDER=github
GITHUB_TOKEN=...          # fine-grained PAT or GitHub App token
WEBSITE_REPO=owner/name
DATABASE_REPO=owner/name
```

and nothing else in the app changes — `src/lib/data-provider/github.ts`
already implements real reads (Contents API) and a real atomic multi-file
commit (`createCommitOnBranch` over the GraphQL API), matching the
"one commit for JSON + images together" requirement.

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
  render pass to keep in sync.
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

## Known simplifications (first pass)

- Add/edit/delete/reorder for a page's own lists is inline in the content
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
