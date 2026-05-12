import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { list } from "@vercel/blob";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const brandId = request.nextUrl.searchParams.get("brandId");
  const prefix = brandId ? `brands/${brandId}/` : "brands/";

  try {
    const { blobs } = await list({ prefix });
    const items = blobs.map((b) => ({
      url:        b.url,
      pathname:   b.pathname,
      size:       b.size,
      uploadedAt: b.uploadedAt,
    }));
    return NextResponse.json({ items });
  } catch {
    // BLOB_READ_WRITE_TOKEN não configurado ou erro de rede
    return NextResponse.json({ items: [], unavailable: true });
  }
}
