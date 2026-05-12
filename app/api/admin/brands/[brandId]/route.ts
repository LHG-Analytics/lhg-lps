import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

type Params = Promise<{ brandId: string }>;

export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: brand, error } = await supabase
    .from("brands")
    .select("*, units(*)")
    .eq("id", brandId)
    .single();

  if (error || !brand) return new NextResponse("Marca não encontrada", { status: 404 });
  return NextResponse.json(brand);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json() as Record<string, unknown>;
  const allowed = ["name", "domain", "favicon", "logo", "fonts", "theme", "booking", "concierge"];
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(patch).length === 0)
    return new NextResponse("Nenhum campo válido para atualizar", { status: 400 });

  const { error } = await supabase.from("brands").update(patch).eq("id", brandId);
  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
