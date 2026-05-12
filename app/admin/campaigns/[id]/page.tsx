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
    .select("id, slug, brand_id, status, blocks")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  // Usa os blocks do Supabase se já foram editados, senão carrega do JSON
  let initialBlocks = (campaign.blocks ?? []) as { type: string; props: Record<string, unknown> }[];
  if (initialBlocks.length === 0) {
    try {
      const lp = await getCampaign(campaign.brand_id, campaign.slug);
      initialBlocks = lp.blocks as typeof initialBlocks;
    } catch { /* sem fallback */ }
  }

  return (
    <CampaignEditor
      campaignId={campaign.id}
      brandId={campaign.brand_id}
      slug={campaign.slug}
      initialBlocks={initialBlocks}
      status={campaign.status}
    />
  );
}
