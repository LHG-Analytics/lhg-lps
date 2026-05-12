import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

type Params = Promise<{ brandId: string; unitId: string }>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { brandId, unitId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json() as Record<string, unknown>;
  const allowed = ["name", "label", "address", "image", "booking_base_url"];
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(patch).length === 0)
    return new NextResponse("Nenhum campo válido", { status: 400 });

  const { error } = await supabase
    .from("units")
    .update(patch)
    .eq("id", unitId)
    .eq("brand_id", brandId);

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
