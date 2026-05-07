import type { NextConfig } from "next";

/**
 * `basePath` permite hospedar a app sob um subdiretório do domínio
 * institucional (ex.: lushmotel.com.br/diadosnamorados2026). Quando
 * `NEXT_PUBLIC_BASE_PATH` está setado em produção (Vercel env), o
 * Next prefixa automaticamente todas as rotas e assets com esse path.
 *
 * Em dev local (env não setado) a app fica no root, igual antes.
 *
 * O rewrite `/ → /lush/namorados` só é aplicado quando há basePath:
 * em produção, bater na raiz do subdiretório serve a LP direto sem
 * mudar a URL pro caminho dinâmico interno.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  typedRoutes: true,
  async rewrites() {
    if (!basePath) return [];
    return [{ source: "/", destination: "/lush/namorados" }];
  },
};

export default nextConfig;
