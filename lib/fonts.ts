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

/** Shape stored in Supabase brands.fonts (JSONB) */
export interface BrandFonts {
  // Google Fonts selection
  display?: string;
  body?: string;
  // Custom font file overrides — when set, take precedence over Google selection
  displayCustomUrl?: string;
  displayCustomName?: string;
  bodyCustomUrl?: string;
  bodyCustomName?: string;
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

/** Generates @font-face CSS for a custom uploaded font file. */
export function buildFontFaceCSS(name: string, url: string): string {
  const fmt = detectFormat(url);
  return (
    `@font-face{font-family:'${name}';` +
    `src:url('${url}') format('${fmt}');` +
    `font-weight:100 900;font-style:normal italic;font-display:swap;}`
  );
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
  const displayFont =
    cms?.displayCustomName || cms?.display || jsonFallback.display;
  const bodyFont =
    cms?.bodyCustomName || cms?.body || jsonFallback.body;

  // Google Fonts URL — only for slots without a custom file
  const googleDisplay = cms?.displayCustomUrl ? undefined : (cms?.display || jsonFallback.display);
  const googleBody    = cms?.bodyCustomUrl    ? undefined : (cms?.body    || jsonFallback.body);
  const googleFontsUrl = buildGoogleFontsUrl(googleDisplay, googleBody);

  // @font-face CSS for custom uploads
  const faces: string[] = [];
  if (cms?.displayCustomUrl && cms.displayCustomName) {
    faces.push(buildFontFaceCSS(cms.displayCustomName, cms.displayCustomUrl));
  }
  if (cms?.bodyCustomUrl && cms.bodyCustomName) {
    faces.push(buildFontFaceCSS(cms.bodyCustomName, cms.bodyCustomUrl));
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
