import type { MetadataRoute } from "next";
import { getAllCampaigns, getCampaign } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaigns = await getAllCampaigns();

  const entries = await Promise.all(
    campaigns.map(async ({ brand, campaign }) => {
      try {
        const data = await getCampaign(brand, campaign);
        const url = data.meta.canonical;
        if (!url) return null;
        return {
          url,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.9,
        };
      } catch {
        return null;
      }
    })
  );

  return entries.filter((e): e is NonNullable<typeof e> => e !== null);
}
