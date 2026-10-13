"use client";

import Link from "next/link";
import { generateId } from "@/lib/auto-id";
import type { FieldDef } from "@/lib/page-schemas";
import { PAGE_KEY_TO_SLUG, type PageKey } from "@/lib/types";
import { type FieldPath, useContentStore } from "@/store/content-store";

type ListField = Extract<FieldDef, { kind: "list" }>;

interface CardGridProps {
  pageKey: PageKey;
  path: FieldPath;
  items: unknown[];
  field: ListField;
}

/** Card text is site text and may contain HTML (<br>, <b>…); the card shows it as plain text. */
function plain(value: unknown): string {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The list page for Projects and Poster & Presentations: one card per item, with add / remove / reorder
 * here and an "Edit content" button that opens the item's own on-demand edit page (/<page>/<id>),
 * so a long list stays a tidy overview instead of one endless inline form.
 */
export function CardGrid({ pageKey, path, items, field }: CardGridProps) {
  const cards = field.cards;
  const addListItem = useContentStore((s) => s.addListItem);
  const removeListItemAt = useContentStore((s) => s.removeListItemAt);
  const moveListItem = useContentStore((s) => s.moveListItem);
  const imagePreviewUrl = useContentStore((s) => s.imagePreviewUrl);
  const optionLabel = (key: string | undefined, value: unknown) => {
    if (!key || !value) return "";
    const def = field.itemFields.find((f) => f.key === key);
    return def && def.kind === "select" ? (def.options.find((o) => o.value === value)?.label ?? "") : "";
  };
  if (!cards) return null;
  const noun = field.itemLabel.toLowerCase();

  function add() {
    const taken = items.map((x) => (x as { id?: string })?.id ?? "");
    // The title starts empty (the card shows "Untitled …" as a placeholder) so typing a title never has to delete a default.
    addListItem(pageKey, path, { id: generateId(field.itemLabel, taken) });
  }

  function remove(index: number, title: string) {
    if (window.confirm(`Delete ${noun} "${title}"? It disappears from the website once you save (Undo brings it back before that).`)) {
      removeListItemAt(pageKey, path, index);
    }
  }

  return (
    <div className="card-grid">
      {items.map((raw, index) => {
        const item = raw as Record<string, unknown>;
        const id = String(item.id ?? "");
        const title = plain(item[cards.titleKey]) || cards.newItemTitle;
        const meta = plain(cards.metaKey ? item[cards.metaKey] : "");
        const summary = plain(cards.summaryKey ? item[cards.summaryKey] : "");
        const badge = optionLabel(cards.badgeKey, cards.badgeKey ? item[cards.badgeKey] : "");
        const image = cards.imageKey ? imagePreviewUrl(item[cards.imageKey] as string | undefined) : undefined;
        return (
          <article className="card-grid-item" key={id || index}>
            <div className="card-grid-thumb">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- static/staged files, no Next Image optimizer on Cloudflare
                <img src={image} alt="" />
              ) : (
                <div className="card-grid-noimg">{meta || "No image"}</div>
              )}
            </div>
            <div className="card-grid-body">
              {badge && <span className="card-grid-badge">{badge}</span>}
              <h3>{title}</h3>
              {meta && image && <small>{meta}</small>}
              {summary && <p>{summary}</p>}
            </div>
            <div className="card-grid-actions">
              <Link className="card-grid-edit" href={`/${PAGE_KEY_TO_SLUG[pageKey]}/${encodeURIComponent(id)}`}>
                Edit content
              </Link>
              <div className="list-item-actions">
                <button type="button" disabled={index === 0} onClick={() => moveListItem(pageKey, path, index, index - 1)} aria-label="Move earlier" title="Move earlier">
                  ←
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => moveListItem(pageKey, path, index, index + 1)}
                  aria-label="Move later"
                  title="Move later"
                >
                  →
                </button>
                <button type="button" className="danger" onClick={() => remove(index, title)}>
                  Delete
                </button>
              </div>
            </div>
          </article>
        );
      })}
      <button type="button" className="card-grid-add" onClick={add}>
        <span aria-hidden="true">+</span> Add {noun}
      </button>
    </div>
  );
}
