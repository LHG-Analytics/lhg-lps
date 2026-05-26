import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse(
      "Blob Store não configurado. Conecte um Vercel Blob Store ao projeto no painel da Vercel.",
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const brandId = formData.get("brandId") as string | null;

  if (!file || !brandId) return new NextResponse("Missing file or brandId", { status: 400 });

  const slug = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname = `brands/${brandId}/uploads/${Date.now()}-${slug}`;

  try {
    const blob = await put(pathname, file, { access: "public" });
    return NextResponse.json({ path: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido no upload";
    return new NextResponse(msg, { status: 500 });
  }
}
