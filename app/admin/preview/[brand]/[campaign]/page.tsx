import { getBrand, getCampaign } from "@/lib/content";
import { LivePreviewClient } from "./LivePreviewClient";
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
    <LivePreviewClient
      brand={brand}
      campaign={campaign}
      initialBlocks={campaign.blocks}
    />
  );
}
