import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("campaigns")
    .select("campaign_data")
    .eq("id", id)
    .single();

  if (error || !data) return new NextResponse("Não encontrado", { status: 404 });
  return NextResponse.json(data.campaign_data ?? {});
}
