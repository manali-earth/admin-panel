"use client";

import { useEffect } from "react";
import { useContentStore } from "@/store/content-store";

export function UnsavedChangesGuard() {
  const dirty = useContentStore((s) => s.isDirty());

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return null;
}
