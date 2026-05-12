import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminRole = "admin" | "editor";

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminRole> {
  const { data } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role as AdminRole | null) ?? "editor";
}
