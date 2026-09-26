"use client";

import { useContentStore } from "@/store/content-store";
import { GuardedLink } from "./GuardedLink";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/my-story", label: "My Story" },
  { href: "/education-experience", label: "Education & Experience" },
  { href: "/gis-projects", label: "GIS Projects" },
  { href: "/research-publications", label: "Publications" },
  { href: "/conferences", label: "Conferences" },
  { href: "/leadership", label: "Leadership" }
];

export function TopNav() {
  const previewMode = useContentStore((s) => s.previewMode);
  if (previewMode) return null;

  return (
    <nav className="admin-topnav">
      {NAV_ITEMS.map((item) => (
        <GuardedLink key={item.href} href={item.href}>
          {item.label}
        </GuardedLink>
      ))}
    </nav>
  );
}
