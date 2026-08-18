import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/* ── Cache de rotas dinâmicas (sobrevive warm invocations) ─────────────── */
type RouteEntry = { brandId: string; slug: string };

/** Rota por subdiretório. `domain` é o domínio da marca dona da campanha —
 * duas marcas podem declarar o mesmo `basePath`, já que vivem em domínios
 * diferentes, então o par (domain, basePath) é o que identifica a LP. */
type PathRoute = { domain: string | null; basePath: string; entry: RouteEntry };

type RouteCache = {
  domainMap:    Map<string, RouteEntry>;          // custom_domain         → LP
  pathRoutes:   PathRoute[];                      // (domain, base_path)   → LP
  brandDomains: string[];                         // domínios de marca conhecidos
  campanhasMap: Map<string, RouteEntry>;          // "campanhasHostname:pathSlug" → LP
  brandSlugMap: Map<string, string | null>;       // "brand/slug"          → custom_domain
  ts: number;
};

const EMPTY_CACHE = (ts: number): RouteCache => ({
  domainMap: new Map(), pathRoutes: [], brandDomains: [],
  campanhasMap: new Map(), brandSlugMap: new Map(), ts,
});

/** Domínio de marca que atende este hostname, ou null (domínio Vercel, localhost).
 * Cobre subdomínios: `promo.lushmotel.com.br` resolve para `lushmotel.com.br`. */
function matchBrandDomain(hostname: string, brandDomains: string[]): string | null {
  return brandDomains.find((d) => hostname === d || hostname.endsWith(`.${d}`)) ?? null;
}

let routeCache: RouteCache | null = null;
const CACHE_TTL = 60_000;

async function getRouteMap(): Promise<RouteCache> {
  const now = Date.now();
  if (routeCache && now - routeCache.ts < CACHE_TTL) return routeCache;

  try {
    const headers = {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    };
    const rest = (path: string) =>
      fetch(new URL(path, process.env.NEXT_PUBLIC_SUPABASE_URL).toString(), { headers, cache: "no-store" });

    // Campanhas publicadas + domínio de cada marca. O domínio é o que desambigua
    // duas marcas que declararam o mesmo base_path.
    const [res, brandsRes] = await Promise.all([
      rest("/rest/v1/campaigns?select=brand_id,slug,custom_domain,base_path,path_slug,campanhas_domain&status=eq.published"),
      rest("/rest/v1/brands?select=id,domain"),
    ]);

    if (!res.ok) throw new Error(`Supabase ${res.status}`);

    const rows = (await res.json()) as Array<{
      brand_id: string;
      slug: string;
      custom_domain: string | null;
      base_path: string | null;
      path_slug: string | null;
      campanhas_domain: string | null;
    }>;

    const brandDomainById = new Map<string, string>();
    if (brandsRes.ok) {
      const brands = (await brandsRes.json()) as Array<{ id: string; domain: string | null }>;
      for (const b of brands) if (b.domain) brandDomainById.set(b.id, b.domain);
    }

    const domainMap    = new Map<string, RouteEntry>();
    const pathRoutes: PathRoute[] = [];
    const campanhasMap = new Map<string, RouteEntry>();
    // "brand/slug" → URL canônica completa para 308 redirect (custom_domain ou campanhas_domain/path_slug)
    const brandSlugMap = new Map<string, string | null>();

    for (const row of rows) {
      const entry: RouteEntry = { brandId: row.brand_id, slug: row.slug };
      if (row.custom_domain)   domainMap.set(row.custom_domain, entry);
      if (row.base_path) {
        pathRoutes.push({
          domain: brandDomainById.get(row.brand_id) ?? null,
          basePath: row.base_path.replace(/\/$/, ""),
          entry,
        });
      }
      // Roteamento campanhas.{marca}.com.br/{path_slug}
      // Chave: "{campanhas_domain}:{path_slug}" (ex.: "campanhas.lemonmotel.com.br:diadosnamorados")
      if (row.campanhas_domain && row.path_slug) {
        campanhasMap.set(`${row.campanhas_domain}:${row.path_slug}`, entry);
      }
      // URL canônica: custom_domain tem prioridade, depois campanhas_domain + path_slug
      const canonicalUrl = row.custom_domain
        ? `https://${row.custom_domain}`
        : row.campanhas_domain && row.path_slug
          ? `https://${row.campanhas_domain}/${row.path_slug}`
          : null;
      brandSlugMap.set(`${row.brand_id}/${row.slug}`, canonicalUrl);
    }

    // Caminho mais específico primeiro: evita que /campanhas/natal capture
    // uma rota /campanhas/natal/promo declarada por outra campanha.
    pathRoutes.sort((a, b) => b.basePath.length - a.basePath.length);

    routeCache = {
      domainMap, pathRoutes, campanhasMap, brandSlugMap,
      brandDomains: [...new Set(brandDomainById.values())],
      ts: now,
    };
  } catch {
    if (!routeCache) routeCache = EMPTY_CACHE(now);
    else routeCache = { ...routeCache, ts: now };
  }

  return routeCache;
}

