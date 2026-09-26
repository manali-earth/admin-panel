"use client";

import { PageShell } from "@/components/generic/PageShell";
import { homeSchema } from "@/lib/page-schemas";

export default function HomePage() {
  return <PageShell schema={homeSchema} />;
}
