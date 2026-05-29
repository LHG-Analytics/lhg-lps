import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/upload-token
 *
 * Rota de dois papéis usada pelo fluxo de client-upload do @vercel/blob:
 *
 * 1. blob.generate-client-token  — browser pede token temporário.
 *    Auth obrigatório: só admin autenticado recebe token.
 *
 * 2. blob.upload-completed       — Vercel confirma que o upload chegou ao Blob.
 *    Autenticado via assinatura HMAC (verificado internamente por handleUpload).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        return {
          allowedContentTypes: ["image/*", "video/*"],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
        };
      },
      onUploadCompleted: async () => {
        // URL já retornada ao browser pelo SDK — nenhuma ação adicional necessária.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : 400 },
    );
  }
}
