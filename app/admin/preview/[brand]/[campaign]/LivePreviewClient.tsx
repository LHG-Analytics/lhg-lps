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
  const [blocks, setBlocks] = useState<Block[]>(() => [...initialBlocks]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "update-blocks" && Array.isArray(e.data.blocks)) {
        setBlocks(e.data.blocks as Block[]);
      }
    }
    window.addEventListener("message", onMessage);
    // Sinaliza ao editor que o iframe está pronto
    window.parent?.postMessage({ type: "preview-ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div style={themeStyle(brand.theme)} data-brand={brand.id}>
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
  );
}