/* ── Proxy principal ────────────────────────────────────────────────────── */
/** Domínio que o visitante realmente acessou.
 *
 * Amplify/CloudFront sobrescrevem o header `Host` pelo hostname da Vercel —
 * sem isso a Vercel não reconhece o projeto e devolve 404. O domínio original
 * sobrevive em `x-forwarded-host`, e é ele que identifica a marca: usar `Host`
 * aqui faria toda campanha em subdiretório resolver como se estivesse no mesmo
 * domínio, e um único base_path compartilhado serviria a marca errada. */
function effectiveHost(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const raw = forwarded?.split(",")[0]?.trim() || request.headers.get("host") || "";
  return raw.split(":")[0] ?? "";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = effectiveHost(request);

  /* 1. Roteamento por domínio/subdiretório (antes do auth check) */
  const isStaticAsset = /\.[a-zA-Z0-9]{2,5}$/.test(pathname);

  // Arquivos estáticos (vídeos, imagens, fontes, etc.) — skip total: sem routing,
  // sem Supabase call. Range requests do iOS Safari precisam de resposta imediata.
  if (isStaticAsset && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/_next") && !pathname.startsWith("/api") && !isStaticAsset) {
    const { domainMap, pathRoutes, brandDomains, campanhasMap, brandSlugMap } = await getRouteMap();

    // Subdomínio: hostname exato → rewrite transparente (ex.: diadosnamorados.lushmotel.com.br)
    if (domainMap.has(hostname)) {
      const { brandId, slug } = domainMap.get(hostname)!;
      const url = request.nextUrl.clone();
      url.pathname = `/${brandId}/${slug}`;
      return NextResponse.rewrite(url);
    }

    // campanha(s).{marca}.com.br/{path_slug}/* → rewrite transparente
    // Ex.: campanhas.lemonmotel.com.br/diadosnamorados → /lemon/namorados
    //      campanha.altanamotel.com.br/diadosnamorados  → /altana/namorados
    // Não há guard de prefixo: o mapa garante a correspondência exata por hostname completo
    const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
    if (firstSegment) {
      const cKey = `${hostname}:${firstSegment}`;
      if (campanhasMap.has(cKey)) {
        const { brandId, slug } = campanhasMap.get(cKey)!;
        const url = request.nextUrl.clone();
        url.pathname = `/${brandId}/${slug}`;
        return NextResponse.rewrite(url);
      }
    }

    // Subdiretório: prefixo de path → rewrite transparente.
    //
    // Num domínio de marca só respondem as campanhas daquela marca — sem isso,
    // duas marcas com o mesmo base_path se sobrepõem e o domínio de uma serve
    // a LP da outra. Em domínio sem marca (lhg-lps.vercel.app, localhost) o
    // match é aberto, para preview e desenvolvimento continuarem funcionando.
    const hostDomain = matchBrandDomain(hostname, brandDomains);
    for (const route of pathRoutes) {
      const { basePath, entry } = route;
      if (pathname !== basePath && !pathname.startsWith(basePath + "/")) continue;
      if (hostDomain && route.domain !== hostDomain) continue;

      const url = request.nextUrl.clone();
      url.pathname = `/${entry.brandId}/${entry.slug}${pathname.slice(basePath.length)}`;
      const rewritten = NextResponse.rewrite(url);
      // Diagnóstico: qual domínio o proxy enxergou e para onde resolveu.
      // Torna verificável de fora se o Host chegou reescrito pelo CDN.
      rewritten.headers.set("x-lhg-host", hostname);
      rewritten.headers.set("x-lhg-route", `${entry.brandId}/${entry.slug}`);
      return rewritten;
    }

    // 308 redirect: acesso direto pelo domínio Vercel (/brand/slug)
    // se a campanha tem custom_domain, manda para lá permanentemente.
    const pathKey = pathname.replace(/^\//, "").replace(/\/$/, ""); // "brand/slug"
    if (brandSlugMap.has(pathKey)) {
      const customDomain = brandSlugMap.get(pathKey);
      if (customDomain) {
        return NextResponse.redirect(`https://${customDomain}`, { status: 308 });
      }
    }
  }

  /* 2. Rate limiting */
  const ip = getIp(request);
  if (pathname.startsWith("/api/admin")) {
    // 120 req/min por IP nas APIs admin
    if (!rateLimit(`api:${ip}`, 120, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }
  if (pathname.startsWith("/auth/callback")) {
    // 10 tentativas de auth por IP por minuto
    if (!rateLimit(`auth:${ip}`, 10, 60_000)) {
      return NextResponse.redirect(new URL("/admin/login?error=auth", request.url));
    }
  }

  /* 3. Auth guard para /admin/* */
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (pathname === "/admin/login" && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const proxyConfig = {
  matcher: [
    "/admin/:path*",
    // LP routes — exclui assets estáticos e API
    "/((?!_next/static|_next/image|favicon\\.ico|api/).*)",
  ],
};
