import type { PageKey } from "./types";

export const PAGE_FILENAMES: Record<PageKey, string> = {
  home: "home.json",
  myStory: "my-story.json",
  educationExperience: "education-experience.json",
  gisProjects: "projects.json",
  researchPublications: "publications.json",
  conferences: "conferences.json",
  leadership: "leadership.json"
};

/**
 * photos/ subfolder per page — NOT always the same as the page's own slug.
 * gis-projects images live in photos/projects/, and research-publications
 * images live in photos/publications/, matching the real repo's convention.
 */
export const PHOTO_FOLDER: Record<PageKey, string> = {
  home: "home",
  myStory: "my-story",
  educationExperience: "education-experience",
  gisProjects: "projects",
  researchPublications: "publications",
  conferences: "conferences",
  leadership: "leadership"
};
