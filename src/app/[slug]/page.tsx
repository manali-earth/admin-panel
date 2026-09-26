import { notFound } from "next/navigation";
import { schemaForSlug } from "@/lib/page-schemas";
import type { PageSlug } from "@/lib/types";
import { DedicatedPageClient } from "./DedicatedPageClient";

/**
 * Server Component so an unknown slug gets a real 404 status (notFound()
 * from a fully "use client" page only surfaces after client-side
 * hydration, not on the initial response) — the actual editor UI lives in
 * DedicatedPageClient.
 */
export default async function DedicatedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const schema = schemaForSlug(slug as PageSlug);
  if (!schema) notFound();

  return <DedicatedPageClient schema={schema} />;
}
