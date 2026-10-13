import type { EditableTextTag } from "@/components/editable/EditableText";
import type { PageKey, PageSlug } from "./types";

/**
 * This is the "Data Mapping Layer" from the spec: Website Component -> JSON
 * Source -> Editable Field, expressed declaratively instead of as one-off
 * editor components per page. PageEditor (components/generic/PageEditor.tsx)
 * walks this schema tree to render every page, Home included, reusing the
 * same leaf field components and the same key/path convention throughout.
 *
 * `key` is always the object property name at that level — the store
 * resolves the full path by walking the schema tree alongside the data, so
 * there is never a hand-written "projects[0].title"-style string anywhere;
 * it's built structurally as ["projects", 0, "title"] as the UI recurses.
 */
export type FieldDef =
  | { kind: "text"; key: string; label: string; as?: EditableTextTag }
  | { kind: "textarea"; key: string; label: string }
  | { kind: "image"; key: string; label: string }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "stringList"; key: string; label: string; itemLabel: string }
  | { kind: "group"; key: string; label: string; fields: FieldDef[] }
  | {
      kind: "list";
      key: string;
      label: string;
      itemLabel: string;
      itemFields: FieldDef[];
      addFrom?: PickSource;
      autoId?: boolean;
      /**
       * Show the list as a grid of cards (add / remove / reorder here) and edit each item's
       * `itemFields` on its own on-demand page, /<page-slug>/<item id> — see CardGrid and ItemEditor.
       */
      cards?: CardsConfig;
    }
  /** An ordered, article-style mix of paragraph and image blocks (and PDFs when `allowPdf`) — see BlockListEditor. */
  | { kind: "blockList"; key: string; label: string; allowPdf?: boolean };

/** How an item of a card-style list is summarised on its card (which of its fields to show). */
export interface CardsConfig {
  /** Title given to a freshly added item, e.g. "Untitled project". */
  newItemTitle: string;
  titleKey: string;
  imageKey?: string;
  metaKey?: string;
  summaryKey?: string;
  /** A "select" field whose chosen option's label is shown as a badge on the card. */
  badgeKey?: string;
}

/**
 * Lets a "list" field's "+ Add" action pick an existing item from another
 * page's master list (copied in as an independent, freely-editable copy)
 * instead of appending a blank item. Used by Home's pinned projects /
 * pinned publications so they can only ever reference something that
 * already exists in Projects / Research Publications.
 */
export interface PickSource {
  masterPageKey: Exclude<PageKey, "home">;
  masterPath: string[];
  itemTitle: (masterItem: Record<string, unknown>) => string;
  itemSubtitle?: (masterItem: Record<string, unknown>) => string | undefined;
  toItem: (masterItem: Record<string, unknown>) => Record<string, unknown>;
}

export interface PageSchema {
  key: PageKey;
  slug: PageSlug;
  title: string;
  fields: FieldDef[];
}

/** React `key` for a FieldDef in a list. */
export function fieldReactKey(field: FieldDef): string {
  return field.key;
}

const timelineItemFields: FieldDef[] = [
  { kind: "text", key: "period", label: "Period" },
  { kind: "text", key: "institution", label: "Institution" },
  { kind: "text", key: "role", label: "Role" },
  { kind: "textarea", key: "details", label: "Details" }
];

/**
 * Shared by My Story's sections and each project's detail-page sections —
 * same "Add section" experience in both places. Paragraphs and images are
 * one ordered, article-style sequence — add either at the end, in whatever
 * order you want them to read.
 */
const contentSectionItemFields: FieldDef[] = [
  { kind: "text", key: "heading", label: "Section heading" },
  { kind: "blockList", key: "content", label: "Content" }
];

const publicationItemFields: FieldDef[] = [
  { kind: "text", key: "year", label: "Year" },
  { kind: "text", key: "title", label: "Title" },
  { kind: "text", key: "authors", label: "Authors" },
  { kind: "text", key: "status", label: "Status / venue" },
  { kind: "text", key: "link", label: "Link (optional)" }
];

