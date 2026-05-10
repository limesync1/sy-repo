/**
 * Service-kategori-ikoner — fælles emoji-mapping brugt på tværs af appen
 * (Aftaler, Ruter, "Opret bestilling for kunde" osv.).
 *
 * Holdes ét sted så ikonerne altid er konsistente.
 */
export const CATEGORY_ICONS: Record<string, string> = {
  "Rengøring": "🧹",
  "Håndværker": "🔨",
  "Flyttehjælp": "🚚",
  "Haveservice": "🌿",
  "Maler": "🎨",
  "VVS": "💧",
  "Elektriker": "⚡",
  "Sikkerhed": "🛡️",
};

export const DEFAULT_CATEGORY_ICON = "🧰";

export const getCategoryIcon = (category?: string | null): string => {
  if (!category) return DEFAULT_CATEGORY_ICON;
  return CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON;
};