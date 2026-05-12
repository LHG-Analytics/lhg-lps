import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllCampaigns, getBrand, getCampaign } from "@/lib/content";
import { themeStyle } from "@/lib/theme";
import { BlockRenderer } from "@/components/BlockRenderer";
import { RevealManager } from "@/components/RevealManager";
import { Concierge24h } from "@/components/Concierge24h";
import { createClient as createSupabasePublic } from "@supabase/supabase-js";

// Revalida a cada 60 s — após publicar no CMS, a LP reflete em até 1 minuto
export const revalidate = 60;

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
    <div style={themeStyle(data.brand.theme)} data-brand={data.brand.id}>
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
    const [brand, campaignFromFile] = await Promise.all([
      getBrand(brandId),
      getCampaign(brandId, campaignSlug),
    ]);

    // Tenta sobrescrever com dados publicados do CMS (Supabase anon key + RLS)
    let campaign = campaignFromFile;
    try {
      const supabase = createSupabasePublic(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: row } = await supabase
        .from("campaigns")
        .select("blocks, meta")
        .eq("brand_id", brandId)
        .eq("slug", campaignSlug)
        .eq("status", "published")
        .maybeSingle();

      if (row?.blocks && Array.isArray(row.blocks) && row.blocks.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        campaign = { ...campaign, blocks: row.blocks as any };
      }
      if (row?.meta) {
        campaign = {
          ...campaign,
          meta: { ...campaign.meta, ...row.meta as { title?: string; description?: string } },
        };
      }
    } catch { /* Supabase indisponível → mantém JSON */ }

    return { brand, campaign };
  } catch {
    return null;
  }
}
