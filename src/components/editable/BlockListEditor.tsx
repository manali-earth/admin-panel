"use client";

import type { ContentBlock } from "@/lib/types";
import type { PageKey } from "@/lib/types";
import { type FieldPath, useContentStore } from "@/store/content-store";
import { EditableImage } from "./EditableImage";
import { EditableText } from "./EditableText";
import { EditableTextarea } from "./EditableTextarea";

interface BlockListEditorProps {
  pageKey: PageKey;
  path: FieldPath;
  blocks: ContentBlock[];
}

/**
 * One ordered sequence mixing paragraph and image blocks — like an article,
 * not two separate zones. "+ Add paragraph" and "+ Add image" both append to
 * the end of the same array, in whichever order you click them.
 */
export function BlockListEditor({ pageKey, path, blocks }: BlockListEditorProps) {
  const setField = useContentStore((s) => s.setField);
  const addListItem = useContentStore((s) => s.addListItem);
  const removeListItemAt = useContentStore((s) => s.removeListItemAt);
  const moveListItem = useContentStore((s) => s.moveListItem);
  const stageImage = useContentStore((s) => s.stageImage);
  const imagePreviewUrl = useContentStore((s) => s.imagePreviewUrl);

  return (
    <div className="block-list-editor">
      {blocks.map((block, index) => (
        // Index as key: identity comes from position in an ordered, reorderable sequence.
        // eslint-disable-next-line react/no-array-index-key
        <div className="block-item" key={index}>
          <div className="block-item-controls">
            <span className="block-item-type">{block.type === "paragraph" ? "Paragraph" : "Image"}</span>
            <div className="list-item-actions">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveListItem(pageKey, path, index, index - 1)}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === blocks.length - 1}
                onClick={() => moveListItem(pageKey, path, index, index + 1)}
                aria-label="Move down"
              >
                ↓
              </button>
              <button type="button" className="danger" onClick={() => removeListItemAt(pageKey, path, index)}>
                Delete
              </button>
            </div>
          </div>
          {block.type === "paragraph" ? (
            <EditableTextarea value={block.text} onCommit={(v) => setField(pageKey, [...path, index, "text"], v)} placeholder="Paragraph text" />
          ) : (
            <div className="block-image">
              <EditableImage src={imagePreviewUrl(block.image)} onFile={(file) => stageImage(pageKey, [...path, index, "image"], file)} />
              <EditableText
                value={block.alt ?? ""}
                onCommit={(v) => setField(pageKey, [...path, index, "alt"], v)}
                placeholder="Alt text"
                className="block-image-alt"
              />
            </div>
          )}
        </div>
      ))}
      <div className="block-add-row">
        <button type="button" className="add-item-btn" onClick={() => addListItem(pageKey, path, { type: "paragraph", text: "" })}>
          + Add paragraph
        </button>
        <button type="button" className="add-item-btn" onClick={() => addListItem(pageKey, path, { type: "image", image: "", alt: "" })}>
          + Add image
        </button>
      </div>
    </div>
  );
}