export const homeSchema: PageSchema = {
  key: "home",
  slug: "home",
  title: "Home",
  fields: [
    {
      kind: "group",
      key: "site",
      label: "Site",
      fields: [
        { kind: "text", key: "title", label: "Site title" },
        { kind: "text", key: "description", label: "Description" }
      ]
    },
    {
      kind: "group",
      key: "person",
      label: "Person",
      fields: [
        { kind: "text", key: "name", label: "Name" },
        { kind: "textarea", key: "intro", label: "Intro" },
        { kind: "text", key: "location", label: "Location" },
        { kind: "text", key: "email", label: "Email" },
        { kind: "text", key: "phone", label: "Phone" },
        {
          kind: "list",
          key: "socials",
          label: "Social links",
          itemLabel: "Social link",
          itemFields: [
            { kind: "text", key: "label", label: "Label" },
            { kind: "text", key: "url", label: "URL" },
            { kind: "text", key: "icon", label: "Icon key" }
          ]
        }
      ]
    },
    { kind: "image", key: "heroImage", label: "Hero image" },
    {
      kind: "list",
      key: "news",
      label: "Recent news",
      itemLabel: "News item",
      itemFields: [
        { kind: "text", key: "date", label: "Date" },
        { kind: "textarea", key: "text", label: "Text" },
        { kind: "text", key: "link", label: "Link (optional)" },
        { kind: "text", key: "label", label: "Link label (optional)" }
      ]
    },
    {
      kind: "list",
      key: "gallery",
      label: "Photo gallery",
      itemLabel: "Photo",
      itemFields: [
        { kind: "image", key: "image", label: "Image" },
        { kind: "text", key: "alt", label: "Alt text" }
      ]
    },
    { kind: "list", key: "education", label: "Education (homepage abbreviated copy)", itemLabel: "Entry", itemFields: timelineItemFields },
    { kind: "list", key: "experience", label: "Experience (homepage abbreviated copy)", itemLabel: "Entry", itemFields: timelineItemFields },
    {
      kind: "list",
      key: "projects",
      label: "Pinned projects (independent copies, picked from Projects)",
      itemLabel: "Pinned project",
      itemFields: [
        { kind: "text", key: "title", label: "Title" },
        { kind: "image", key: "image", label: "Image" },
        { kind: "textarea", key: "description", label: "Short description" },
        { kind: "text", key: "meta", label: "Meta line" }
      ],
      addFrom: {
        masterPageKey: "gisProjects",
        masterPath: ["projects"],
        itemTitle: (p) => String(p.title ?? "Untitled project"),
        itemSubtitle: (p) => (p.meta ? String(p.meta) : undefined),
        toItem: (p) => ({
          id: p.id ?? "",
          title: p.title ?? "",
          image: p.image ?? "",
          description: p.summary ?? "",
          meta: p.meta ?? ""
        })
      }
    },
    {
      kind: "list",
      key: "publications",
      label: "Pinned publications (independent copies, picked from Research Publications)",
      itemLabel: "Pinned publication",
      itemFields: publicationItemFields,
      addFrom: {
        masterPageKey: "researchPublications",
        masterPath: ["publications"],
        itemTitle: (p) => String(p.title ?? "Untitled publication"),
        itemSubtitle: (p) => (p.year ? String(p.year) : undefined),
        toItem: (p) => ({ ...p })
      }
    },
    {
      kind: "group",
      key: "contact",
      label: "Contact",
      fields: [
        { kind: "text", key: "email", label: "Email" },
        { kind: "text", key: "phone", label: "Phone" },
        { kind: "text", key: "location", label: "Location" }
      ]
    }
  ]
};

export const myStorySchema: PageSchema = {
  key: "myStory",
  slug: "my-story",
  title: "My Story",
  fields: [
    { kind: "text", key: "title", label: "Page title" },
    { kind: "text", key: "heading", label: "Heading", as: "h1" },
    { kind: "textarea", key: "intro", label: "Intro" },
    {
      kind: "list",
      key: "sections",
      label: "Sections",
      itemLabel: "Section",
      itemFields: contentSectionItemFields
    }
  ]
};

export const educationExperienceSchema: PageSchema = {
  key: "educationExperience",
  slug: "education-experience",
  title: "Education & Experience",
  fields: [
    { kind: "text", key: "title", label: "Page title" },
    { kind: "text", key: "heading", label: "Heading", as: "h1" },
    { kind: "list", key: "education", label: "Education", itemLabel: "Entry", itemFields: timelineItemFields },
    { kind: "list", key: "experience", label: "Experience", itemLabel: "Entry", itemFields: timelineItemFields },
    {
      kind: "list",
      key: "certificates",
      label: "Certificates (shown below Experience)",
      itemLabel: "Certificate",
      itemFields: [
        { kind: "image", key: "image", label: "Certificate image" },
        { kind: "text", key: "caption", label: "Caption" }
      ]
    }
  ]
};

/** Keep in sync with "categories" in database/projects.json (id + label). */
export const PROJECT_CATEGORIES = [
  { value: "data-analysis-visualization", label: "Data analysis and visualization" },
  { value: "gis-maps", label: "GIS maps" },
  { value: "unocha", label: "UNOCHA project" },
  { value: "public-health", label: "Public Health projects" },
  { value: "academic-field", label: "Academic field projects" },
  { value: "feasibility-study", label: "Feasibility study" },
  { value: "research-projects", label: "Research projects" }
];

