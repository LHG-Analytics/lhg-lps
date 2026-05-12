import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CampaignWizard } from "./CampaignWizard";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, domain")
    .order("name");

  return <CampaignWizard brands={brands ?? []} />;
}
