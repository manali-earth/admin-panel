"use client";

import { ItemShell } from "@/components/generic/ItemShell";
import type { PageSchema } from "@/lib/page-schemas";

export function ItemPageClient({ schema, id }: { schema: PageSchema; id: string }) {
  return <ItemShell schema={schema} id={id} />;
}
