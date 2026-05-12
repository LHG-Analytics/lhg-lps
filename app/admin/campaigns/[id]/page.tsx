import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CampaignEditor } from "./CampaignEditor";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, brand_id, status, campaign_data, blocks")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  const initialJson = JSON.stringify(
    { ...(campaign.campaign_data ?? {}), blocks: campaign.blocks ?? [] },
    null,
    2
  );

  return (
    <CampaignEditor
      campaignId={campaign.id}
      brandId={campaign.brand_id}
      slug={campaign.slug}
      initialJson={initialJson}
      status={campaign.status}
    />
  );
}
