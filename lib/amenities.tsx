import type { ReactNode } from "react";

/**
 * ICONS / LABELS — extraídos 1:1 do dicionário do HTML de referência.
 *
 * Este módulo é o **único** ponto de tradução `amenity-key → svg + label`.
 * Categorias em `brand.json` referenciam só as keys (`"hidro"`, `"piscina"`,
 * etc.); resolução visual mora aqui.
 *
 * Adicionar amenidade nova = adicionar entrada nas duas tabelas.
 */
export const AMENITY_ICONS: Record<string, ReactNode> = {
  piscina: (
    <>
      <path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5S16 16 18 16s2-1.5 4-1.5" />
      <path d="M6 12V5a2 2 0 014 0v7" />
      <path d="M14 12V5a2 2 0 014 0v7" />
      <path d="M6 8h8" />
    </>
  ),
  cascata: (
    <>
      <path d="M5 3v6" />
      <path d="M9 3v6" />
      <path d="M13 3v6" />
      <path d="M17 3v6" />
      <path d="M3 11c2 0 3 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2" />
      <path d="M3 16c2 0 3 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2" />
    </>
  ),
  hidro: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12c2 0 2-1.5 4-1.5S9 12 11 12s2-1.5 4-1.5S17 12 19 12s2-1.5 2-1.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sauna: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V9a3 3 0 013-3h8a3 3 0 013 3v12" />
      <path d="M9 3c0 1-1 2-1 3s1 2 1 3" />
      <path d="M15 3c0 1-1 2-1 3s1 2 1 3" />
    </>
  ),
  teto: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <path d="M3 12h18" />
      <path d="M9 6v12M15 6v12" />
      <circle cx="6" cy="9" r="0.6" />
      <circle cx="18" cy="15" r="0.6" />
    </>
  ),
  garagem: (
    <>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M7 21v-7h10v7" />
      <path d="M7 14h10" />
    </>
  ),
  "garagem-2": (
    <>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M7 21v-7h10v7" />
      <path d="M7 14h10" />
      <path d="M9 17h2M13 17h2" />
    </>
  ),
  "vaga-patio": (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M9 16V8h3a2.5 2.5 0 010 5H9" />
    </>
  ),
  pista: (
    <>
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8.5 18V6l11-2v11" />
      <circle cx="17" cy="15" r="2.5" />
    </>
  ),
  espresso: (
    <>
      <path d="M5 8h12v6a4 4 0 01-4 4H9a4 4 0 01-4-4V8z" />
      <path d="M17 10h2a2 2 0 010 4h-2" />
      <path d="M9 4v2M12 3v3M15 4v2" />
    </>
  ),
  adega: (
    <>
      <path d="M9 3h6v6c0 2-1.5 3-3 3s-3-1-3-3V3z" />
      <path d="M12 12v9" />
      <path d="M9 21h6" />
      <path d="M9 6h6" />
    </>
  ),
  "tv-3": (
    <>
      <rect x="3" y="5" width="18" height="11" rx="1" />
      <path d="M9 20h6M12 16v4" />
      <path d="M7 9h2M7 12h2M11 9h2M11 12h2M15 9h2M15 12h2" />
    </>
  ),
  claraboia: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 12h16M12 4v16" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  king: (
    <>
      <path d="M3 18V8" />
      <path d="M21 18V8" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
      <rect x="6" y="9" width="5" height="3" rx="1" />
      <rect x="13" y="9" width="5" height="3" rx="1" />
    </>
  ),
  queen: (
    <>
      <path d="M3 18V10" />
      <path d="M21 18V10" />
      <path d="M3 13h18" />
      <path d="M3 18h18" />
      <rect x="7" y="11" width="4" height="2.5" rx="1" />
      <rect x="13" y="11" width="4" height="2.5" rx="1" />
    </>
  ),
  pcd: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M9 9h5l1 5h4" />
      <circle cx="11" cy="17" r="4" />
    </>
  ),
  "rooftop-shower": (
    <>
      <rect x="6" y="3" width="12" height="3" rx="1" />
      <path d="M9 9v3M12 9v4M15 9v3M8 17v3M12 18v3M16 17v3" />
    </>
  ),
  tv: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  // ── Amenidades Lemon ──────────────────────────────────────────────────────
  ofuro: (
    <>
      <path d="M5 19v-4c0-3.314 3.134-6 7-6s7 2.686 7 6v4" />
      <path d="M5 19h14" />
      <path d="M9 9V7a3 3 0 016 0v2" />
    </>
  ),
  heliponto: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 7v10M15 7v10M9 12h6" />
    </>
  ),
  "garagem-4": (
    <>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M7 21v-7h10v7" />
      <path d="M7 14h10" />
      <path d="M8 17.5h1M11 17.5h1M14 17.5h1M17 17.5h1" />
    </>
  ),
  "king-2": (
    <>
      <path d="M2 18V9M22 18V9M2 14h20M2 18h20" />
      <rect x="3" y="10" width="7" height="4" rx="1" />
      <rect x="14" y="10" width="7" height="4" rx="1" />
      <path d="M12 9v9" />
    </>
  ),
  "king-4": (
    <>
      <path d="M1 21V11M23 21V11M1 21h22" />
      <rect x="2" y="12" width="4" height="9" rx="1" />
      <rect x="8" y="12" width="4" height="9" rx="1" />
      <rect x="14" y="12" width="4" height="9" rx="1" />
      <rect x="20" y="12" width="2" height="9" rx="1" />
      <path d="M2 17h4M8 17h4M14 17h4" />
    </>
  ),
  "hidro-8": (
    <>
      <ellipse cx="12" cy="16" rx="9" ry="4" />
      <path d="M3 16v-3c0-2.5 4-4.5 9-4.5s9 2 9 4.5v3" />
      <path d="M6 13c1.5-1.2 3.5-1.8 6-1.8s4.5.6 6 1.8" />
      <path d="M8 11.5c1-.8 2.5-1.2 4-1.2s3 .4 4 1.2" />
    </>
  ),
  // ── Amenidades Altana ─────────────────────────────────────────────────────
  som: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </>
  ),
  frigobar: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <line x1="6" y1="9" x2="18" y2="9" />
      <path d="M11 5v3" />
    </>
  ),
  "ar-central": (
    <>
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <path d="M7 12h10" />
      <path d="M5 7V4M12 7V4M19 7V4" />
    </>
  ),
  "ar-split": (
    <>
      <rect x="2" y="6" width="20" height="8" rx="2" />
      <path d="M7 10h10" />
      <path d="M12 14v3M9 17h6" />
    </>
  ),
  "tv-2": (
    <>
      <rect x="1" y="5" width="10" height="8" rx="1" />
      <path d="M5 17H2M4 13v4" />
      <rect x="13" y="5" width="10" height="8" rx="1" />
      <path d="M22 17h-3M20 13v4" />
    </>
  ),
  "tv-42": (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M8 10H6v2h2M6 14v-4" />
    </>
  ),
  "tv-27": (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M15 10h3l-3 4h3" />
    </>
  ),
  "cadeira-erotica": (
    <>
      <path d="M6 21V12a6 6 0 0112 0v9" />
      <path d="M6 16h12" />
      <path d="M9 21h6" />
      <circle cx="12" cy="5" r="2" />
    </>
  ),
  pole: (
    <>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3" />
      <path d="M10 15c0 1.1.9 2 2 2s2-.9 2-2" />
    </>
  ),
};

