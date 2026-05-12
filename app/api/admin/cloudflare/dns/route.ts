import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_BASE  = "https://api.cloudflare.com/client/v4";

function cfHeaders() {
  return { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };
}

/** Detecta o Zone ID do domínio apex via API Cloudflare */
async function findZoneId(hostname: string): Promise<string | null> {
  // Extrai domínio apex respeitando TLDs brasileiros (.com.br, .net.br, etc.)
  const parts = hostname.split(".");
  const brTlds = ["com", "net", "org", "edu", "gov", "mil", "srv", "adv", "arq", "art"];
  let apex: string;
  if (parts.length >= 3 && parts.at(-1) === "br" && brTlds.includes(parts.at(-2) ?? "")) {
    apex = parts.slice(-3).join(".");
  } else {
    apex = parts.slice(-2).join(".");
  }

  const res = await fetch(`${CF_BASE}/zones?name=${apex}&status=active`, { headers: cfHeaders() });
  const data = await res.json() as { result: Array<{ id: string; name: string }> };
  return data.result?.[0]?.id ?? null;
}

/** Cria registro CNAME no Cloudflare (proxied:false — obrigatório para Vercel) */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  if (!CF_TOKEN) {
    return new NextResponse(
      "Configure CLOUDFLARE_API_TOKEN nas env vars do projeto Vercel.",
      { status: 503 }
    );
  }

  const { domain, target } = await request.json() as { domain: string; target: string };

  const zoneId = await findZoneId(domain);
  if (!zoneId) {
    return new NextResponse(
      `Zona não encontrada para "${domain}". Verifique se o domínio está ativo na sua conta Cloudflare.`,
      { status: 404 }
    );
  }

  // Nome do CNAME: tudo antes do domínio apex (ex: "namorados2026" em "namorados2026.lushmotel.com.br")
  const parts = domain.split(".");
  const brTlds = ["com", "net", "org", "edu", "gov", "mil", "srv", "adv", "arq", "art"];
  const apexLength = parts.at(-1) === "br" && brTlds.includes(parts.at(-2) ?? "") ? 3 : 2;
  const cnameName = parts.slice(0, -apexLength).join(".") || "@";

  const res = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({
      type: "CNAME",
      name: cnameName,
      content: target,
      ttl: 1,       // Auto
      proxied: false, // OBRIGATÓRIO — Cloudflare proxy quebra verificação Vercel
    }),
  });

  const data = await res.json() as { success: boolean; result?: { id: string }; errors?: Array<{ message: string }> };

  if (!data.success) {
    const msg = data.errors?.[0]?.message ?? "Erro ao criar registro DNS";
    // Erro "record already exists" não é crítico
    if (msg.toLowerCase().includes("already exists")) {
      return NextResponse.json({ ok: true, alreadyExists: true });
    }
    return new NextResponse(msg, { status: 400 });
  }

  return NextResponse.json({ ok: true, recordId: data.result?.id });
}

/** Remove registro CNAME do Cloudflare */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  if (!CF_TOKEN) return new NextResponse("CLOUDFLARE_API_TOKEN não configurado.", { status: 503 });

  const { domain } = await request.json() as { domain: string };

  const zoneId = await findZoneId(domain);
  if (!zoneId) return new NextResponse("Zona não encontrada.", { status: 404 });

  // Busca o record pelo nome
  const parts = domain.split(".");
  const brTlds = ["com", "net", "org", "edu", "gov", "mil", "srv", "adv", "arq", "art"];
  const apexLength = parts.at(-1) === "br" && brTlds.includes(parts.at(-2) ?? "") ? 3 : 2;
  const cnameName = parts.slice(0, -apexLength).join(".") || "@";

  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/dns_records?type=CNAME&name=${cnameName}`,
    { headers: cfHeaders() }
  );
  const listData = await listRes.json() as { result: Array<{ id: string }> };
  const recordId = listData.result?.[0]?.id;
  if (!recordId) return NextResponse.json({ ok: true, notFound: true });

  await fetch(`${CF_BASE}/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
    headers: cfHeaders(),
  });

  return NextResponse.json({ ok: true });
}
