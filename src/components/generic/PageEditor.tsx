"use client";

import type { FieldDef, PageSchema } from "@/lib/page-schemas";
import { fieldReactKey } from "@/lib/page-schemas";
import { FieldRenderer } from "@/components/editable/FieldRenderer";

function isChrome(f: FieldDef): boolean {
  return f.key === "title" || f.key === "heading";
}

/**
 * Renders one page purely from its PageSchema — this is what makes
 * "reusable editing components instead of custom editors for every field"
 * true in practice: adding a field to a page means editing page-schemas.ts,
 * not writing a new component.
 */
export function PageEditor({ schema }: { schema: PageSchema }) {
  const chrome = schema.fields.filter(isChrome);
  const rest = schema.fields.filter((f) => !isChrome(f));

  return (
    <article className="site-page" data-page={schema.slug}>
      <header className="page-heading page-banner">
        {chrome.map((f) => (
          <FieldRenderer key={fieldReactKey(f)} pageKey={schema.key} field={f} basePath={[]} />
        ))}
      </header>
      <p className="html-hint">
        Text fields accept HTML tags such as <code>&lt;br&gt;</code>, <code>&lt;b&gt;</code>, <code>&lt;i&gt;</code> and{" "}
        <code>&lt;a href=&quot;…&quot;&gt;</code>. They are shown as typed here and rendered on the website and in Preview.
      </p>
      <div className="page-content">
        {rest.map((f) => (
          <FieldRenderer key={fieldReactKey(f)} pageKey={schema.key} field={f} basePath={[]} />
        ))}
      </div>
    </article>
  );
}
