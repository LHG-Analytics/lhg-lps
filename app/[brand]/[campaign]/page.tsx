import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAllCampaigns, getBrand, getCampaign } from "@/lib/content";
import { themeStyle } from "@/lib/theme";
import { BlockRenderer } from "@/components/BlockRenderer";
import { RevealManager } from "@/components/RevealManager";
import { Concierge24h } from "@/components/Concierge24h";
import { AnalyticsScripts, GtmNoscript, type Analytics } from "@/components/AnalyticsScripts";
import { JsonLd } from "@/components/JsonLd";
import { createClient as createSupabasePublic } from "@supabase/supabase-js";
import type { Block } from "@/lib/schema";

const LooseBlockSchema = z.array(
  z.object({ type: z.string(), props: z.record(z.string(), z.unknown()) }).passthrough()
);

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

  const { title, description, ogTitle, ogDescription, ogImage, canonical, robots } = data.campaign.meta;
  const effectiveOgTitle = ogTitle || title;
  const effectiveOgDesc  = ogDescription || description;
  const images = ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: effectiveOgTitle ?? title }] : [];

  // URL canônica vem do campo meta.canonical do JSON/Supabase.
  // Cada campanha declara a URL pública real (ex: lushmotel.com.br/pt-BR/diadosnamorados2026).
  const resolvedCanonical = canonical ?? undefined;

  return {
    title,
    description,
    ...(resolvedCanonical && { alternates: { canonical: resolvedCanonical } }),
    robots: robots === "noindex"
      ? { index: false, follow: false, googleBot: { index: false } }
      : { index: true,  follow: true },
    icons: {
      icon: data.brand.favicon,
      shortcut: data.brand.favicon,
      apple: data.brand.favicon,
    },
    openGraph: {
      title: effectiveOgTitle,
      description: effectiveOgDesc,
      type: "website",
      locale: data.campaign.lang.replace("-", "_"),
      siteName: data.brand.name,
      ...(resolvedCanonical && { url: resolvedCanonical }),
      ...(images.length > 0 && { images }),
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: effectiveOgTitle,
      description: effectiveOgDesc,
      ...(images.length > 0 && { images: [ogImage!] }),
    },
  };
}

export default async function CampaignPage({ params }: { params: Params }) {
  const { brand: brandId, campaign: campaignSlug } = await params;
  const data = await safeLoad(brandId, campaignSlug);
  if (!data) notFound();

  const analytics = data.campaign.meta.analytics as Analytics | undefined;

  // Preload manual do poster do hero — Next.js 15+/16 App Router não gera
  // <link rel="preload"> automaticamente a partir de <Image priority>.
  const heroBlock = data.campaign.blocks.find(
    (b): b is Extract<Block, { type: "hero" }> => b.type === "hero"
  );
  const heroPoster = heroBlock?.props?.poster as string | undefined;

  return (
    <>
      {heroPoster && (
        <link
          rel="preload"
          as="image"
          href={heroPoster}
          fetchPriority="high"
          {...(heroPoster.endsWith(".webp") && { type: "image/webp" })}
        />
      )}
      <div style={themeStyle(data.brand.theme)} data-brand={data.brand.id}>
        {analytics?.gtm && <GtmNoscript id={analytics.gtm} />}
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
        <JsonLd brand={data.brand} campaign={data.campaign} />
        <AnalyticsScripts analytics={analytics} id={`${brandId}-${campaignSlug}`} />
      </div>
    </>
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

      if (row?.blocks) {
        const parsed = LooseBlockSchema.safeParse(row.blocks);
        if (parsed.success && parsed.data.length > 0) {
          campaign = { ...campaign, blocks: parsed.data as Block[] };
        }
      }
      if (row?.meta && typeof row.meta === "object") {
        const incoming = row.meta as { title?: string; description?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; canonical?: string; robots?: "index" | "noindex"; analytics?: Record<string, string> };
        campaign = { ...campaign, meta: { ...campaign.meta, ...incoming } };
      }
    } catch { /* Supabase indisponível → mantém JSON */ }

    return { brand, campaign };
  } catch {
    return null;
  }
}
