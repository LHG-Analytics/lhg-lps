import type { MetadataRoute } from "next";
import { getAllCampaigns } from "@/lib/content";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lushmotel.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaigns = await getAllCampaigns();

  return campaigns.map(({ brand, campaign }) => ({
    url: `${BASE}/${brand}/${campaign}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));
}
