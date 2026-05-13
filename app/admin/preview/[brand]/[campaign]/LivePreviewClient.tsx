"use client";
import { useState, useEffect } from "react";
import { BlockRenderer } from "@/components/BlockRenderer";
import { RevealManager } from "@/components/RevealManager";
import { Concierge24h } from "@/components/Concierge24h";
import { EditorOverlay } from "./EditorOverlay";
import { themeStyle } from "@/lib/theme";
import type { Brand, Campaign, Block } from "@/lib/schema";

interface Props {
  brand: Brand;
  campaign: Campaign;
  initialBlocks: readonly Block[];
}

export function LivePreviewClient({ brand, campaign, initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initialBlocks.map((b, i) => ({
      ...b,
      _id: (b as { _id?: string })._id ?? `blk-${b.type}-${i}`,
    }))
  );
  const [themeOverride, setThemeOverride] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "update-blocks" && Array.isArray(e.data.blocks)) {
        setBlocks(e.data.blocks as Block[]);
      }
      if (e.data?.type === "update-theme" && e.data.theme) {
        setThemeOverride(e.data.theme as Record<string, string>);
      }
    }
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: "preview-ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // React sobrescreve className no re-render, removendo .in adicionado pelo RevealManager.
  // No preview/editor, forçamos .in em TODOS os elementos após qualquer atualização de blocks
  // para garantir que o conteúdo sempre apareça — inclusive elementos abaixo do fold que já
  // foram revelados e estão com io.unobserve (não seriam re-observados pelo IntersectionObserver).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(".fade-up, .reveal").forEach((el) => {
        el.classList.add("in");
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [blocks]);

  // Mescla o tema original com overrides do editor e passa pelo mapeamento correto de CSS vars
  const effectiveTheme = themeOverride ? { ...brand.theme, ...(themeOverride as any) } : brand.theme;
  const mergedStyle = themeStyle(effectiveTheme);

  return (
    <>
    {/* Scrollbar invisível como em dispositivo real */}
    <style>{`
      ::-webkit-scrollbar { display: none; }
      html { scrollbar-width: none; -ms-overflow-style: none; }
    `}</style>
    <div style={mergedStyle} data-brand={brand.id}>
      <BlockRenderer
        brand={brand}
        campaign={{ ...campaign, blocks }}
        blocks={blocks}
        editorMode={true}
      />
      {brand.concierge && (
        <Concierge24h label={brand.concierge.label} href={brand.concierge.href} />
      )}
      <RevealManager />
      <EditorOverlay />
    </div>
    </>
  );
}
