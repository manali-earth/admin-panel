"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useContentStore } from "@/store/content-store";

export function GuardedLink({ href, children, ...rest }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const dirty = useContentStore((s) => s.isDirty());

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    e.preventDefault();
    if (window.confirm("You have unsaved changes. Leave this page without saving?")) {
      router.push(href.toString());
    }
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
