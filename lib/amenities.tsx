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
