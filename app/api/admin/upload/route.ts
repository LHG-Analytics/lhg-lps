import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { put, list } from "@vercel/blob";

/** GET /api/admin/upload — diagnóstico + teste de conexão com o Blob Store (apenas admin) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const token = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  const parts = token.split("_");
  const storeId = parts[3] ?? "(não encontrado)";
  const prefix  = parts.slice(0, 3).join("_") || "(vazio)";

  // Testa conexão real com o store via list()
  let connectionOk = false;
  let connectionError: string | null = null;
  try {
    await list({ limit: 1, token });
    connectionOk = true;
  } catch (err) {
    connectionError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    hasToken: !!token,
    tokenPrefix: prefix,
    storeId,
    tokenLength: token.length,
    connectionOk,
    connectionError,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new NextResponse(
      "Blob Store não configurado. Conecte um Vercel Blob Store ao projeto no painel da Vercel.",
      { status: 503 }
    );
  }

  // Valida formato mínimo do token
  const parts = token.split("_");
  if (parts.length < 5 || parts[0] !== "vercel" || parts[1] !== "blob" || parts[2] !== "rw") {
    return new NextResponse(
      `Token inválido: formato inesperado "${parts.slice(0, 3).join("_")}…" (esperado: vercel_blob_rw_…). Verifique o valor de BLOB_READ_WRITE_TOKEN no painel da Vercel.`,
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
    // Adiciona contexto sobre o storeId para facilitar diagnóstico
    const storeId = token.split("_")[3] ?? "?";
    return new NextResponse(`${msg} (storeId do token: ${storeId})`, { status: 500 });
  }
}
