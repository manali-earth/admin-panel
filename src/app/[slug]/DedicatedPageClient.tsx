"use client";

import { PageShell } from "@/components/generic/PageShell";
import type { PageSchema } from "@/lib/page-schemas";

export function DedicatedPageClient({ schema }: { schema: PageSchema }) {
  return <PageShell schema={schema} />;
}
