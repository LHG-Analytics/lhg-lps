import type { CSSProperties } from "react";

// Google Fonts axis/weight params for each supported font
const FONT_PARAMS: Record<string, string> = {
  "Fraunces":            "ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400",
  "Cormorant Garamond":  "ital,wght@0,300;0,400;0,500;1,300;1,400;1,500",
  "Playfair Display":    "ital,wght@0,400;0,500;1,400",
  "DM Serif Display":    "ital@0;1",
  "Bodoni Moda":         "ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400",
  "Cinzel":              "wght@400;500",
  "Libre Baskerville":   "ital,wght@0,400;1,400",
  "Spectral":            "ital,wght@0,300;0,400;1,300",
  "Cardo":               "ital,wght@0,400;1,400",
  "Inter":               "wght@300;400;500;600",
  "Plus Jakarta Sans":   "wght@300;400;500;600",
  "DM Sans":             "wght@300;400;500",
  "Outfit":              "wght@300;400;500",
  "Raleway":             "wght@300;400;500",
  "Nunito":              "wght@300;400;500",
  "Lato":                "ital,wght@0,300;0,400;0,700;1,400",
  "Source Sans 3":       "wght@300;400;600",
};

const SERIF_FONTS = new Set([
  "Fraunces", "Cormorant Garamond", "Playfair Display", "DM Serif Display",
  "Bodoni Moda", "Cinzel", "Libre Baskerville", "Spectral", "Cardo",
]);

function fallback(name: string): string {
  return SERIF_FONTS.has(name)
    ? "'Times New Roman', serif"
    : "system-ui, -apple-system, sans-serif";
}

function detectFormat(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  const map: Record<string, string> = {
    woff2: "woff2", woff: "woff",
    ttf: "truetype", otf: "opentype",
  };
  return map[ext] ?? "woff2";
}

// Weight map — check order matters (more-specific first)
const WEIGHT_MAP: [string, number][] = [
  ["extralight", 200], ["ultralight", 200],
  ["extrabold",  800], ["ultrabold",  800],
  ["semibold",   600], ["demibold",   600],
  ["black",      900], ["heavy",      900], ["ultra", 900],
  ["thin",       100],
  ["light",      300],
  ["medium",     500],
  ["bold",       700],
  ["regular",    400], ["normal", 400], ["roman", 400],
];

/**
 * Parses font file name to extract weight and style.
 * Works with naming conventions like:
 *   MatriaExtended-Regular.otf → { weight: 400, style: "normal" }
 *   MatriaExtended-ThinItalic.otf → { weight: 100, style: "italic" }
 *   MatriaCondensed-SemiBoldItalic.otf → { weight: 600, style: "italic" }
 */
export function parseFontFilename(filename: string): { weight: number; style: "normal" | "italic" } {
  // Remove extension and path prefix
  const base    = filename.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  const parts   = base.split(/[-_]/);
  const variant = (parts[parts.length - 1] ?? "").toLowerCase();

  const isItalic = variant.endsWith("italic");
  const stem     = isItalic ? variant.slice(0, -6) : variant; // strip "italic"

  const match = WEIGHT_MAP.find(([key]) => stem === key || stem.endsWith(key));
  const weight = match ? match[1] : 400;

  return { weight, style: isItalic ? "italic" : "normal" };
}

/** One file in a custom font family */
export interface FontFileEntry {
  url: string;
  weight: number;
  style: "normal" | "italic";
  name?: string; // original filename (for display only)
}

/** Shape stored in Supabase brands.fonts (JSONB) */
export interface BrandFonts {
  // Google Fonts selection
  display?: string;
  body?: string;
  // Custom font family — multi-file (preferred)
  displayCustomName?: string;
  displayFiles?: FontFileEntry[];
  bodyCustomName?: string;
  bodyFiles?: FontFileEntry[];
  // Single-file legacy (still supported)
  displayCustomUrl?: string;
  bodyCustomUrl?: string;
}

/**
 * Builds a Google Fonts CSS2 API URL.
 * Skips slots that have a custom file override.
 */
