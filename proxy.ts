import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ── Cache de rotas dinâmicas (sobrevive warm invocations) ─────────────── */
type RouteEntry = { brandId: string; slug: string };
type RouteCache = {
  domainMap: Map<string, RouteEntry>;
  pathMap: Map<string, RouteEntry>;
  ts: number;
};

let routeCache: RouteCache | null = null;
const CACHE_TTL = 60_000;

async function getRouteMap(): Promise<RouteCache> {
  const now = Date.now();
  if (routeCache && now - routeCache.ts < CACHE_TTL) return routeCache;

  try {
    const url = new URL(
      "/rest/v1/campaigns?select=brand_id,slug,custom_domain,base_path&status=eq.published&or=(custom_domain.not.is.null,base_path.not.is.null)",
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
    }>;

    const domainMap = new Map<string, RouteEntry>();
    const pathMap   = new Map<string, RouteEntry>();

    for (const row of rows) {
      if (row.custom_domain) domainMap.set(row.custom_domain, { brandId: row.brand_id, slug: row.slug });
      if (row.base_path)     pathMap.set(row.base_path.replace(/\/$/, ""), { brandId: row.brand_id, slug: row.slug });
    }

    routeCache = { domainMap, pathMap, ts: now };
  } catch {
    // mantém cache anterior ou cria vazio — nunca quebra o middleware
    if (!routeCache) routeCache = { domainMap: new Map(), pathMap: new Map(), ts: now };
    else routeCache = { ...routeCache, ts: now }; // renova TTL p/ evitar flood
  }

  return routeCache;
}

/* ── Proxy principal ────────────────────────────────────────────────────── */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = (request.headers.get("host") ?? "").split(":")[0] ?? "";

  /* 1. Roteamento por domínio/subdiretório (antes do auth check) */
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
    const { domainMap, pathMap } = await getRouteMap();

    // Subdomínio: hostname exato
    if (domainMap.has(hostname)) {
      const { brandId, slug } = domainMap.get(hostname)!;
      const url = request.nextUrl.clone();
      url.pathname = `/${brandId}/${slug}`;
      return NextResponse.rewrite(url);
    }

    // Subdiretório: prefixo de path
    for (const [basePath, entry] of pathMap) {
      if (pathname === basePath || pathname.startsWith(basePath + "/")) {
        const { brandId, slug } = entry;
        const url = request.nextUrl.clone();
        url.pathname = `/${brandId}/${slug}${pathname.slice(basePath.length)}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  /* 2. Auth guard para /admin/* */
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
