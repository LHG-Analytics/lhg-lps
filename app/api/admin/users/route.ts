import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/admin-role";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: true });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data ?? []);
}
