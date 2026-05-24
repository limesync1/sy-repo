/**
 * Brancheikoner — illustrative SVG-ikoner pr. branche.
 *
 * Bruges på tværs af Services, Aftaler, "Opret bestilling" osv. så vi får et
 * konsistent, genkendeligt branche-ikon i stedet for emoji. Ukendte brancher
 * får et neutralt placeholder-ikon i samme stil indtil et dedikeret ikon
 * uploades.
 */
import cleaning from "@/assets/industry-icons/cleaning.svg";
import windowCleaning from "@/assets/industry-icons/window-cleaning.svg";
import roofAlgae from "@/assets/industry-icons/roof-algae.svg";
import tileCleaning from "@/assets/industry-icons/tile-cleaning.svg";
import facadeCleaning from "@/assets/industry-icons/facade-cleaning.svg";
import solarCleaning from "@/assets/industry-icons/solar-cleaning.svg";
import placeholder from "@/assets/industry-icons/placeholder.svg";

/** Eksplicitte branche-mapninger (key fra service-taxonomy). */
const INDUSTRY_ASSETS: Record<string, string> = {
  "Rengøring": cleaning,
  "Vinduespudsning": windowCleaning,
  "Algebehandling": roofAlgae,
  "Fliserens": tileCleaning,
  "Facaderens": facadeCleaning,
  "Solcellerens": solarCleaning,
};

/**
 * Keyword-baseret fallback: hvis underkategori/serviceens navn ramler
 * tydeligt ind i en kendt branche bruger vi det ikon, så fx
 * "Solcellerens" under "Vinduespudsning" stadig får solcelle-ikonet.
 */
const KEYWORD_FALLBACK: Array<[RegExp, string]> = [
  [/solcelle/i, solarCleaning],
  [/flise|fuge|belægning|granit|natursten|indkørsel/i, tileCleaning],
  [/facade|graffiti|murværk|sand.?blæs|filt/i, facadeCleaning],
  [/tag.?rens|alge|imprægn|tagrend/i, roofAlgae],
  [/vindue|rude|karm|rentvand|pure.?water|ovenlys|glas.?tag|glas.?facade|vinter.?have/i, windowCleaning],
  [/rengøring|rens$/i, cleaning],
];

export const INDUSTRY_PLACEHOLDER_ICON = placeholder;

/**
 * Returnér SVG-asset URL for en branche. Falder tilbage til en neutral
 * placeholder så alle brancher får et illustrativt ikon.
 */
export function getIndustryIconAsset(
  category?: string | null,
  subcategory?: string | null,
): string {
  if (category && INDUSTRY_ASSETS[category]) return INDUSTRY_ASSETS[category];

  const haystack = `${subcategory ?? ""} ${category ?? ""}`.trim();
  if (haystack) {
    for (const [re, asset] of KEYWORD_FALLBACK) {
      if (re.test(haystack)) return asset;
    }
  }
  return placeholder;
}
