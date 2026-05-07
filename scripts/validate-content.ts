#!/usr/bin/env tsx
/**
 * Sweep over content/**.json and validate against the Zod schemas.
 * Falha com exit code != 0 se qualquer JSON estiver malformado, listando
 * todos os problemas (não para no primeiro). Roda em CI antes do build.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { BrandSchema, CampaignSchema } from "../lib/schema.js";

const ROOT = join(process.cwd(), "content");

type Problem = { file: string; issues: string[] };

async function main() {
  const problems: Problem[] = [];
  let checked = 0;

  const brands = await safeReadDir(ROOT);
  for (const brand of brands) {
    const brandFile = join(ROOT, brand, "brand.json");
    const result = await validate(brandFile, BrandSchema);
    if (result) {
      problems.push(result);
    }
    checked++;

    const campaignsDir = join(ROOT, brand, "campaigns");
    const files = await safeReadDir(campaignsDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const result = await validate(join(campaignsDir, file), CampaignSchema);
      if (result) {
        problems.push(result);
      }
      checked++;
    }

  }

  if (problems.length === 0) {
    console.log(`✓ ${checked} arquivo(s) JSON válido(s) em content/`);
    process.exit(0);
  }

  console.error(`✗ ${problems.length} arquivo(s) com problemas:\n`);
  for (const p of problems) {
    console.error(`  ${p.file}`);
    for (const issue of p.issues) {
      console.error(`    - ${issue}`);
    }
    console.error("");
  }
  process.exit(1);
}

async function validate<T extends z.ZodTypeAny>(
  file: string,
  schema: T
): Promise<Problem | null> {
  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch (err) {
    return { file, issues: [`Não foi possível ler: ${(err as Error).message}`] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { file, issues: [`JSON inválido: ${(err as Error).message}`] };
  }

  const result = schema.safeParse(parsed);
  if (result.success) return null;

  const issues = result.error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path}: ${i.message}`;
  });
  return { file, issues };
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.map((e) => e.name);
  } catch {
    return [];
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
