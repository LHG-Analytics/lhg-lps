import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandWizard } from "./BrandWizard";

export default async function NewBrandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return <BrandWizard />;
}
