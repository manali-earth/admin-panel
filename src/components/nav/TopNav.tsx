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
  { href: "/conferences", label: "Conferences" },
  { href: "/leadership", label: "Leadership" }
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
      {NAV_ITEMS.map((item) => (
        <GuardedLink key={item.href} href={item.href}>
          {item.label}
        </GuardedLink>
      ))}
      <button type="button" className="admin-logout-btn" onClick={logout}>
        Log out
      </button>
    </nav>
  );
}
