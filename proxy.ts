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
type RouteCache = {
  domainMap:    Map<string, RouteEntry>;          // custom_domain         → LP
  pathMap:      Map<string, RouteEntry>;          // base_path             → LP
  campanhasMap: Map<string, RouteEntry>;          // "campanhasHostname:pathSlug" → LP
  brandSlugMap: Map<string, string | null>;       // "brand/slug"          → custom_domain
  ts: number;
};

let routeCache: RouteCache | null = null;
const CACHE_TTL = 60_000;

async function getRouteMap(): Promise<RouteCache> {
  const now = Date.now();
  if (routeCache && now - routeCache.ts < CACHE_TTL) return routeCache;

  try {
    // Busca todas as campanhas publicadas (com ou sem domínio/path/campanhas_domain)
    const url = new URL(
      "/rest/v1/campaigns?select=brand_id,slug,custom_domain,base_path,path_slug,campanhas_domain&status=eq.published",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );
    const res = await fetch(url.toString(), {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Supabase ${res.status}`);

    const rows = (await res.json()) as Array<{
      brand_id: string;
      slug: string;
      custom_domain: string | null;
      base_path: string | null;
      path_slug: string | null;
      campanhas_domain: string | null;
    }>;

    const domainMap    = new Map<string, RouteEntry>();
    const pathMap      = new Map<string, RouteEntry>();
    const campanhasMap = new Map<string, RouteEntry>();
    // "brand/slug" → URL canônica completa para 308 redirect (custom_domain ou campanhas_domain/path_slug)
    const brandSlugMap = new Map<string, string | null>();

    for (const row of rows) {
      const entry: RouteEntry = { brandId: row.brand_id, slug: row.slug };
      if (row.custom_domain)   domainMap.set(row.custom_domain, entry);
      if (row.base_path)       pathMap.set(row.base_path.replace(/\/$/, ""), entry);
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

    routeCache = { domainMap, pathMap, campanhasMap, brandSlugMap, ts: now };
  } catch {
    if (!routeCache) routeCache = { domainMap: new Map(), pathMap: new Map(), campanhasMap: new Map(), brandSlugMap: new Map(), ts: now };
    else routeCache = { ...routeCache, ts: now };
  }

  return routeCache;
}

/* ── Proxy principal ────────────────────────────────────────────────────── */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = (request.headers.get("host") ?? "").split(":")[0] ?? "";

  /* 1. Roteamento por domínio/subdiretório (antes do auth check) */
  const isStaticAsset = /\.[a-zA-Z0-9]{2,5}$/.test(pathname);

  // Arquivos estáticos (vídeos, imagens, fontes, etc.) — skip total: sem routing,
  // sem Supabase call. Range requests do iOS Safari precisam de resposta imediata.
  if (isStaticAsset && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/_next") && !pathname.startsWith("/api") && !isStaticAsset) {
    const { domainMap, pathMap, campanhasMap, brandSlugMap } = await getRouteMap();

    // Subdomínio: hostname exato → rewrite transparente (ex.: diadosnamorados.lushmotel.com.br)
    if (domainMap.has(hostname)) {
      const { brandId, slug } = domainMap.get(hostname)!;
      const url = request.nextUrl.clone();
      url.pathname = `/${brandId}/${slug}`;
      return NextResponse.rewrite(url);
    }

    // campanhas.{marca}.com.br/{path_slug}/* → rewrite transparente
    // Ex.: campanhas.lemonmotel.com.br/diadosnamorados → /lemon/namorados
    if (hostname.startsWith("campanhas.")) {
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
    }

    // Subdiretório: prefixo de path → rewrite transparente
    for (const [basePath, entry] of pathMap) {
      if (pathname === basePath || pathname.startsWith(basePath + "/")) {
        const { brandId, slug } = entry;
        const url = request.nextUrl.clone();
        url.pathname = `/${brandId}/${slug}${pathname.slice(basePath.length)}`;
        return NextResponse.rewrite(url);
      }
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
