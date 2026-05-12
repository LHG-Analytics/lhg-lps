import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const limit  = Number(request.nextUrl.searchParams.get("limit")  ?? 100);
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
  const entity = request.nextUrl.searchParams.get("entity");
  const action = request.nextUrl.searchParams.get("action");

  let q = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entity) q = q.eq("entity_type", entity);
  if (action) q = q.eq("action", action);

  const { data, count, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
}
