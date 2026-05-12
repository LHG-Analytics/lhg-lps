import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CampaignEditor } from "./CampaignEditor";
import { getBrand, getCampaign } from "@/lib/content";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, brand_id, status, blocks, meta, campaign_data, custom_domain, base_path")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  // Usa os blocks do Supabase se já foram editados, senão carrega do JSON
  let initialBlocks = (campaign.blocks ?? []) as { type: string; props: Record<string, unknown> }[];
  let initialTheme: Record<string, string> = {};
  if (initialBlocks.length === 0) {
    try {
      const lp = await getCampaign(campaign.brand_id, campaign.slug);
      initialBlocks = lp.blocks as typeof initialBlocks;
    } catch { /* sem fallback */ }
  }
  try {
    const brand = await getBrand(campaign.brand_id);
    initialTheme = Object.fromEntries(
      Object.entries(brand.theme).map(([k, v]) => [k, String(v)])
    );
  } catch { /* sem fallback */ }

  return (
    <CampaignEditor
      campaignId={campaign.id}
      brandId={campaign.brand_id}
      slug={campaign.slug}
      initialBlocks={initialBlocks}
      initialTheme={initialTheme}
      initialMeta={(campaign.meta ?? {}) as { title?: string; description?: string; analytics?: { ga4?: string; metaPixel?: string; gtm?: string; tiktokPixel?: string } }}
      initialDeploy={{
        mode: campaign.custom_domain ? "subdomain" : campaign.base_path ? "subdirectory" : null,
        domain:   (campaign.custom_domain as string | null) ?? "",
        basePath: (campaign.base_path    as string | null) ?? "",
      }}
      initialLots={((campaign.campaign_data as { lots?: unknown[] } | null)?.lots ?? []) as import("./LotsPanel").Lot[]}
      status={campaign.status}
    />
  );
}
