"use client";

import { usePathname } from "next/navigation";
import { useContentStore } from "@/store/content-store";
import { GuardedLink } from "./GuardedLink";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/my-story", label: "My Story" },
  { href: "/education-experience", label: "Education & Experience" },
  { href: "/gis-projects", label: "Projects" },
  { href: "/research-publications", label: "Publications" },
  { href: "/conferences", label: "Seminars & Conferences" },
  { href: "/posters", label: "Poster presentations" },
  { href: "/site-text", label: "Site text" }
];

export function TopNav() {
  const pathname = usePathname();
  const previewMode = useContentStore((s) => s.previewMode);
  if (previewMode || pathname === "/login") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <nav className="admin-topnav">
      <span className="admin-brand">Edit website</span>
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <GuardedLink key={item.href} href={item.href} className={active ? "admin-nav-active" : undefined} aria-current={active ? "page" : undefined}>
            {item.label}
          </GuardedLink>
        );
      })}
      <button type="button" className="admin-logout-btn" onClick={logout}>
        Log out
      </button>
    </nav>
  );
}
