import { getBrand, getCampaign } from "@/lib/content";
import { themeStyle } from "@/lib/theme";
import { BlockRenderer } from "@/components/BlockRenderer";
import { RevealManager } from "@/components/RevealManager";
import { Concierge24h } from "@/components/Concierge24h";
import { EditorOverlay } from "./EditorOverlay";
import { notFound } from "next/navigation";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ brand: string; campaign: string }>;
}) {
  const { brand: brandId, campaign: campaignSlug } = await params;

  let brand, campaign;
  try {
    [brand, campaign] = await Promise.all([
      getBrand(brandId),
      getCampaign(brandId, campaignSlug),
    ]);
  } catch {
    notFound();
  }

  return (
    <div style={themeStyle(brand.theme)} data-brand={brand.id}>
      <BlockRenderer
        brand={brand}
        campaign={campaign}
        blocks={campaign.blocks}
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
