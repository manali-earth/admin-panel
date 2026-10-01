"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useContentStore } from "@/store/content-store";
import type { DatabaseIndex, PageDataMap, PageKey } from "@/lib/types";

interface DataResponse {
  index: DatabaseIndex;
  pages: PageDataMap;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const setDatabaseIndex = useContentStore((s) => s.setDatabaseIndex);
  const loadPage = useContentStore((s) => s.loadPage);

  useEffect(() => {
    if (pathname === "/login") return;
    let cancelled = false;

    fetch("/api/data")
      .then((res) => {
        if (res.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          throw new Error("Authentication required");
        }
        if (!res.ok) throw new Error(`/api/data failed: ${res.status}`);
        return res.json() as Promise<DataResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setDatabaseIndex(data.index);
        (Object.keys(data.pages) as PageKey[]).forEach((key) => loadPage(key, data.pages[key]));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, loadPage, setDatabaseIndex]);

  if (pathname === "/login") return <>{children}</>;
  if (status === "loading") return <div className="app-loading">Loading content…</div>;
  if (status === "error") return <div className="app-loading">Couldn&apos;t load the database. Check DATA_PROVIDER settings.</div>;
  return <>{children}</>;
}
