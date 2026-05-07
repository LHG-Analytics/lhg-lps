import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllCampaigns, getBrand, getCampaign } from "@/lib/content";
import { themeStyle } from "@/lib/theme";
import { BlockRenderer } from "@/components/BlockRenderer";
import { RevealManager } from "@/components/RevealManager";
import { Concierge24h } from "@/components/Concierge24h";

type Params = Promise<{ brand: string; campaign: string }>;

export async function generateStaticParams() {
  return getAllCampaigns();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { brand, campaign } = await params;
  const data = await safeLoad(brand, campaign);
  if (!data) return {};
  return {
    title: data.campaign.meta.title,
    description: data.campaign.meta.description,
    icons: {
      icon: data.brand.favicon,
      shortcut: data.brand.favicon,
      apple: data.brand.favicon,
    },
  };
}

export default async function CampaignPage({ params }: { params: Params }) {
  const { brand: brandId, campaign: campaignSlug } = await params;
  const data = await safeLoad(brandId, campaignSlug);
  if (!data) notFound();

  return (
    <div style={themeStyle(data.brand.theme)}>
      <BlockRenderer
        brand={data.brand}
        campaign={data.campaign}
        blocks={data.campaign.blocks}
      />
      {data.brand.concierge ? (
        <Concierge24h
          label={data.brand.concierge.label}
          href={data.brand.concierge.href}
        />
      ) : null}
      <RevealManager />
    </div>
  );
}

async function safeLoad(brandId: string, campaignSlug: string) {
  try {
    const [brand, campaign] = await Promise.all([
      getBrand(brandId),
      getCampaign(brandId, campaignSlug),
    ]);
    return { brand, campaign };
  } catch {
    return null;
  }
}
