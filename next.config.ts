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
  // Assets servidos diretamente da Vercel em produção.
  // Evita que proxies externos (Amplify, CloudFront) precisem rotear /_next/*.
  assetPrefix: process.env.NODE_ENV === "production" ? "https://lhg-lps.vercel.app" : undefined,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Vercel Blob Store — URLs geradas pelo upload do CMS
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  typedRoutes: true,
  async headers() {
    return [
      {
        // Garante Accept-Ranges e Content-Type corretos para vídeos MP4
        // iOS Safari exige suporte a Range requests para autoplay funcionar
        source: "/:path*.(mp4|webm)",
        headers: [
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
