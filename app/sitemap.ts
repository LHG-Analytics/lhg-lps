import type { MetadataRoute } from "next";
import { getAllCampaigns } from "@/lib/content";

const BASE     = (process.env.NEXT_PUBLIC_SITE_URL  ?? "https://lushmotel.com.br").replace(/\/$/, "");
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Em produção cada deploy tem um basePath correspondendo a uma única LP
  // (ex.: /pt-BR/diadosnamorados2026). O sitemap lista apenas essa URL pública.
  if (BASE_PATH) {
    return [{
      url: `${BASE}${BASE_PATH}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }];
  }

  // Em dev / staging (sem basePath), lista todas as campanhas dos JSONs.
  const campaigns = await getAllCampaigns();
  return campaigns.map(({ brand, campaign }) => ({
    url: `${BASE}/${brand}/${campaign}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));
}
