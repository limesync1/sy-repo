// Tekststørrelse for hele appen (Normal / Større / Størst). Gemmes lokalt og
// skalerer rem via root font-size, så alle sider vokser ens.
export const TEXT_SIZES = [
  { key: "normal", label: "Normal", pct: 100 },
  { key: "large", label: "Større", pct: 115 },
  { key: "xlarge", label: "Størst", pct: 130 },
] as const;
export type TextSizeKey = (typeof TEXT_SIZES)[number]["key"];
const STORAGE_KEY = "sy-text-size";

export const readTextSize = (): TextSizeKey => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (TEXT_SIZES.some((s) => s.key === v)) return v as TextSizeKey;
  } catch { /* blokeret storage */ }
  return "normal";
};

export const applyTextSize = (key: TextSizeKey) => {
  const pct = TEXT_SIZES.find((s) => s.key === key)?.pct ?? 100;
  document.documentElement.style.fontSize = pct === 100 ? "" : `${pct}%`;
};

export const saveTextSize = (key: TextSizeKey) => {
  try { localStorage.setItem(STORAGE_KEY, key); } catch { /* ignore */ }
  applyTextSize(key);
};
