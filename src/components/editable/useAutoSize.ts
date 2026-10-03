import { useLayoutEffect, type RefObject } from "react";

/**
 * Grows a textarea to fit all of its text. `minHeight` is the height the read-only
 * view had before the click, so entering edit mode never shrinks the box — and since
 * the textarea is sized to its content, the whole text stays visible while editing.
 */
export function useAutoSize(ref: RefObject<HTMLTextAreaElement | null>, active: boolean, value: string, minHeight: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [ref, active, value, minHeight]);
}
