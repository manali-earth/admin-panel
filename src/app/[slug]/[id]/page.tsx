import { notFound } from "next/navigation";
import { cardListField, schemaForSlug } from "@/lib/page-schemas";
import type { PageSlug } from "@/lib/types";
import { ItemPageClient } from "./ItemPageClient";

/**
 * On-demand edit page for one card of a card-style page: /gis-projects/<project id>, /posters/<poster id>.
 * Pages without cards have no such sub-pages, so those URLs 404.
 */
export default async function ItemPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const schema = schemaForSlug(slug as PageSlug);
  if (!schema || !cardListField(schema)) notFound();

  return <ItemPageClient schema={schema} id={decodeURIComponent(id)} />;
}
