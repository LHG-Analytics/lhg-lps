import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  BrandSchema,
  CampaignSchema,
  type Brand,
  type Campaign,
} from "@/lib/schema";

const CONTENT_ROOT = path.join(process.cwd(), "content");

export const getBrand = cache(async (brandId: string): Promise<Brand> => {
  const file = path.join(CONTENT_ROOT, brandId, "brand.json");
  const raw = await fs.readFile(file, "utf-8");
  const json: unknown = JSON.parse(raw);
  return BrandSchema.parse(json);
});

export const getCampaign = cache(
  async (brandId: string, slug: string): Promise<Campaign> => {
    const file = path.join(
      CONTENT_ROOT,
      brandId,
      "campaigns",
      `${slug}.json`
    );
    const raw = await fs.readFile(file, "utf-8");
    const json: unknown = JSON.parse(raw);
    return CampaignSchema.parse(json);
  }
);

export type BrandCampaignParam = { brand: string; campaign: string };

export async function getAllCampaigns(): Promise<BrandCampaignParam[]> {
  const out: BrandCampaignParam[] = [];
  const brandDirs = await safeReadDir(CONTENT_ROOT);
  for (const brand of brandDirs) {
    const campaignsDir = path.join(CONTENT_ROOT, brand, "campaigns");
    const files = await safeReadDir(campaignsDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      out.push({ brand, campaign: file.replace(/\.json$/, "") });
    }
  }
  return out;
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() || e.isFile())
      .map((e) => e.name);
  } catch {
    return [];
  }
}
