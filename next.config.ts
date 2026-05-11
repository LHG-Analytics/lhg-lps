import type { NextConfig } from "next";

/**
 * Sem basePath — cada LP é uma rota natural do Next.js:
 *   /lush/namorados
 *   /andardecima/namorados
 *   /tout/<campanha>  ← nova campanha = só JSON novo, sem redeploy de config
 *
 * Roteamento por domínio (CloudFront ou subdomínio) é feito em middleware.ts.
 */
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  typedRoutes: true,
};

export default nextConfig;
