"use client";
import { useEffect } from "react";

export function EditorOverlay() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      [data-block-type] { outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.1s; cursor: pointer !important; }
      [data-block-type]:hover { outline-color: #A67CFF; }
      [data-block-type]:hover::before {
        content: attr(data-block-type);
        position: fixed;
        top: 8px; left: 50%; transform: translateX(-50%);
        background: #A67CFF; color: #fff;
        font: 700 10px/1 monospace;
        padding: 3px 10px; border-radius: 99px;
        letter-spacing: 0.08em; text-transform: uppercase;
        z-index: 99999; pointer-events: none;
      }
      [data-block-type].editor-selected { outline-color: #2EB87A !important; outline-width: 3px; }
    `;
    document.head.appendChild(style);

    let selected: Element | null = null;

    function onMouseOver(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest("[data-block-type]");
      if (!el) return;
      window.parent?.postMessage({
        type: "block-hover",
        blockType: el.getAttribute("data-block-type"),
        blockIndex: Number(el.getAttribute("data-block-index")),
      }, "*");
    }

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest("[data-block-type]");
      if (!el) return;
      // Não bloqueia o evento — botões e cards internos (UnitPicker, etc.) precisam funcionar
      selected?.classList.remove("editor-selected");
      selected = el;
      el.classList.add("editor-selected");
      window.parent?.postMessage({
        type: "block-click",
        blockType: el.getAttribute("data-block-type"),
        blockIndex: Number(el.getAttribute("data-block-index")),
      }, "*");
    }

    // Listen for select-from-sidebar messages
    function onMessage(e: MessageEvent) {
      if (e.data?.type !== "select-block") return;
      const el = document.querySelector(`[data-block-index="${e.data.blockIndex}"]`);
      if (!el) return;
      selected?.classList.remove("editor-selected");
      selected = el;
      el.classList.add("editor-selected");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("click", onClick, true);
    window.addEventListener("message", onMessage);

    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("message", onMessage);
      style.remove();
    };
  }, []);

  return null;
}
