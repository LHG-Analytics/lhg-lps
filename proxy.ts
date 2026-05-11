import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type RouteEntry = {
  brand: string;
  campaign: string;
  /** Prefixo de path que o CloudFront encaminha (ex: "/pt-BR/diadosnamorados2026").
   *  Removido antes de reescrever para a rota interna. */
  strip?: string;
};

/**
 * Mapeamento domínio → brand/campaign interno.
 *
 * Cobre dois cenários sem alterar o código da LP:
 *
 * 1. CloudFront (Softo): domínio da marca aponta para a Vercel e o Host
 *    header é preservado. O proxy detecta o host e reescreve
 *    /pt-BR/<slug>/* → /<brand>/<campaign>/* internamente.
 *
 * 2. Subdomínio direto (fallback sem CloudFront): lps.<marca>.com.br
 *    com CNAME para a Vercel. Sem `strip`, a rota /namorados já chega
 *    limpa e o proxy só faz o rewrite brand/campaign.
 *
 * Para adicionar nova campanha: criar JSON em content/ e incluir as
 * entradas do domínio aqui — nenhum outro código muda.
 */
const ROUTES: Record<string, RouteEntry> = {
  // ── Lush ──────────────────────────────────────────────────────────────────
  "lushmotel.com.br":         { brand: "lush", campaign: "namorados", strip: "/pt-BR/diadosnamorados2026" },
  "www.lushmotel.com.br":     { brand: "lush", campaign: "namorados", strip: "/pt-BR/diadosnamorados2026" },
  "lps.lushmotel.com.br":     { brand: "lush", campaign: "namorados" },

  // ── Andar de Cima ─────────────────────────────────────────────────────────
  "andardecimasuites.com.br":     { brand: "andardecima", campaign: "namorados", strip: "/pt-BR/namorados2026" },
  "www.andardecimasuites.com.br": { brand: "andardecima", campaign: "namorados", strip: "/pt-BR/namorados2026" },
  "lps.andardecimasuites.com.br": { brand: "andardecima", campaign: "namorados" },
};

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0] ?? "";
  const pathname = request.nextUrl.pathname;

  const entry = ROUTES[host];
  if (!entry) return NextResponse.next();

  const internalBase = `/${entry.brand}/${entry.campaign}`;

  // Já na rota interna — evita loop de rewrite
  if (pathname.startsWith(internalBase)) return NextResponse.next();

  // Remove prefixo do CloudFront se necessário
  const stripped =
    entry.strip && pathname.startsWith(entry.strip)
      ? pathname.slice(entry.strip.length) || "/"
      : pathname;

  const url = request.nextUrl.clone();
  url.pathname =
    stripped === "/" ? internalBase : `${internalBase}${stripped}`;

  return NextResponse.rewrite(url);
}

export const proxyConfig = {
  // Exclui arquivos estáticos do Next e assets de marca
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|brands/).*)"],
};
