/**
 * Field-level types for every JSON file in the database repo.
 *
 * These mirror exactly what app.js on the live site reads — see
 * page-schemas.ts for the declarative "which field lives at which JSON
 * path, and what kind of editor it needs" layer built on top of these.
 */

export interface DatabaseIndex {
  imageBase: string;
  home: string;
  myStory: string;
  educationExperience: string;
  gisProjects: string;
  researchPublications: string;
  conferences: string;
  leadership: string;
}

/** The seven page-data keys, in database.json / dbKey form. */
export type PageKey =
  | "home"
  | "myStory"
  | "educationExperience"
  | "gisProjects"
  | "researchPublications"
  | "conferences"
  | "leadership";

/** The site's own kebab-case slugs (HTML data-page / URL folder names). */
export type PageSlug =
  | "home"
  | "my-story"
  | "education-experience"
  | "gis-projects"
  | "research-publications"
  | "conferences"
  | "leadership";

export const SLUG_TO_PAGE_KEY: Record<PageSlug, PageKey> = {
  home: "home",
  "my-story": "myStory",
  "education-experience": "educationExperience",
  "gis-projects": "gisProjects",
  "research-publications": "researchPublications",
  conferences: "conferences",
  leadership: "leadership"
};

export const PAGE_KEY_TO_SLUG: Record<PageKey, PageSlug> = {
  home: "home",
  myStory: "my-story",
  educationExperience: "education-experience",
  gisProjects: "gis-projects",
  researchPublications: "research-publications",
  conferences: "conferences",
  leadership: "leadership"
};

/**
 * The real deployed site's URL folder per page — NOT the same as PageSlug
 * for two pages: the "gis-projects" / "research-publications" data-page
 * identifiers live at the folders /projects/ and /publications/. Home is "".
 * Used to build correct links inside the live-preview iframe.
 */
export const PAGE_KEY_TO_SITE_FOLDER: Record<PageKey, string> = {
  home: "",
  myStory: "my-story",
  educationExperience: "education-experience",
  gisProjects: "projects",
  researchPublications: "publications",
  conferences: "conferences",
  leadership: "leadership"
};

export interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

export interface NewsItem {
  date: string;
  text: string;
  link?: string;
  label?: string;
}

export interface GalleryImage {
  image: string;
  alt?: string;
}

export interface TimelineEntry {
  period: string;
  institution: string;
  role: string;
  details?: string;
}

/** Shape used by home.json's own (independent, curated) projects array. */
export interface HomeProjectTeaser {
  id: string;
  title: string;
  image?: string;
  description?: string;
  meta?: string;
}

/** Shape used by projects.json's full list. */
export interface ProjectItem {
  id: string;
  title: string;
  image?: string;
  meta?: string;
  /** Short blurb shown on project cards (home + the GIS Projects listing). */
  summary?: string;
  /** Full on-demand detail-page body — same shape as My Story's sections. */
  sections?: ContentSection[];
}

export interface PublicationItem {
  id: string;
  year: string;
  title: string;
  authors: string;
  status?: string;
  link?: string;
}

export interface ConferenceItem {
  id: string;
  title: string;
  date: string;
  details?: string;
}

export interface LeadershipItem {
  id: string;
  title: string;
  date: string;
  details?: string;
}

/** One piece of a section's body, in the order it should appear — an article-style mix of text and photos. */
export type ContentBlock = { type: "paragraph"; text: string } | { type: "image"; image: string; alt?: string };

/** A repeatable content block used by both My Story and Project detail pages. */
export interface ContentSection {
  heading?: string;
  content: ContentBlock[];
}

export interface HomeData {
  page: "home";
  site: { title: string; description?: string };
  person: {
    name: string;
    intro?: string;
    location?: string;
    email?: string;
    phone?: string;
    socials: SocialLink[];
  };
  heroImage?: string;
  news: NewsItem[];
  gallery: GalleryImage[];
  education: TimelineEntry[];
  experience: TimelineEntry[];
  projects: HomeProjectTeaser[];
  publications: PublicationItem[];
  contact: { email: string; phone?: string; location?: string };
}

export interface MyStoryData {
  page: "my-story";
  title: string;
  heading: string;
  intro?: string;
  sections: ContentSection[];
}

export interface EducationExperienceData {
  page: "education-experience";
  title: string;
  heading: string;
  education: TimelineEntry[];
  experience: TimelineEntry[];
}

export interface ProjectsData {
  page: "gis-projects";
  title: string;
  heading: string;
  intro?: string;
  projects: ProjectItem[];
}

export interface PublicationsData {
  page: "research-publications";
  title: string;
  heading: string;
  publications: PublicationItem[];
}

export interface ConferencesData {
  page: "conferences";
  title: string;
  heading: string;
  items: ConferenceItem[];
}

export interface LeadershipData {
  page: "leadership";
  title: string;
  heading: string;
  intro?: string;
  items: LeadershipItem[];
}

export type PageDataMap = {
  home: HomeData;
  myStory: MyStoryData;
  educationExperience: EducationExperienceData;
  gisProjects: ProjectsData;
  researchPublications: PublicationsData;
  conferences: ConferencesData;
  leadership: LeadershipData;
};

export type AnyPageData = PageDataMap[PageKey];
