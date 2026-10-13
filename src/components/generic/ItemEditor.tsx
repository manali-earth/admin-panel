"use client";

import Link from "next/link";
import { FieldRenderer } from "@/components/editable/FieldRenderer";
import { cardListField, fieldReactKey, type PageSchema } from "@/lib/page-schemas";
import { PAGE_KEY_TO_SLUG } from "@/lib/types";
import { getAtPath } from "@/lib/object-path";
import { useContentStore } from "@/store/content-store";

/**
 * The on-demand edit page of one card (a project, a poster…): every field of the item, edited the same
 * way it used to be inline on the list page. The list page itself only shows cards.
 */
export function ItemEditor({ schema, id }: { schema: PageSchema; id: string }) {
  const list = cardListField(schema);
  const page = useContentStore((s) => s.draft[schema.key]);
  if (!list || !page) return null;

  const items = (getAtPath(page, [list.key]) as Array<{ id?: string }> | undefined) ?? [];
  const index = items.findIndex((item) => item.id === id);
  const backHref = `/${PAGE_KEY_TO_SLUG[schema.key]}`;
  const noun = list.itemLabel.toLowerCase();
  const pageTitle = (getAtPath(page, ["heading"]) as string | undefined)?.replace(/<[^>]*>/g, "") || schema.title;

  if (index === -1) {
    return (
      <article className="site-page item-page" data-page={schema.slug}>
        <div className="item-page-missing">
          <p>This {noun} doesn&apos;t exist (it may have been deleted, or the page was reloaded before saving).</p>
          <Link href={backHref}>← Back to {pageTitle}</Link>
        </div>
      </article>
    );
  }

  return (
    <article className="site-page item-page" data-page={schema.slug}>
      <header className="item-page-header">
        <Link href={backHref} className="item-page-back">
          ← Back to {pageTitle}
        </Link>
        <span className="item-page-kind">Editing {noun}</span>
      </header>
      <p className="html-hint">
        Text fields accept HTML tags such as <code>&lt;br&gt;</code>, <code>&lt;b&gt;</code>, <code>&lt;i&gt;</code> and{" "}
        <code>&lt;a href=&quot;…&quot;&gt;</code>. Use <strong>Preview site</strong> in the sidebar to see this {noun}&apos;s page as visitors will.
      </p>
      <div className="page-content item-page-content">
        {list.itemFields.map((f) => (
          <FieldRenderer key={fieldReactKey(f)} pageKey={schema.key} field={f} basePath={[list.key, index]} />
        ))}
      </div>
    </article>
  );
}