export function buildGoogleFontsUrl(display?: string, body?: string): string | null {
  const families: string[] = [];
  const seen = new Set<string>();

  function add(name: string) {
    if (!name || seen.has(name)) return;
    seen.add(name);
    const encoded = name.replace(/ /g, "+");
    const params  = FONT_PARAMS[name] ?? "wght@300;400;500";
    families.push(`family=${encoded}:${params}`);
  }

  if (display) add(display);
  if (body)    add(body);

  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/** Generates @font-face CSS for a single custom font file (legacy). */
export function buildFontFaceCSS(name: string, url: string): string {
  const fmt = detectFormat(url);
  return (
    `@font-face{font-family:'${name}';` +
    `src:url('${url}') format('${fmt}');` +
    `font-weight:100 900;font-style:normal italic;font-display:swap;}`
  );
}

/**
 * Generates @font-face CSS for a full font family with multiple files.
 * Each file maps to its own weight/style declaration.
 */
export function buildFontFaceCSSMulti(name: string, files: FontFileEntry[]): string {
  return files
    .sort((a, b) => a.weight - b.weight || a.style.localeCompare(b.style))
    .map(({ url, weight, style }) => {
      const fmt = detectFormat(url);
      return (
        `@font-face{font-family:'${name}';` +
        `src:url('${url}') format('${fmt}');` +
        `font-weight:${weight};font-style:${style};font-display:swap;}`
      );
    })
    .join("");
}

/** Resolves all font data from a BrandFonts record + JSON fallbacks. */
export function resolveFontData(
  cms: BrandFonts | null,
  jsonFallback: { display: string; body: string }
): {
  googleFontsUrl: string | null;
  fontFaceCSS: string | null;
  displayFont: string;
  bodyFont: string;
} {
  const hasDisplayCustom = !!(cms?.displayCustomName &&
    (cms.displayFiles?.length || cms.displayCustomUrl));
  const hasBodyCustom = !!(cms?.bodyCustomName &&
    (cms.bodyFiles?.length || cms.bodyCustomUrl));

  const displayFont = hasDisplayCustom
    ? cms!.displayCustomName!
    : (cms?.display || jsonFallback.display);
  const bodyFont = hasBodyCustom
    ? cms!.bodyCustomName!
    : (cms?.body || jsonFallback.body);

  // Google Fonts URL — only for slots without custom files
  const googleDisplay = hasDisplayCustom ? undefined : (cms?.display || jsonFallback.display);
  const googleBody    = hasBodyCustom    ? undefined : (cms?.body    || jsonFallback.body);
  const googleFontsUrl = buildGoogleFontsUrl(googleDisplay, googleBody);

  // @font-face CSS — multi-file takes precedence over single-file legacy
  const faces: string[] = [];
  if (cms?.displayCustomName) {
    if (cms.displayFiles?.length) {
      faces.push(buildFontFaceCSSMulti(cms.displayCustomName, cms.displayFiles));
    } else if (cms.displayCustomUrl) {
      faces.push(buildFontFaceCSS(cms.displayCustomName, cms.displayCustomUrl));
    }
  }
  if (cms?.bodyCustomName) {
    if (cms.bodyFiles?.length) {
      faces.push(buildFontFaceCSSMulti(cms.bodyCustomName, cms.bodyFiles));
    } else if (cms.bodyCustomUrl) {
      faces.push(buildFontFaceCSS(cms.bodyCustomName, cms.bodyCustomUrl));
    }
  }
  const fontFaceCSS = faces.length > 0 ? faces.join("") : null;

  return { googleFontsUrl, fontFaceCSS, displayFont, bodyFont };
}

/**
 * Returns CSS custom property overrides for the LP wrapper.
 * Overrides --font-serif + --font-display (headlines) and --font-sans (body).
 */
export function fontVars(display?: string, body?: string): CSSProperties {
  const vars: Record<string, string> = {};
  if (display) {
    const val = `'${display}', ${fallback(display)}`;
    vars["--font-serif"]   = val;
    vars["--font-display"] = val;
  }
  if (body) {
    vars["--font-sans"] = `'${body}', ${fallback(body)}`;
  }
  return vars as CSSProperties;
}
