import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lushmotel.com.br";

/** Crawlers de IA declarados explicitamente.
 *
 * Todos já seriam permitidos pela regra `*` (são opt-out, não opt-in), mas
 * nomeá-los deixa a intenção auditável e garante que uma futura restrição em
 * `*` não derrube a citabilidade das LPs em ChatGPT / Perplexity / AI Overviews.
 *
 * Bloqueio por campanha é feito via `meta.geo.aiCrawlers` (meta noai) — este
 * arquivo é o controle no nível do site. */
const AI_CRAWLERS = [
  "GPTBot",            // OpenAI — treino
  "OAI-SearchBot",     // OpenAI — ChatGPT Search
  "ChatGPT-User",      // OpenAI — browsing sob demanda
  "ClaudeBot",         // Anthropic — treino
  "Claude-User",       // Anthropic — browsing sob demanda
  "PerplexityBot",     // Perplexity
  "Google-Extended",   // Google — Gemini / AI Overviews
  "Applebot-Extended", // Apple Intelligence
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin/", "/api/", "/auth/"];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
