"use client";
import { useEffect } from "react";

const SKIP_CLASS = /^(reveal|fade|in|open|is-|editor-|lhg-)|\btailwind\b/;

function getSelectorPath(el: Element, root: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== root && node !== document.body) {
    const bemClass = Array.from(node.classList).find(
      (c) => (c.includes("__") || c.includes("--")) && !SKIP_CLASS.test(c)
    );
    if (bemClass) { parts.unshift(`.${bemClass}`); break; }
    const tag = node.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) { parts.unshift(tag); break; }
    const cls = Array.from(node.classList).find(
      (c) => c.length > 2 && !SKIP_CLASS.test(c)
    );
    parts.unshift(cls ? `.${cls}` : tag);
    node = node.parentElement;
  }
  return parts.join(" ").trim() || el.tagName.toLowerCase();
}

const CAPTURE = [
  "color", "background-color", "font-family", "font-size", "font-weight",
  "line-height", "letter-spacing", "text-transform", "text-decoration",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "border-color", "border-width", "border-style", "border-radius",
  "opacity", "box-shadow", "text-shadow",
];

export function EditorOverlay() {
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      [data-block-type] { outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.1s; cursor: pointer !important; }
      [data-block-type]:hover { outline-color: #A67CFF; }
      [data-block-type]:hover::before {
        content: attr(data-block-type); position: fixed;
        top: 8px; left: 50%; transform: translateX(-50%);
        background: #A67CFF; color: #fff; font: 700 10px/1 monospace;
        padding: 3px 10px; border-radius: 99px; letter-spacing: 0.08em;
        text-transform: uppercase; z-index: 99999; pointer-events: none;
      }
      [data-block-type].editor-selected { outline-color: #2EB87A !important; outline-width: 3px; }
      .picker-active * { cursor: crosshair !important; }
      .picker-active [data-block-type]:hover { outline-color: transparent !important; }
      .picker-active [data-block-type]:hover::before { display: none; }
      #picker-highlight {
        position: fixed; pointer-events: none; z-index: 99998;
        outline: 2px solid #F0A84A; outline-offset: 1px;
        background: rgba(240,168,74,0.1); transition: all 0.05s;
      }
      #picker-label {
        position: fixed; z-index: 99999; pointer-events: none;
        background: #F0A84A; color: #0D0D12;
        font: 700 9px/1 monospace; padding: 2px 8px; border-radius: 0 0 4px 4px;
        letter-spacing: 0.06em; white-space: nowrap;
      }
      #picker-banner {
        position: fixed; top: 0; left: 0; right: 0; z-index: 99999; pointer-events: none;
        background: #F0A84A; color: #0D0D12; text-align: center;
        font: 700 11px/1 monospace; padding: 6px; letter-spacing: 0.06em;
      }
    `;
    document.head.appendChild(styleEl);

    let selected: Element | null = null;
    let pickerActive = false;
    let pickerGlobal = false;  // true = qualquer elemento da página
    let pickerBlockIndex = -1;
    let hlEl: HTMLDivElement | null = null;
    let lblEl: HTMLDivElement | null = null;
    let bannerEl: HTMLDivElement | null = null;

    function createOverlays() {
      hlEl = document.createElement("div"); hlEl.id = "picker-highlight";
      lblEl = document.createElement("div"); lblEl.id = "picker-label";
      document.body.appendChild(hlEl); document.body.appendChild(lblEl);
    }
    function removeOverlays() {
      hlEl?.remove(); hlEl = null; lblEl?.remove(); lblEl = null;
      bannerEl?.remove(); bannerEl = null;
    }
    function positionOverlays(el: Element, label: string) {
      const r = el.getBoundingClientRect();
      if (hlEl) Object.assign(hlEl.style, { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`, display: "block" });
      if (lblEl) Object.assign(lblEl.style, { top: `${r.top}px`, left: `${r.left}px`, display: "block" });
      if (lblEl) lblEl.textContent = label;
    }
    function hideOverlays() {
      if (hlEl) hlEl.style.display = "none";
      if (lblEl) lblEl.style.display = "none";
    }

    /* ── captura computed styles dos elementos do bloco ── */
    function captureBlockElements(root: Element) {
      const results: { selector: string; tagName: string; computedStyles: Record<string, string> }[] = [];
      const seen = new Set<string>();

      function walk(el: Element, depth: number) {
        if (depth > 5 || results.length >= 18) return;
        const tag = el.tagName.toLowerCase();
        const hasBem = Array.from(el.classList).some(
          (c) => (c.includes("__") || c.includes("--")) && !SKIP_CLASS.test(c)
        );
        const isInteresting = hasBem || /^h[1-6]$/.test(tag) || /^(p|a|button|span|em|strong|li|label)$/.test(tag);

        if (isInteresting) {
          const selector = getSelectorPath(el, root);
          if (!seen.has(selector)) {
            seen.add(selector);
            const cs = window.getComputedStyle(el);
            const styles: Record<string, string> = {};
            CAPTURE.forEach((p) => {
              const v = cs.getPropertyValue(p).trim();
              if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "rgba(0, 0, 0, 0)") styles[p] = v;
            });
            if (Object.keys(styles).length >= 2) {
              results.push({ selector, tagName: tag, computedStyles: styles });
            }
          }
        }
        for (const child of Array.from(el.children)) walk(child, depth + 1);
      }

      walk(root, 0);
      return results;
    }

    /* ── normal block hover/click ── */
    function onBlockMouseOver(e: MouseEvent) {
      if (pickerActive) return;
      const el = (e.target as HTMLElement).closest("[data-block-type]");
      if (!el) return;
      window.parent?.postMessage({ type: "block-hover", blockIndex: Number(el.getAttribute("data-block-index")) }, "*");
    }
    const INLINE_TAGS = /^(h[1-6]|p|span|a|em|strong|button|label|li|small|cite|figcaption)$/;

    function onBlockClick(e: MouseEvent) {
      if (pickerActive) return;
      const blockEl = (e.target as HTMLElement).closest("[data-block-type]");
      if (!blockEl) return;
      selected?.classList.remove("editor-selected");
      selected = blockEl; blockEl.classList.add("editor-selected");
      const elements = captureBlockElements(blockEl);
      const blockIndex = Number(blockEl.getAttribute("data-block-index"));

      // Direct click on a text element — send unified message for inline toolbar
      const target = e.target as HTMLElement;
      if (target !== blockEl && INLINE_TAGS.test(target.tagName.toLowerCase())) {
        const selector = getSelectorPath(target, blockEl);
        const cs = window.getComputedStyle(target);
        const styles: Record<string, string> = {};
        CAPTURE.forEach((p) => {
          const v = cs.getPropertyValue(p).trim();
          if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "rgba(0, 0, 0, 0)") styles[p] = v;
        });
        const r = target.getBoundingClientRect();
        window.parent?.postMessage({
          type: "block-and-element-click",
          blockType: blockEl.getAttribute("data-block-type"),
          blockIndex,
          elements,
          blockId: blockEl.getAttribute("data-block-id") ?? "",
          selector,
          tagName: target.tagName.toLowerCase(),
          computedStyles: styles,
          rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
        }, "*");
        return;
      }

      window.parent?.postMessage({
        type: "block-click",
        blockType: blockEl.getAttribute("data-block-type"),
        blockIndex,
        elements,
      }, "*");
    }

    /* ── element picker ── */
    function onPickerMove(e: MouseEvent) {
      if (!pickerActive) return;
      const target = e.target as HTMLElement;

      if (pickerGlobal) {
        const blockEl = target.closest("[data-block-index]") as Element | null;
        if (!blockEl || target === blockEl) { hideOverlays(); return; }
        const label = `${target.tagName.toLowerCase()}  ${getSelectorPath(target, blockEl)}`;
        positionOverlays(target, label);
      } else {
        const root = document.querySelector(`[data-block-index="${pickerBlockIndex}"]`);
        if (!root?.contains(target) || target === root) return;
        positionOverlays(target, `${target.tagName.toLowerCase()}  ${getSelectorPath(target, root)}`);
      }
    }

    function onPickerClick(e: MouseEvent) {
      if (!pickerActive) return;
      e.preventDefault(); e.stopPropagation();
      const target = e.target as HTMLElement;

      let root: Element | null;
      let resolvedBlockIndex: number;

      if (pickerGlobal) {
        const blockEl = target.closest("[data-block-index]") as Element | null;
        if (!blockEl || target === blockEl) { disablePicker(); return; }
        root = blockEl;
        resolvedBlockIndex = Number(blockEl.getAttribute("data-block-index"));
      } else {
        root = document.querySelector(`[data-block-index="${pickerBlockIndex}"]`);
        if (!root?.contains(target) || target === root) { disablePicker(); return; }
        resolvedBlockIndex = pickerBlockIndex;
      }

      const selector = getSelectorPath(target, root);
      const cs = window.getComputedStyle(target);
      const styles: Record<string, string> = {};
      CAPTURE.forEach((p) => {
        const v = cs.getPropertyValue(p).trim();
        if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "rgba(0, 0, 0, 0)") styles[p] = v;
      });
      const r = target.getBoundingClientRect();
      window.parent?.postMessage({
        type: "element-selected",
        blockIndex: resolvedBlockIndex,
        blockId: root.getAttribute("data-block-id") ?? "",
        selector, computedStyles: styles,
        tagName: target.tagName.toLowerCase(),
        rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      }, "*");
      disablePicker();
    }

    function enablePicker(blockIndex: number, global: boolean) {
      pickerActive = true;
      pickerGlobal = global;
      pickerBlockIndex = blockIndex;
      document.body.classList.add("picker-active");
      createOverlays();
      if (global) {
        bannerEl = document.createElement("div");
        bannerEl.id = "picker-banner";
        bannerEl.textContent = "◎  INSPECIONAR — clique em qualquer elemento  •  Esc para cancelar";
        document.body.appendChild(bannerEl);
      }
      document.addEventListener("mousemove", onPickerMove);
      document.addEventListener("click", onPickerClick, true);
      document.addEventListener("keydown", onPickerKey);
    }
    function disablePicker() {
      pickerActive = false; pickerGlobal = false; pickerBlockIndex = -1;
      document.body.classList.remove("picker-active");
      removeOverlays();
      document.removeEventListener("mousemove", onPickerMove);
      document.removeEventListener("click", onPickerClick, true);
      document.removeEventListener("keydown", onPickerKey);
      window.parent?.postMessage({ type: "picker-cancelled" }, "*");
    }
    function onPickerKey(e: KeyboardEvent) {
      if (e.key === "Escape") disablePicker();
    }

    /* ── messages from editor ── */
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "select-block") {
        const el = document.querySelector(`[data-block-index="${e.data.blockIndex}"]`);
        if (!el) return;
        selected?.classList.remove("editor-selected"); selected = el;
        el.classList.add("editor-selected");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const elements = captureBlockElements(el);
        window.parent?.postMessage({ type: "block-computed-styles", blockIndex: e.data.blockIndex, elements }, "*");
      }
      if (e.data?.type === "enable-element-picker") {
        const isGlobal = e.data.blockIndex === -1;
        enablePicker(isGlobal ? -1 : Number(e.data.blockIndex), isGlobal);
      }
      if (e.data?.type === "disable-element-picker") disablePicker();
    }

    document.addEventListener("mouseover", onBlockMouseOver);
    document.addEventListener("click", onBlockClick, true);
    window.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("mouseover", onBlockMouseOver);
      document.removeEventListener("click", onBlockClick, true);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("mousemove", onPickerMove);
      document.removeEventListener("click", onPickerClick, true);
      document.removeEventListener("keydown", onPickerKey);
      removeOverlays();
      document.body.classList.remove("picker-active");
      styleEl.remove();
    };
  }, []);

  return null;
}
