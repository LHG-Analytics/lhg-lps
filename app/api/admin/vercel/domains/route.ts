import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const TOKEN      = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

function notConfigured() {
  return new NextResponse(
    "Configure VERCEL_TOKEN e VERCEL_PROJECT_ID nas env vars do projeto Vercel.",
    { status: 503 }
  );
}

/** Adiciona domínio personalizado ao projeto Vercel */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!TOKEN || !PROJECT_ID) return notConfigured();

  const { domain } = await request.json() as { domain: string };

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: domain }),
    }
  );

  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.error as Record<string, unknown> | undefined)?.message ?? "Erro na API Vercel";
    return new NextResponse(String(msg), { status: res.status });
  }

  return NextResponse.json(data);
}

/** Remove domínio personalizado do projeto Vercel */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!TOKEN || !PROJECT_ID) return notConfigured();

  const { domain } = await request.json() as { domain: string };

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${encodeURIComponent(domain)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` },
    }
  );

  if (!res.ok) {
    const data = await res.json() as Record<string, unknown>;
    const msg = (data.error as Record<string, unknown> | undefined)?.message ?? "Erro na API Vercel";
    return new NextResponse(String(msg), { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