export const gisProjectsSchema: PageSchema = {
  key: "gisProjects",
  slug: "gis-projects",
  title: "Projects",
  fields: [
    { kind: "text", key: "title", label: "Page title" },
    { kind: "text", key: "heading", label: "Heading", as: "h1" },
    { kind: "textarea", key: "intro", label: "Intro" },
    {
      kind: "list",
      key: "projects",
      label: "Projects",
      itemLabel: "Project",
      autoId: true,
      cards: { newItemTitle: "Untitled project", titleKey: "title", imageKey: "image", metaKey: "meta", summaryKey: "summary", badgeKey: "category" },
      itemFields: [
        { kind: "select", key: "category", label: "Project page section", options: PROJECT_CATEGORIES },
        { kind: "text", key: "title", label: "Title" },
        { kind: "image", key: "image", label: "Image (optional)" },
        { kind: "text", key: "meta", label: "Meta line" },
        { kind: "textarea", key: "summary", label: "Card summary (shown on project cards)" },
        {
          kind: "list",
          key: "sections",
          label: "Detail page sections",
          itemLabel: "Section",
          itemFields: contentSectionItemFields
        }
      ]
    }
  ]
};

export const researchPublicationsSchema: PageSchema = {
  key: "researchPublications",
  slug: "research-publications",
  title: "Research Publications",
  fields: [
    { kind: "text", key: "title", label: "Page title" },
    { kind: "text", key: "heading", label: "Heading", as: "h1" },
    { kind: "list", key: "publications", label: "Publications", itemLabel: "Publication", itemFields: publicationItemFields, autoId: true }
  ]
};

export const conferencesSchema: PageSchema = {
  key: "conferences",
  slug: "conferences",
  title: "Conferences",
  fields: [
    { kind: "text", key: "title", label: "Page title" },
    { kind: "text", key: "heading", label: "Heading", as: "h1" },
    {
      kind: "list",
      key: "items",
      label: "Conferences",
      itemLabel: "Conference",
      autoId: true,
      itemFields: [
        { kind: "text", key: "title", label: "Title" },
        { kind: "text", key: "date", label: "Date / place" },
        { kind: "textarea", key: "details", label: "Details" }
      ]
    }
  ]
};

/** Posters' detail-page sections: like a project's, but each section can also hold uploaded PDFs. */
const posterSectionItemFields: FieldDef[] = [
  { kind: "text", key: "heading", label: "Section heading" },
  { kind: "blockList", key: "content", label: "Content", allowPdf: true }
];

export const postersSchema: PageSchema = {
  key: "posters",
  slug: "posters",
  title: "Poster & Presentations",
  fields: [
    { kind: "text", key: "title", label: "Page title" },
    { kind: "text", key: "heading", label: "Heading", as: "h1" },
    { kind: "textarea", key: "intro", label: "Intro" },
    {
      kind: "list",
      key: "posters",
      label: "Posters & presentations",
      itemLabel: "Poster",
      autoId: true,
      cards: { newItemTitle: "Untitled poster", titleKey: "title", imageKey: "image", metaKey: "meta", summaryKey: "summary" },
      itemFields: [
        { kind: "text", key: "title", label: "Title" },
        { kind: "text", key: "meta", label: "Event / date line" },
        { kind: "image", key: "image", label: "Card image (optional)" },
        { kind: "textarea", key: "summary", label: "Card summary (shown on the poster's card)" },
        {
          kind: "list",
          key: "sections",
          label: "Detail page sections",
          itemLabel: "Section",
          itemFields: posterSectionItemFields
        }
      ]
    }
  ]
};

/** The six dedicated pages the generic PageEditor drives. Home is handled separately. */
export const dedicatedPageSchemas: Record<Exclude<PageKey, "home">, PageSchema> = {
  myStory: myStorySchema,
  educationExperience: educationExperienceSchema,
  gisProjects: gisProjectsSchema,
  researchPublications: researchPublicationsSchema,
  conferences: conferencesSchema,
  posters: postersSchema
};

export function schemaForSlug(slug: PageSlug): PageSchema | undefined {
  return Object.values(dedicatedPageSchemas).find((s) => s.slug === slug);
}

export function schemaForKey(key: PageKey): PageSchema {
  return key === "home" ? homeSchema : dedicatedPageSchemas[key];
}

/** The list on a page that is shown as cards with per-item edit pages (Projects, Poster & Presentations), if any. */
export function cardListField(schema: PageSchema): Extract<FieldDef, { kind: "list" }> | undefined {
  return schema.fields.find((f): f is Extract<FieldDef, { kind: "list" }> => f.kind === "list" && !!f.cards);
}
