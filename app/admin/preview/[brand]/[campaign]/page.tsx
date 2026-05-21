import { getBrand, getCampaign } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { LivePreviewClient } from "./LivePreviewClient";
import { notFound } from "next/navigation";
import type { Campaign } from "@/lib/schema";

type CmsFont = { display?: string; body?: string } | null;

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ brand: string; campaign: string }>;
}) {
  const { brand: brandId, campaign: campaignSlug } = await params;

  const brand = await getBrand(brandId).catch(() => null);
  if (!brand) notFound();

  const supabase = await createClient();

  // Campanhas publicadas vivem no JSON; duplicatas/rascunhos só no Supabase
  let campaign: Campaign;
  try {
    campaign = await getCampaign(brandId, campaignSlug);
  } catch {
    const { data } = await supabase
      .from("campaigns")
      .select("slug, lang, meta, campaign_data, blocks")
      .eq("brand_id", brandId)
      .eq("slug", campaignSlug)
      .single();

    if (!data) notFound();

    const cd = (data.campaign_data ?? {}) as Record<string, unknown>;
    const m  = (data.meta          ?? {}) as Record<string, unknown>;

    campaign = {
      slug:  data.slug,
      brand: brandId,
      lang:  (data.lang as string | null) ?? "pt-BR",
      meta: {
        title:       (m.title       as string | undefined) ?? "",
        description: (m.description as string | undefined) ?? "",
        analytics:   (m.analytics   as Campaign["meta"]["analytics"] | undefined) ?? {},
      },
      campaign: {
        name:      (cd.name      as string  | undefined) ?? "",
        range:     (cd.range     as Campaign["campaign"]["range"]    | undefined) ?? { from: "", to: "" },
        countdown: (cd.countdown as Campaign["campaign"]["countdown"]| undefined) ?? { target: "" },
        lots:      (cd.lots      as Campaign["campaign"]["lots"]     | undefined) ?? [],
        periods:   (cd.periods   as Campaign["campaign"]["periods"]  | undefined) ?? [],
        dates:     (cd.dates     as Campaign["campaign"]["dates"]    | undefined) ?? [],
      },
      blocks: (data.blocks as Campaign["blocks"] | null) ?? [],
    } as Campaign;
  }

  // Fontes configuradas no CMS (autenticado — sem restrição de RLS)
  let cmsFont: CmsFont = null;
  const { data: brandRow } = await supabase
    .from("brands")
    .select("fonts")
    .eq("id", brandId)
    .maybeSingle();
  if (brandRow?.fonts && typeof brandRow.fonts === "object") {
    const f = brandRow.fonts as Record<string, unknown>;
    const d = typeof f.display === "string" ? f.display : undefined;
    const b = typeof f.body    === "string" ? f.body    : undefined;
    if (d ?? b) cmsFont = { display: d, body: b };
  }

  return (
    <LivePreviewClient
      brand={brand}
      campaign={campaign}
      initialBlocks={campaign.blocks}
      cmsFont={cmsFont}
    />
  );
}
