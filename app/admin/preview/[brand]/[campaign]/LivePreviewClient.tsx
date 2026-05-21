"use client";
import { useState, useEffect } from "react";
import { BlockRenderer } from "@/components/BlockRenderer";
import { RevealManager } from "@/components/RevealManager";
import { Concierge24h } from "@/components/Concierge24h";
import { EditorOverlay } from "./EditorOverlay";
import { themeStyle } from "@/lib/theme";
import { resolveFontData, fontVars, type BrandFonts } from "@/lib/fonts";
import type { Brand, Campaign, Block } from "@/lib/schema";

interface Props {
  brand: Brand;
  campaign: Campaign;
  initialBlocks: readonly Block[];
  cmsFont?: BrandFonts | null;
}

export function LivePreviewClient({ brand, campaign, initialBlocks, cmsFont }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initialBlocks.map((b, i) => ({
      ...b,
      _id: (b as { _id?: string })._id ?? `blk-${b.type}-${i}`,
    }))
  );
  const [themeOverride, setThemeOverride] = useState<Record<string, string> | null>(null);

  // Resolve fontes: CMS override → JSON brand.fonts
  const { googleFontsUrl, fontFaceCSS, displayFont, bodyFont } = resolveFontData(
    cmsFont ?? null,
    { display: brand.fonts.serif.family, body: brand.fonts.sans.family }
  );

  useEffect(() => {
    // Google Fonts
    if (googleFontsUrl) {
      if (!document.getElementById("brand-gf-preconnect-gapis")) {
        const pc1 = document.createElement("link");
        pc1.id = "brand-gf-preconnect-gapis"; pc1.rel = "preconnect";
        pc1.href = "https://fonts.googleapis.com";
        document.head.appendChild(pc1);
      }
      if (!document.getElementById("brand-gf-preconnect-gstatic")) {
        const pc2 = document.createElement("link");
        pc2.id = "brand-gf-preconnect-gstatic"; pc2.rel = "preconnect";
        pc2.href = "https://fonts.gstatic.com"; pc2.crossOrigin = "";
        document.head.appendChild(pc2);
      }
      const existing = document.getElementById("brand-google-fonts") as HTMLLinkElement | null;
      if (existing) { existing.href = googleFontsUrl; }
      else {
        const link = document.createElement("link");
        link.id = "brand-google-fonts"; link.rel = "stylesheet"; link.href = googleFontsUrl;
        document.head.appendChild(link);
      }
    }
    // @font-face para fontes customizadas
    const styleId = "brand-custom-font-face";
    document.getElementById(styleId)?.remove();
    if (fontFaceCSS) {
      const style = document.createElement("style");
      style.id = styleId; style.textContent = fontFaceCSS;
      document.head.appendChild(style);
    }
  }, [googleFontsUrl, fontFaceCSS]);

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
  const mergedStyle = {
    ...themeStyle(effectiveTheme),
    ...fontVars(displayFont, bodyFont),
  };

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