export const AMENITY_LABELS: Record<string, string> = {
  piscina: "Piscina",
  cascata: "Cascata",
  hidro: "Hidro",
  sauna: "Sauna",
  teto: "Teto solar",
  garagem: "Garagem",
  "garagem-2": "Garagem 2 carros",
  "vaga-patio": "Vaga pátio",
  pista: "Pista + Pole",
  espresso: "Espresso",
  adega: "Adega",
  "tv-3": "3 Smart TVs",
  claraboia: "Clarabóia",
  king: "King-size",
  queen: "Queen-size",
  pcd: "Opção PCD",
  "rooftop-shower": "Ducha c/ teto solar",
  tv: "Smart TV",
  // ── Amenidades Lemon ──────────────────────────────────────────────────────
  ofuro: "Ofurô",
  heliponto: "Heliponto",
  "garagem-4": "Garagem 4 carros",
  "king-2": "2 Kings",
  "king-4": "4 Kings",
  "hidro-8": "Hidro 8 pessoas",
  // ── Amenidades Altana ─────────────────────────────────────────────────────
  som: "Som ambiente",
  frigobar: "Frigobar",
  "ar-central": "Ar-cond. central",
  "ar-split": "Ar-cond. split",
  "tv-2": "2 Smart TVs",
  "tv-42": "TV 42\"",
  "tv-27": "TV 27\"",
  "cadeira-erotica": "Cadeira erótica",
  pole: "Pole Dance",
};

export function AmenityChip({ keyName }: { keyName: string }) {
  const icon = AMENITY_ICONS[keyName];
  const label = AMENITY_LABELS[keyName];
  if (!icon || !label) return null;
  return (
    <span className="cat__chip">
      <svg viewBox="0 0 24 24">{icon}</svg>
      {label}
    </span>
  );
}
