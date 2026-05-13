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
    `;
    document.head.appendChild(styleEl);

    let selected: Element | null = null;
    let pickerActive = false;
    let pickerBlockIndex = -1;
    let hlEl: HTMLDivElement | null = null;
    let lblEl: HTMLDivElement | null = null;

    function createOverlays() {
      hlEl = document.createElement("div"); hlEl.id = "picker-highlight";
      lblEl = document.createElement("div"); lblEl.id = "picker-label";
      document.body.appendChild(hlEl); document.body.appendChild(lblEl);
    }
    function removeOverlays() {
      hlEl?.remove(); hlEl = null; lblEl?.remove(); lblEl = null;
    }
    function positionOverlays(el: Element, selector: string) {
      const r = el.getBoundingClientRect();
      if (hlEl) Object.assign(hlEl.style, { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
      if (lblEl) Object.assign(lblEl.style, { top: `${r.top}px`, left: `${r.left}px` });
      if (lblEl) lblEl.textContent = `${el.tagName.toLowerCase()}  ${selector}`;
    }

    /* ── normal block hover/click ── */
    function onBlockMouseOver(e: MouseEvent) {
      if (pickerActive) return;
      const el = (e.target as HTMLElement).closest("[data-block-type]");
      if (!el) return;
      window.parent?.postMessage({ type: "block-hover", blockIndex: Number(el.getAttribute("data-block-index")) }, "*");
    }
    function onBlockClick(e: MouseEvent) {
      if (pickerActive) return;
      const el = (e.target as HTMLElement).closest("[data-block-type]");
      if (!el) return;
      selected?.classList.remove("editor-selected");
      selected = el; el.classList.add("editor-selected");
      window.parent?.postMessage({ type: "block-click", blockType: el.getAttribute("data-block-type"), blockIndex: Number(el.getAttribute("data-block-index")) }, "*");
    }

    /* ── element picker ── */
    function onPickerMove(e: MouseEvent) {
      if (!pickerActive) return;
      const target = e.target as HTMLElement;
      const root = document.querySelector(`[data-block-index="${pickerBlockIndex}"]`);
      if (!root?.contains(target) || target === root) return;
      positionOverlays(target, getSelectorPath(target, root));
    }
    function onPickerClick(e: MouseEvent) {
      if (!pickerActive) return;
      e.preventDefault(); e.stopPropagation();
      const target = e.target as HTMLElement;
      const root = document.querySelector(`[data-block-index="${pickerBlockIndex}"]`);
      if (!root?.contains(target) || target === root) { disablePicker(); return; }
      const selector = getSelectorPath(target, root);
      const cs = window.getComputedStyle(target);
      const styles: Record<string, string> = {};
      CAPTURE.forEach((p) => {
        const v = cs.getPropertyValue(p).trim();
        if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "rgba(0, 0, 0, 0)") styles[p] = v;
      });
      window.parent?.postMessage({
        type: "element-selected",
        blockIndex: pickerBlockIndex,
        blockId: root.getAttribute("data-block-id") ?? "",
        selector, computedStyles: styles,
        tagName: target.tagName.toLowerCase(),
      }, "*");
      disablePicker();
    }
    function enablePicker(blockIndex: number) {
      pickerActive = true; pickerBlockIndex = blockIndex;
      document.body.classList.add("picker-active");
      createOverlays();
      document.addEventListener("mousemove", onPickerMove);
      document.addEventListener("click", onPickerClick, true);
    }
    function disablePicker() {
      pickerActive = false; pickerBlockIndex = -1;
      document.body.classList.remove("picker-active");
      removeOverlays();
      document.removeEventListener("mousemove", onPickerMove);
      document.removeEventListener("click", onPickerClick, true);
      window.parent?.postMessage({ type: "picker-cancelled" }, "*");
    }

    /* ── messages from editor ── */
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "select-block") {
        const el = document.querySelector(`[data-block-index="${e.data.blockIndex}"]`);
        if (!el) return;
        selected?.classList.remove("editor-selected"); selected = el;
        el.classList.add("editor-selected");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (e.data?.type === "enable-element-picker") enablePicker(Number(e.data.blockIndex));
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
      removeOverlays();
      document.body.classList.remove("picker-active");
      styleEl.remove();
    };
  }, []);

  return null;
}
